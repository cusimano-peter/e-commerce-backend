const pg = require("pg");
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/mushroom_website_db"
);
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT = process.env.JWT || "shhh";

const createTables = async () => {
  const SQL = `
  DROP TABLE IF EXISTS cart_items;
  DROP TABLE IF EXISTS carts;
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS products;
  DROP TABLE IF EXISTS users;

  CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL
  );

  CREATE TABLE products (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    price DECIMAL NOT NULL,
    stock_quantity INT NOT NULL,
    image VARCHAR(255)
  );

  CREATE TABLE carts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE cart_items (
    id UUID PRIMARY KEY,
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    CONSTRAINT unique_cart_product UNIQUE (cart_id, product_id)
  );

  CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;
  await client.query(SQL);
};

const createUser = async ({ username, password }) => {
  const SQL = `
    INSERT INTO users(id, username, password, role) VALUES($1, $2, $3, $4) RETURNING *
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    username,
    await bcrypt.hash(password, 5),
  ]);
  return response.rows[0];
};

const createProduct = async ({ name }) => {
  const SQL = `
    INSERT INTO products(id, name, description, price, stock_quantity, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING * 
  `;
  const response = await client.query(SQL, [uuid.v4(), name]);
  return response.rows[0];
};

const authenticate = async ({ username, password }) => {
  const SQL = `
    SELECT id, password
    FROM users
    WHERE username = $1
  `;
  const response = await client.query(SQL, [username]);
  if (
    !response.rows.length ||
    (await bcrypt.compare(password, response.rows[0].password)) === false
  ) {
    const error = Error("not authorized");
    error.status = 401;
    throw error;
  }
  const token = await jwt.sign({ id: response.rows[0].id }, JWT);
  return { token };
};

const createUser_Cart = async ({ user_id, skill_id }) => {
  const SQL = `
    INSERT INTO user_cart(id, user_id, skill_id) VALUES ($1, $2, $3) RETURNING * 
  `;
  const response = await client.query(SQL, [uuid.v4(), user_id, skill_id]);
  return response.rows[0];
};

const fetchUsers = async () => {
  const SQL = `
    SELECT id, username 
    FROM users
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchProducts = async () => {
  const SQL = `
    SELECT *
    FROM skills
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchUser_cart = async (user_id) => {
  const SQL = `
    SELECT *
    FROM user_skills
    WHERE user_id = $1
  `;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
};

const deleteUser_Cart = async ({ user_id, id }) => {
  const SQL = `
    DELETE
    FROM user_cart
    WHERE user_id = $1 AND id = $2
  `;
  await client.query(SQL, [user_id, id]);
};

const findUserByToken = async (token) => {
  let id;
  try {
    const payload = await jwt.verify(token, JWT);
    id = payload.id;
  } catch (ex) {
    const error = Error("not authorized");
    error.status = 401;
    throw error;
  }
  const SQL = `
    SELECT id, username
    FROM users
    WHERE id = $1
  `;
  const response = await client.query(SQL, [id]);
  if (!response.rows.length) {
    const error = Error("not authorized");
    error.status = 401;
    throw error;
  }
  return response.rows[0];
};

module.exports = {
  client,
  createTables,
  createUser,
  fetchUsers,
  authenticate,
  findUserByToken,
};
