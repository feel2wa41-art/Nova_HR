const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();
const port = 3000;

app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = 'nova-hr-secret-key';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.auth_user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        name: user.name,
        tenant_id: user.tenant_id,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id,
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// User info endpoint
app.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.auth_user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant_id: user.tenant_id,
    });
  } catch (error) {
    console.error('User info error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// HR Community endpoints
app.get('/hr-community/posts', authenticateToken, async (req, res) => {
  try {
    const { search, post_type, priority, sort_by = 'created_at', order = 'desc' } = req.query;
    
    const where = {
      company_id: req.user.tenant_id,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (post_type) {
      where.post_type = post_type;
    }

    if (priority) {
      where.priority = priority;
    }

    const posts = await prisma.hr_community_post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true,
          }
        }
      },
      orderBy: {
        [sort_by]: order
      }
    });

    const postsWithCounts = posts.map(post => ({
      ...post,
      like_count: post._count.likes,
      comment_count: post._count.comments,
      view_count: post._count.views,
      is_liked: false, // TODO: check if user liked
      _count: undefined
    }));

    res.json({ posts: postsWithCounts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/hr-community/posts', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      content,
      post_type = 'GENERAL',
      priority = 'NORMAL',
      is_pinned = false,
      tags = [],
      target_audience = 'ALL'
    } = req.body;

    const post = await prisma.hr_community_post.create({
      data: {
        title,
        content,
        post_type,
        priority,
        is_pinned,
        tags,
        target_audience,
        allow_comments: true,
        company_id: req.user.tenant_id,
        author_id: req.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/hr-community/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.hr_community_post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true,
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const postWithCounts = {
      ...post,
      like_count: post._count.likes,
      comment_count: post._count.comments,
      view_count: post._count.views,
      is_liked: false, // TODO: check if user liked
      _count: undefined
    };

    res.json(postWithCounts);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Basic notification endpoints
app.get('/hr-community/notifications', authenticateToken, async (req, res) => {
  try {
    res.json({ notifications: [] });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/hr-community/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    res.json({ count: 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Like post
app.post('/hr-community/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if already liked
    const existingLike = await prisma.hr_community_like.findFirst({
      where: {
        post_id: id,
        user_id: req.user.id,
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.hr_community_like.delete({
        where: { id: existingLike.id }
      });
      res.json({ liked: false });
    } else {
      // Like
      await prisma.hr_community_like.create({
        data: {
          post_id: id,
          user_id: req.user.id,
        }
      });
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Record view
app.post('/hr-community/posts/:id/view', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.hr_community_view.create({
      data: {
        post_id: id,
        user_id: req.user.id,
      }
    });

    res.json({ message: 'View recorded' });
  } catch (error) {
    console.error('Record view error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// VAPID key endpoint
app.get('/hr-community/vapid-public-key', authenticateToken, async (req, res) => {
  res.json({
    publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa40HI2BNa40JvIaPzkCVAuCvhW0TIHHfaDQeP_h4SLjYDJ7aewVQnE8iLrjDU'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Nova HR API is running' });
});

app.listen(port, () => {
  console.log(`🚀 Nova HR API server running on http://localhost:${port}`);
  console.log(`📖 API Health check: http://localhost:${port}/health`);
  console.log(`🔐 Use tank.kim@bccard-ap.com / admin123 to login`);
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});