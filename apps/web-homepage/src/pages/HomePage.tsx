import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  Calendar, 
  FileText, 
  Users, 
  BarChart3, 
  Shield,
  Download,
  ArrowRight,
  CheckCircle,
  Building2,
  Smartphone,
  Monitor
} from 'lucide-react';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: Clock,
      title: 'Smart Attendance Management',
      description: 'Accurate attendance tracking with GPS-based geofence, facial recognition, web/mobile check-in',
    },
    {
      icon: Calendar,
      title: 'Leave Management System',
      description: 'Automatic leave calculation, leave application/approval, real-time remaining leave tracking',
    },
    {
      icon: FileText,
      title: 'Electronic Approval System',
      description: 'Dynamic form generation, multi-level approval, real-time notifications for maximum efficiency',
    },
    {
      icon: Users,
      title: 'Organization Management',
      description: 'Role-based permission management, department organizational chart, user role configuration',
    },
    {
      icon: BarChart3,
      title: 'Real-time Dashboard',
      description: 'View attendance rates, leave status, and approval statistics at a glance',
    },
    {
      icon: Shield,
      title: 'Security & Compliance',
      description: 'Secure information management with data encryption, access control, and audit logs',
    },
  ];

  const platforms = [
    {
      icon: Monitor,
      title: 'Web Portal',
      description: 'Intuitive web interface for both administrators and employees',
    },
    {
      icon: Smartphone,
      title: 'Mobile App',
      description: 'iOS/Android support, check-in anytime, anywhere',
    },
    {
      icon: Download,
      title: 'Desktop Agent',
      description: 'PC monitoring, screenshots, work time tracking (optional)',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Reko HR</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-700 hover:text-primary-600">Features</a>
              <a href="#platforms" className="text-gray-700 hover:text-primary-600">Platforms</a>
              <a href="#pricing" className="text-gray-700 hover:text-primary-600">Pricing</a>
              <a href="#contact" className="text-gray-700 hover:text-primary-600">Contact</a>
            </nav>
            <div className="flex space-x-4">
              <Link 
                to="/register"
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                Individual Sign Up
              </Link>
              <Link 
                to="/company-request"
                className="border border-primary-600 text-primary-600 px-4 py-2 rounded-md hover:bg-primary-50 transition-colors"
              >
                Enterprise Inquiry
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Next-Generation Integrated HR Management System
            <br />
            <span className="text-primary-600">Reko HR</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Efficiently manage all HR tasks from attendance management to electronic approval with one platform. 
            We provide customized solutions for small to large enterprises.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              to="/register"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a 
              href="#demo"
              className="border-2 border-primary-600 text-primary-600 px-8 py-4 rounded-lg hover:bg-primary-50 transition-colors"
            >
              View Demo
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Complete HR Management Solution
            </h2>
            <p className="text-xl text-gray-600">
              All HR management features that modern companies need in one place
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <feature.icon className="h-12 w-12 text-primary-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section id="platforms" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Accessible on All Platforms
            </h2>
            <p className="text-xl text-gray-600">
              Web, mobile, desktop - use Reko HR in any environment
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {platforms.map((platform, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <platform.icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {platform.title}
                </h3>
                <p className="text-gray-600">
                  {platform.description}
                </p>
              </div>
            ))}
          </div>
          
          {/* Desktop Agent Download Section */}
          <div className="mt-16 bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">Reko HR Desktop Agent</h3>
            <p className="text-lg mb-6 opacity-90">
              Optional tool for work time monitoring and productivity analysis
            </p>
            <div className="flex justify-center space-x-4">
              <a 
                href="/downloads/nova-hr-agent-setup.exe"
                className="bg-white text-primary-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center"
                download
              >
                <Download className="mr-2 h-5 w-5" />
                Windows Download
              </a>
              <a 
                href="/downloads/Nova HR Agent.dmg"
                className="border border-white text-white px-6 py-3 rounded-lg hover:bg-white hover:text-primary-600 transition-colors flex items-center"
                download
              >
                <Download className="mr-2 h-5 w-5" />
                macOS Download
              </a>
            </div>
            <p className="text-sm mt-4 opacity-75">
              * Desktop agent is optional and can be installed according to administrator policy.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Transparent and Reasonable Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the optimal plan for your company size
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Basic</h3>
              <div className="text-4xl font-bold text-primary-600 mb-4">
                월 ₩5,000
                <span className="text-lg font-normal text-gray-600">/사용자</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  Basic Attendance Management
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  Leave Application/Approval
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  Simple Electronic Approval
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  Mobile App Support
                </li>
              </ul>
              <Link 
                to="/company-request?plan=basic"
                className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg text-center block hover:bg-gray-200 transition-colors"
              >
                Get Started
              </Link>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md border-2 border-primary-600 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm">Popular</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Professional</h3>
              <div className="text-4xl font-bold text-primary-600 mb-4">
                월 ₩10,000
                <span className="text-lg font-normal text-gray-600">/사용자</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  All Basic Features
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  Advanced Electronic Approval
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  Organization Management Features
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  Real-time Dashboard
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  Desktop Agent
                </li>
              </ul>
              <Link 
                to="/company-request?plan=professional"
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg text-center block hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Enterprise</h3>
              <div className="text-4xl font-bold text-primary-600 mb-4">
                Contact
                <span className="text-lg font-normal text-gray-600">Required</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  All Professional Features
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  Customization
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  API Integration Support
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  Dedicated Technical Support
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  On-premise Installation
                </li>
              </ul>
              <a 
                href="#contact"
                className="w-full border border-primary-600 text-primary-600 py-3 px-4 rounded-lg text-center block hover:bg-primary-50 transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            Get Started Today
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            If you want to revolutionize your HR operations with Reko HR, please contact us anytime. 
            Our expert consultants will propose customized solutions for you.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              to="/company-request"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
            >
              Enterprise Inquiry
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a 
              href="mailto:contact@nova-hr.com"
              className="border-2 border-primary-600 text-primary-600 px-8 py-4 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Email Inquiry
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building2 className="h-8 w-8 text-primary-400" />
                <span className="ml-2 text-2xl font-bold">Reko HR</span>
              </div>
              <p className="text-gray-400">
                Maximize your company's efficiency with the next-generation integrated HR management system.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#platforms" className="hover:text-white">Platforms</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">API Documentation</a></li>
                <li><a href="#contact" className="hover:text-white">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Reko HR. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;