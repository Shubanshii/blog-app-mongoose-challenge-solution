const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

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

		it('should return all existing blog posts', () => {
			let res;
			return chai.request(app);
				.get('/posts')
				.then((_res) => {
					res = _res;
					res.should.have.status(200);
					res.body.posts.should.have.length.of.at.least(1);
					return BlogPost.count();
				})
				.then((count) => {
					res.body.posts.should.have.length.of(count);
				});
		});
		it('should return posts with right fields', () => {
			let resPost;
			return chai.request(app);
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
				res.should.have.stats(204);

				return BlogPost.findById(updateData.id);
			})
			.then((restaurant) => {
				post.title.should.equal(updateData.title);
				post.content.should.equal(updateData.content);
				post.author.should.equal(updateData.author);
			});	
		});
		
	});

	describe('DELETE endpoint', () => {
		it('delete a restaurant by id', () => {

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

