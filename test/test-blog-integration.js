const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

const {DATABASE_URL} = require('../config');
const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

const seedBlogPostData = () => {
	console.info('seeding blog post data');
	const seedData = [];

	for (let i=1; i<=10; i++) {
		seedData.push(generateBlogPostData());
	}
	return BlogPost.insertMany(seedData);
};

const generateAuthor = () => {
	const authors = [
		'Bloney', 'Matt Foney', 'Bland Costan', 'You daMan'];
	return authors[Math.floor(Math.random() * authors.length)];
};

const generateTitle = () => {
	const titles = [
	'The Monkey Crossed the Road', 'I hate Monkeys', 'Money.  Make money'];
	return titles[Math.floor(Math.random() * titles.length)];
};

const generateContent = () => {
	const content = [
	'What?  What happened?  How?', 'Youse bustin a cap real bad', 'Whatcha doing ... maaaaayyyyynnnneee?'];
	return content[Math.floor(Math.random() * content.length)];
};

const generateDate = () => {
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

randomDate(new Date(2012, 0, 1), new Date())
};

const generateBlogPostData = () => {
	return {
		author: generateAuthor(),
		title: generateTitle(),
		content: generateContent(),
		date: generateDate()
	}
};


const tearDownDb = () => {
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}

describe('Blog Posts API resource', () => {
	before(() => {
		return runServer(TEST_DATABASE_URL);
	})

	beforeEach(() => {
		return seedBlogPostData();
	});

	afterEach(() => {
		return tearDownDb();
	});

	describe('GET endpoint', () => {

    it('should return all existing posts', function() {
      // strategy:
      //    1. get back all posts returned by by GET request to `/posts`
      //    2. prove res has right status, data type
      //    3. prove the number of posts we got back is equal to number
      //       in db.
      let res;
      return chai.request(app)
        .get('/posts')
        .then(_res => {
          res = _res;
          res.should.have.status(200);
          // otherwise our db seeding didn't work
          res.body.should.have.length.of.at.least(1);

          return BlogPost.count();
        })
        .then(count => {
          // the number of returned posts should be same
          // as number of posts in DB
          res.body.should.have.length.of(count);
        });
    });
		it('should return posts with right fields', () => {
			let resPost;
			return chai.request(app)
			.get('/posts')
			.then((res) => {
				res.should.have.status(200);
				res.should.be.json;
				res.body.posts.should.be.a('array');
				res.body.posts.should.have.length.of.at.least(1);

				res.body.posts.forEach((post) => {
					post.should.be.a('object');
					post.should.include.keys(
						'id', 'author', 'content', 'title', 'created');
				});
				resPost = res.body.posts[0];
				return BlogPost.findById(resPost.id);
			})
			.then((post) => {
				resPost.id.should.equal(post.id);
				resPost.author.should.equal(post.author);
				resPost.content.should.equal(post.content);
				resPost.title.should.equal(post.title);
				resPost.created.should.equal(post.created);
			});
		});
	});

	describe('POST endpoint', () => {
		it('should add a new post', () => {
			const newBlogPost = generateBlogPostData();
			
			return chai.request(app)
				.post('/posts')
				.send(newBlogPost)
				.then((res) => {
					res.should.have.status(201);
					res.should.be.json;
					res.body.should.be.a('object');
					res.body.should.include.keys(
						'id', 'author', 'content', 'title', 'created');
					res.body.title.should.equal(newBlogPost.title);
					res.body.id.should.not.be.null;
					res.body.author.should.equal(newBlogPost.author);
					res.body.content.should.equal(newBlogPost.content);
					res.body.created.should.equal(newBlogPost.created);


				})
					.then((post) => {
						post.title.should.equal(newBlogPost.title);
						post.author.should.equal(newBlogPost.author);
						post.content.should.equal(newBlogPost.content);
						post.created.should.equal(newBlogPost.created);
					});
		});

	})

	describe('PUT endpoint', () => {

		it('should update fields you send over', () => {
			const updateData = {
			author: "Cack McCacksworth",
			title: "Whata Dada",
			content: "You'se a jokah"
		};

		return BlogPost
			.findOne()
			.then((post) => {
				updateData.id = post.id;
				
				return chai.request(app)
					.put(`/posts/${post.id}`)
					.send(updateData);	
			})
			.then((res) => {
				res.should.have.status(204);

				return BlogPost.findById(updateData.id);
			})
			.then((post) => {
				post.title.should.equal(updateData.title);
				post.content.should.equal(updateData.content);
				post.author.should.equal(updateData.author);
			});	
		});
		
	});

	describe('DELETE endpoint', () => {
		it('delete a post by id', () => {

			let post;

			return BlogPost
				.findOne()
				.then((_post) => {
					post = _post;
					return chai.request(app).delete(`/posts/${post.id}`);
				})
				.then((res) => {
					res.should.have.status(204);
					return BlogPost.findById(post.id);
				})
				.then((_post) => {

					should.not.exist(_post);

				});
		});

	});
});

