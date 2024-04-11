const {
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
} = require("./db");
const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");

app.get("/", (req, res) =>
  res.send(path.join(__dirname, "../client/index.js"))
);

const isLoggedIn = async (req, res, next) => {
  try {
    console.log(req.headers.authorization);
    req.user = await findUserByToken(req.headers.authorization);
    next();
  } catch (ex) {
    next(ex);
  }
};

app.post("/users/register", async (req, res) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/users/login", async (req, res, next) => {
  try {
    res.send(await authenticate(req.body));
  } catch (ex) {
    next(ex);
  }
});

app.post("/products/create", async (req, res, next) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

app.post("/carts/create", isLoggedIn, async (req, res, next) => {
  try {
    const cart = await createUserCart(req.user.id);
    res.status(201).json(cart);
  } catch (error) {
    next(error);
  }
});

app.get("/auth/me", isLoggedIn, (req, res, next) => {
  try {
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

app.get("/carts", isLoggedIn, async (req, res, next) => {
  try {
    // Using the user's id to fetch their cart
    const cart = await fetchUserCart(req.user.id);
    res.json(cart);
  } catch (error) {
    next(error);
  }
});

app.get("/api/users", async (req, res, next) => {
  try {
    res.send(await fetchUsers());
  } catch (ex) {
    next(ex);
  }
});

app.delete("/carts/:cartId", isLoggedIn, async (req, res, next) => {
  try {
    await deleteUserCart(req.params.cartId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).send({ error: err.message });
});

const seedUsers = async () => {
  const users = [
    { username: "user1", password: "pass1", role: "customer" },
    { username: "user2", password: "pass2", role: "admin" },
  ];
  for (const user of users) {
    await createUser({
      username: user.username,
      password: user.password, // Ensure passwords are hashed in the `createUser` function
      role: user.role,
    });
  }
};

const seedProducts = async () => {
  const products = [
    {
      name: "Laptop",
      description: "High performance laptop",
      price: 999.99,
      stock_quantity: 10,
    },
    {
      name: "Smartphone",
      description: "Latest model smartphone",
      price: 699.99,
      stock_quantity: 30,
    },
  ];
  for (const product of products) {
    await createProduct(product);
  }
};

const seedCarts = async () => {
  const carts = [{ user_id: "UUID of user1" }, { user_id: "UUID of user2" }];
  for (const cart of carts) {
    await createUserCart(cart.user_id);
  }
};

const seedCartItems = async () => {
  const cartItems = [
    { cart_id: "UUID of cart1", product_id: "UUID of product1", quantity: 1 },
    { cart_id: "UUID of cart2", product_id: "UUID of product2", quantity: 2 },
  ];
  for (const item of cartItems) {
    await createCartItem(item.cart_id, item.product_id, item.quantity);
  }
};

const seedOrders = async () => {
  const orders = [
    { user_id: "UUID of user1", status: "Shipped" },
    { user_id: "UUID of user2", status: "Delivered" },
  ];
  for (const order of orders) {
    await createOrder(order.user_id, order.status);
  }
};

const init = async () => {
  const port = process.env.PORT || 3000;
  await client.connect();
  console.log("Connected to the database.");
  // Create Tables
  await createTables();
  console.log("Tables created.");

  // Seed the database
  await seedUsers();
  await seedProducts();
  await seedCarts();
  await seedCartItems();
  await seedOrders();
  console.log("Database seeded.");

  app.listen(port, () => console.log(`Listening on port ${port}`));
};

init();
