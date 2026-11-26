import {prisma} from "../config/prisma.js";

export const createAddress = async(req,res) => {

    try {

        const userId =  req.user.id;

        const {
    fullName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    isDefault
} = req.body;

        if(!fullName|| typeof fullName !== "string" || !fullName.trim()){

            return res.status(400).json({
                success:false,
                message: "Full name is required"
            });
        }

        if(typeof phone !== "string" || !phone.trim()){
           
            return res.status(400).json({
                success:false,
                message: "Phone is required"
            });
        }

        if(!addressLine1 || typeof addressLine1 !== "string" || !addressLine1.trim()){

            return res.status(400).json({
                success:false,
                message: "Address line 1 is required"
            });
        }

        if(typeof city !== "string" || !city.trim()){

            return res.status(400).json({
                success:false,
                message: "City is required"
            });
        }

        if(!state || typeof state !== "string" || !state.trim()){
           

            return res.status(400).json({
                success:false,
                message: "State is required"
            });
        }

        if(!postalCode || !Number.isInteger(Number(postalCode)) || Number(postalCode) <= 0){
            
            return res.status(400).json({
                success:false,
                message:"Postal code must be a positive number"
            });
        }

        if(!country || typeof country !== "string" || !country.trim()){

            return res.status(400).json({
                success:false,
                message: "Country is required"
            });

        }

        if(isDefault !== undefined && typeof isDefault !== "boolean"){

            return res.status(400).json({
                success:false,
                message: "isDefault must be true or false"
            });
        }


        const createData = {

                fullName: fullName.trim(),
                phone: phone.trim(),
                addressLine1: addressLine1.trim(),
                addressLine2: addressLine2?.trim() || null,
                city: city.trim(),
                state: state.trim(),
                postalCode: String(postalCode).trim(),
                country: country.trim(),
                isDefault: isDefault === true,
                userId: userId
        };

        // Only one default address per user: clear the others first
        const address = isDefault === true
            ? (await prisma.$transaction([
                prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
                prisma.address.create({ data: createData })
            ]))[1]
            : await prisma.address.create({ data: createData });


        return res.status(201).json({
            success:true,
            message: "The Address is created successfully ",
            address
        });

    } catch (error){
        console.error("Address Error:", error)

        return res.status(500).json({
            success:false,
            message: "Internal Server Error"
        });
    }
}


//GET all Addresses

export const getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;

        const addresses = await prisma.address.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            success: true,
            count: addresses.length,
            addresses
        });

    } catch (error) {
        console.error("Get Addresses Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

//UPDATE THE ADDRESSES

export const updateAddress = async(req,res) => {

    try {

        const addressId = req.params.addressId;

        if(!addressId){

            return res.status(404).json({
                success:false,
                message: "Address Id does not exist"
            });
        }

        const existingAddress = await prisma.address.findFirst({
            where:{
                id: addressId,
                userId: req.user.id
            }
        });

        if(!existingAddress){

            return res.status(404).json({
                success: false,
                message: "Address not found"
            })
        }

        const { fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;

        if(isDefault !== undefined && typeof isDefault !== "boolean"){

            return res.status(400).json({
                success:false,
                message: "isDefault must be true or false"
            });
        }

        const updateQuery = prisma.address.update({
            where:{
                id: addressId
            },
            data: {
                ...(fullName !== undefined && { fullName }),
                ...(phone !== undefined && { phone }),
                ...(addressLine1 !== undefined && { addressLine1 }),
                ...(addressLine2 !== undefined && { addressLine2 }),
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
                ...(postalCode !== undefined && { postalCode: String(postalCode).trim() }),
                ...(country !== undefined && { country }),
                ...(isDefault !== undefined && { isDefault })
            }
        });

        // Only one default address per user: clear the others first
        const address = isDefault === true
            ? (await prisma.$transaction([
                prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } }),
                updateQuery
            ]))[1]
            : await updateQuery;

        return res.status(200).json({
            success:true,
            message: "Address updated successfully",
            address
        })



    } catch(error){
      console.error("Update Address Error:",error)

      return res.status(500).json({
        success:false,
        message: "Internal Server Error"
      });

    }
};

//DELETE THE ADDRESS

export const deleteAddress = async(req,res) => {
    try {


        const addressId = req.params.addressId;
        const userId = req.user.id;

        const address = await prisma.address.findFirst({
            where:{
               id: addressId,
               userId
            }
        })

        if(!address){
            return res.status(404).json({
                success:false,
                message:"Address not found"
            });
        }

        const delAddress = await prisma.address.delete({
            where:{
                id: addressId
            }
        });

        return res.status(200).json({
            success:true,
            message:"The address has been deleted successfully",
            delAddress
        });


    } catch(error){
        console.error("Delete Address Error:", error)

        return res.status(500).json({
            success:false,
            message: "Internal Server Error"
        });
    }
}