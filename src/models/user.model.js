import mongoose,{Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index:true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index:true,
    },
    avatar: {
        type: String,
        required: true,
    },
    coverimage:{
        type: String,
    },
    watchhistory:[
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password:[
        {
            type: String,
            required:[true,"Password is required"]
        }
    ],
    refreshToken:{
            type: String,
    },
    },
    {
        timestamps: true,
    },
     
);

userSchema.pre("save", async function(next) {
    const user = this;
    if (!user.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function() {
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY,
    }
);
};

export default mongoose.model("User", userSchema)   