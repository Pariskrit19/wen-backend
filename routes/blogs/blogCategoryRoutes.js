const express = require('express');

const blogCategoryController = require('../../controllers/blogs/blogCategoryController');
const authMiddleware = require('../../middlewares/authMiddleware');
const Blog = require('../../models/blogs/blogModel');

const router = express.Router();

router
  .route('/')
  .get(blogCategoryController.getAllBlogCategories)
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo(
      'admin',
      'lead',
      'manager',
      'editor',
      'officeadmin'
    ),
    blogCategoryController.createBlogCategory
  );

router
  .route('/:id')
  .get(blogCategoryController.getBlogCategory)
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'officeadmin'),
    blogCategoryController.updateBlogCategory
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'officeadmin'),
    authMiddleware.checkIfValueToDeleteIsUsed(
      Blog,
      'blogCategories',
      'Blog Categories'
    ),

    blogCategoryController.deleteBlogCategory
  );

module.exports = router;
