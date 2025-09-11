const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Reko HR Desktop Agent Build Process');

// Check environment
const apiUrl = process.env.API_URL || 'http://localhost:3000';
const nodeEnv = process.env.NODE_ENV || 'production';

console.log(`📡 API URL: ${apiUrl}`);
console.log(`🏗️  Node Environment: ${nodeEnv}`);

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
    console.log('   ✅ Cleaned dist directory');
  }
  if (fs.existsSync('dist-electron')) {
    fs.rmSync('dist-electron', { recursive: true });
    console.log('   ✅ Cleaned dist-electron directory');
  }
  if (fs.existsSync('release')) {
    fs.rmSync('release', { recursive: true });
    console.log('   ✅ Cleaned release directory');
  }
} catch (error) {
  console.log(`   ⚠️  Warning: Could not clean some directories: ${error.message}`);
}

// Check dependencies
console.log('📦 Checking dependencies...');
try {
  if (!fs.existsSync('node_modules')) {
    console.log('   📥 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }
  console.log('   ✅ Dependencies ready');
} catch (error) {
  console.error('   ❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// TypeScript check (optional - skip on errors)
console.log('🔍 Running TypeScript check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('   ✅ TypeScript check passed');
} catch (error) {
  console.log('   ⚠️  TypeScript check failed, but continuing build...');
  console.log('   💡 Please fix TypeScript errors for better code quality');
}

// Build Vite project
console.log('⚡ Building Vite project...');
try {
  execSync(`cross-env NODE_ENV=${nodeEnv} API_URL=${apiUrl} vite build`, { stdio: 'inherit' });
  console.log('   ✅ Vite build completed');
} catch (error) {
  console.error('   ❌ Vite build failed:', error.message);
  process.exit(1);
}

// Native module rebuild
console.log('🔧 Rebuilding native modules...');
try {
  execSync('npx electron-rebuild --parallel --types=prod,dev,optional --module-dir .', { stdio: 'inherit' });
  console.log('   ✅ Native modules rebuilt');
} catch (error) {
  console.log(`   ⚠️  Warning: Some native modules failed to rebuild: ${error.message}`);
}

// Build Electron app
console.log('📱 Building Electron application...');
const platform = process.argv.includes('--mac') ? '--mac' : 
               process.argv.includes('--linux') ? '--linux' : '--win';
               
try {
  execSync(`npx electron-builder ${platform} --x64`, { stdio: 'inherit' });
  console.log('   ✅ Electron build completed');
} catch (error) {
  console.error('   ❌ Electron build failed:', error.message);
  process.exit(1);
}

// Success message
console.log('');
console.log('🎉 Build completed successfully!');
console.log('📁 Output files are in the "release" directory');

// List output files
if (fs.existsSync('release')) {
  const files = fs.readdirSync('release');
  console.log('📋 Generated files:');
  files.forEach(file => {
    const filePath = path.join('release', file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   📄 ${file} (${size} MB)`);
  });
}