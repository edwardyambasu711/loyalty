import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/loyalty-hr';

let isConnected = false;

export async function initializeDatabase(): Promise<void> {
  if (isConnected) {
    console.log('MongoDB already connected');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<typeof mongoose> {
  if (!isConnected) {
    await initializeDatabase();
  }
  return mongoose;
}

// User Schema
export const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  role: { type: String, default: 'candidate' },
  company: { type: String },
  phone: { type: String },
  bio: { type: String },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Job Schema
export const JobSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  userId: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, required: true },
  salary: { type: String, required: true },
  description: { type: String, required: true },
  requirements: { type: String, required: true },
  posted: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Application Schema
export const ApplicationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  jobId: { type: String, required: true },
  userId: { type: String, required: true },
  status: { type: String, default: 'pending' },
  resume: { type: String },
  coverLetter: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Contact Schema
export const ContactSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Organization Schema
export const OrganizationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  logo: { type: String },
  website: { type: String },
  industry: { type: String },
  size: { type: String },
  phone: { type: String },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Blog Schema
export const BlogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  author: { type: String, required: true },
  content: { type: String, required: true },
  excerpt: { type: String },
  image: { type: String },
  tags: { type: String },
  published: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Case Study Schema
export const CaseStudySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  client: { type: String, required: true },
  challenge: { type: String, required: true },
  solution: { type: String, required: true },
  results: { type: String, required: true },
  image: { type: String },
  tags: { type: String },
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Event Schema
export const EventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  eventDate: { type: String, required: true },
  eventTime: { type: String, required: true },
  image: { type: String },
  capacity: { type: Number },
  registered: { type: Number, default: 0 },
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Testimonial Schema
export const TestimonialSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String },
  rating: { type: Number },
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Featured Job Schema
export const FeaturedJobSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  jobId: { type: String, required: true },
  featured: { type: Boolean, default: true },
  featuredUntil: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Create models
export const User = mongoose.model('User', UserSchema);
export const Job = mongoose.model('Job', JobSchema);
export const Application = mongoose.model('Application', ApplicationSchema);
export const Contact = mongoose.model('Contact', ContactSchema);
export const Organization = mongoose.model('Organization', OrganizationSchema);
export const Blog = mongoose.model('Blog', BlogSchema);
export const CaseStudy = mongoose.model('CaseStudy', CaseStudySchema);
export const Event = mongoose.model('Event', EventSchema);
export const Testimonial = mongoose.model('Testimonial', TestimonialSchema);
export const FeaturedJob = mongoose.model('FeaturedJob', FeaturedJobSchema);

