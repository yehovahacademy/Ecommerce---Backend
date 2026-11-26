import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/prisma.js";
import { generateToken } from "../utils/generateToken.js";

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

export const googleAdminLogin = async (req, res) => {
    try {

        const {credential} = req.body || {}; 

        if(!credential) {
            return res.status(400).json({
                success:false,
                message:"Google credential is required "
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if(!payload|| !payload.email || !payload.email_verified ){
          
            return res.status(401).json({
                success:false,
                message: "Google Account verification is failed"
            });
        }

        const email = payload.email.toLowerCase();
        const googleId = payload.sub;


        const user = await prisma.user.findUnique({
            where:{email},
        });

        if(!user){
            return res.status(403).json({
                success:false,
                message: "Admin account access is denied"
            });
        }
        

        if(user.role !== "ADMIN"){
            return res.status(403).json({
              success:false,
              message: "Admin access denied"
            });
        }

        if(user.googleId && user.googleId !== googleId) {
            return res.status(403).json({
                success:false,
                message:"Google account does not match"
            });
        } 

        if(!user.googleId){

            await prisma.user.update({
                where: {id :user.id},
                data: {googleId}
            });
        }

        const token = generateToken(user)

        return res.status(200).json({
            success:true,
            message: "Admin login sucessful",
            token,
            user:{
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
        });


    } catch(error){
      console.error("Google admin login error:", error);

      return res.status(500).json({
        success:false,
        message: "Google Authentication failed!!"
      });

    }
};