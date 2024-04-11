const pg = require("pg");
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/mushroom_website_db"
);
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT = process.env.JWT || "secret";

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
    role VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE products (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    price DECIMAL NOT NULL,
    stock_quantity INT NOT NULL,
    image VARCHAR(255)
  );

  CREATE TABLE cart (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE cart_items (
    id UUID PRIMARY KEY,
    cart_id UUID REFERENCES cart(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    CONSTRAINT unique_cart_product UNIQUE (cart_id, product_id)
  );

  CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(255) NOT NULL
  );
`;
  await client.query(SQL);
};

const createUser = async ({ username, password, role = "user" }) => {
  const SQL = `
    INSERT INTO users(id, username, password, role) VALUES($1, $2, $3, $4) RETURNING *
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    username,
    await bcrypt.hash(password, 5),
    role,
  ]);
  return response.rows[0];
};

const createProduct = async ({
  name,
  description,
  price,
  stock_quantity,
  image,
}) => {
  const SQL = `
    INSERT INTO products(id, name, description, price, stock_quantity, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING * 
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    name,
    description,
    price,
    stock_quantity,
    image,
  ]);
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

const createUserCart = async ({ user_id }) => {
  const SQL = `
    INSERT INTO carts(id, user_id,) VALUES ($1, $2) RETURNING * 
  `;
  const response = await client.query(SQL, [uuid.v4(), user_id]);
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
    FROM products
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchUserCart = async (user_id) => {
  const SQL = `
  SELECT c.id, ci.product_id, ci.quantity
  FROM carts c
  JOIN cart_items ci ON c.id = ci.cart_id
  WHERE c.user_id = $1
  `;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
};

const deleteUserCart = async ({ user_id, cart_id }) => {
  const SQL = `
    DELETE
    FROM carts
    WHERE user_id = $1 AND id = $2
  `;
  await client.query(SQL, [user_id, cart_id]);
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
  createProduct,
  createUserCart,
  fetchUsers,
  fetchProducts,
  fetchUserCart,
  deleteUserCart,
  authenticate,
  findUserByToken,
};
