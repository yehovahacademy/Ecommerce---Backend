import "dotenv/config";
import app from "./app.js";
import {prisma} from "./config/prisma.js";

const PORT = process.env.PORT || 5000;

async function startServer(){
    try {
        await prisma.$connect();
        console.log("PostgreSQL connected successfully");

        app.listen(PORT, () => {
           console.log(`Server is running on port${PORT}`);
        });

    }catch(error){
        console.error("Server startup failed:,error")
        process.exit(1);
    }
}

startServer();