const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const services = [
  { name: 'API Server', url: 'http://localhost:3000/health', type: 'api' },
  { name: 'Customer Portal', url: 'http://localhost:3001', type: 'web' },
  { name: 'Homepage', url: 'http://localhost:3004', type: 'web' },
  { name: 'Provider Admin', url: 'http://localhost:3003', type: 'web' },
  { name: 'PostgreSQL', cmd: 'docker ps --filter name=nova-hr-postgres --format "{{.Status}}"', type: 'docker' },
  { name: 'Redis', cmd: 'docker ps --filter name=nova-hr-redis --format "{{.Status}}"', type: 'docker' },
  { name: 'MinIO', url: 'http://localhost:9001', type: 'web' },
  { name: 'MailHog', url: 'http://localhost:8025', type: 'web' },
];

async function checkService(service) {
  if (service.type === 'docker') {
    try {
      const { stdout } = await execPromise(service.cmd);
      return stdout.includes('Up') ? '✅ Running' : '❌ Not running';
    } catch (error) {
      return '❌ Not running';
    }
  } else {
    return new Promise((resolve) => {
      http.get(service.url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve('✅ Running');
        } else {
          resolve(`⚠️ Running (Status: ${res.statusCode})`);
        }
      }).on('error', () => {
        resolve('❌ Not running');
      }).setTimeout(3000);
    });
  }
}

async function checkAllServices() {
  console.log('\n🔍 Nova HR Local Services Status Check\n');
  console.log('=' .repeat(50));
  
  for (const service of services) {
    const status = await checkService(service);
    console.log(`${service.name.padEnd(20)} ${status}`);
  }
  
  console.log('=' .repeat(50));
  console.log('\n📝 Service URLs:');
  console.log('   API:              http://localhost:3000');
  console.log('   Customer Portal:  http://localhost:3001');
  console.log('   Homepage:         http://localhost:3004');
  console.log('   Provider Admin:   http://localhost:3003');
  console.log('\n📝 Development Tools:');
  console.log('   pgAdmin:         http://localhost:5050');
  console.log('   MinIO Console:   http://localhost:9001');
  console.log('   MailHog:         http://localhost:8025');
  console.log('\n');
}

checkAllServices();