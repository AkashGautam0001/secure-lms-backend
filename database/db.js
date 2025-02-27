import mongoose from "mongoose";

const MAX_RETRIES = 3;
const RETRY_INTERVAL = 5000; // 5 seconds

class DatabaseConnection {
  constructor() {
    this.retryCount = 0;
    this.isConnected = false;

    // configure mongoose settings
    mongoose.set("strictQuery", true);

    mongoose.connection.on("connected", () => {
      console.log("MONGODB CONNECTED SUCCESSFULLY");
      this.isConnected = true;
    });
    mongoose.connection.on("error", () => {
      console.log("MONGODB CONNECTION ERROR");
      this.isConnected = false;
    });
    mongoose.connection.on("disconnected", () => {
      console.log("MONGODB DISCONNECTED");
      this.handleDisconnection();
    });

    process.on("SIGTERM", this.handleAppTermination.bind(this));
  }

  async connect() {
    try {
      if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not defined in env variables");
      }
      const connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // IPv4
      };

      if (process.env.NODE_ENV === "development") {
        mongoose.set("debug", true);
      }

      await mongoose.connect(process.env.MONGO_URI, connectionOptions);
      this.retryCount = 0; // reset retry count on successful connection
    } catch (error) {
      console.error(error.message);
      await this.handleConnectionError();
    }
  }

  async handleConnectionError() {
    if (this.retryCount < MAX_RETRIES) {
      this.retryCount++;
      console.log(
        `Retrying connection attempt #${this.retryCount} after ${
          RETRY_INTERVAL / 1000
        } seconds...`
      );
      await new Promise((resolve) =>
        setTimeout(() => {
          resolve;
        }, RETRY_INTERVAL)
      );
      return this.connect();
    } else {
      console.error(
        `Failed to connect to MONGODB after ${MAX_RETRIES} attempts`
      );
      process.exit(1);
    }
  }

  async handleDisconnection() {
    if (!this.isConnected) {
      console.log("Attempting to reconnected to mongoDb...");
      this.connect();
    }
  }

  async handleAppTermination() {
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    } catch (error) {
      console.error("Error during database disconnection", error);
      process.exit(1);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  }
}

// create a singleton instance
const dbConnection = new DatabaseConnection();

export default dbConnection.connect.bind(dbConnection);

export const getDBStatus = dbConnection.getConnectionStatus.bind(dbConnection);
