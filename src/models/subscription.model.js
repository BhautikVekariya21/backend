import mongoose,{Schema} from "mongoose";

const SubscriptionSchema = new Schema({
    subscriber:{
        type:Schema.Types.ObjectId, // one who is subscribing to this subscription
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId, // the channel to which this subscription belongs
        ref:"Channel"
    }
},{
    timestamps:true, // automatically adds createdAt and updatedAt fields to the schema
});

export const Subscription = mongoose.model("Subscription",SubscriptionSchema);