class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.formattedQuery = queryString;
    this.paginateObject = {
      skip: 0,
      limit: 100
    };
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Delete key/value from object is value is empty in query string
    Object.keys(queryObj).forEach((key) => {
      if (queryObj[key] === '') {
        delete queryObj[key];
      }
    });

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));

    this.formattedQuery = JSON.parse(queryStr);

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.collation({ locale: 'en' }).sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    if (this.queryString.page && this.queryString.limit) {
      const page = this.queryString.page * 1 || 1;
      const limit = this.queryString.limit * 1 || 100;
      const skip = (page - 1) * limit;

      this.query = this.query.skip(skip).limit(limit);

      this.paginateObject = {
        skip,
        limit
      };
    }
    return this;
  }

  search() {
    const searchTerm = this.queryString.search;

    const regx = new RegExp(`${searchTerm}`, 'i');

    const query = searchTerm
      ? {
          name: { $regex: regx },
          title: { $regex: regx }
        }
      : {};
    this.query = this.query.find(query);

    this.formattedQuery = { ...this.formattedQuery, ...query };
    return this;
  }
}

module.exports = APIFeatures;
