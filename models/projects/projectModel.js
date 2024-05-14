const mongoose = require('mongoose');
const slugify = require('slugify');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide project name.'],
      unique: true,
      trim: true
    },
    slug: String,
    priority: {
      type: Boolean,
      default: false
    },
    path: String,

    estimateHistory: [
      {
        estimatedHours: Number,
        updatedBy: {
          type: mongoose.Schema.ObjectId,
          ref: 'User'
        },
        updatedAt: { type: Date }
      }
    ],
    startDate: {
      type: Date,
      index: true
    },
    endDate: Date,
    projectTypes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Project_Type'
      }
    ],
    projectStatus: {
      type: mongoose.Schema.ObjectId,
      ref: 'Project_Status',
      required: [true, 'Please provide project status.']
    },
    projectTags: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Project_Tag'
      }
    ],
    client: {
      type: mongoose.Schema.ObjectId,
      ref: 'Client'
    },
    developers: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ],
    designers: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ],
    qa: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ],
    devOps: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ],
    stagingUrls: [String],
    liveUrl: [String],
    notes: String,
    maintenance: [
      {
        enabled: {
          type: Boolean,
          default: false
        },
        selectMonths: [String],
        emailDay: Number,
        sendEmailTo: String
      }
    ],
    totalTimeSpent: {
      type: Number,
      default: 0
    },
    weeklyTimeSpent: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
// Virtual populate
projectSchema.virtual('timeLogs', {
  ref: 'TimeLog',
  foreignField: 'project',
  localField: '_id'
});

// Generate slug from project name before save and create document
projectSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

projectSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'developers designers qa devOps createdBy updatedBy',
    select: '-role -position name email'
  })
    .populate({
      path: 'projectTags client projectTypes projectStatus',
      select: 'name'
    })
    .populate({
      path: 'estimateHistory.updatedBy',
      select: '-position -positionType -role name'
    });
  next();
});

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
