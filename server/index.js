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

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).send({ error: err.message });
});

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

app.post("users/register", async (req, res) => {
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

const init = async () => {
  const port = process.env.PORT || 3000;
  await client.connect();
  console.log("connected to database");

  await createTables();
  console.log("tables created");
  console.log(await fetchUsers());
  console.log(await fetchProducts());
  app.listen(port, () => console.log(`listening on port ${port}`));
};

init();
