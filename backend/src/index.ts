import dotenv from "dotenv";
import connectDB from "./db/index.js";

import app from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log(error);
      throw error;
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is running at port ${port}`);
    });
  })
  .catch((err) => {
    console.log(`MongoDB Connection failed !!! ${err}`);
  });
