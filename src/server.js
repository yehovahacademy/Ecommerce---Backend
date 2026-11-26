import "dotenv/config";
import app from "./app.js";
import {prisma} from "./config/prisma.js";

const PORT = process.env.PORT || 5000;

async function startServer(){
    try {
        await prisma.$connect();
        console.log("PostgreSQL connected successfully");

        // Express 5 passes listen errors (e.g. port already in use) to this callback
        app.listen(PORT, (error) => {
           if (error) {
               if (error.code === "EADDRINUSE") {
                   console.error(`Port ${PORT} is already in use. Stop the other server or set a different PORT in .env`);
               } else {
                   console.error("Server failed to start:", error);
               }
               process.exit(1);
           }
           console.log(`Server is running on port ${PORT}`);
        });

    }catch(error){
        console.error("Server startup failed:", error);
        process.exit(1);
    }
}

startServer();