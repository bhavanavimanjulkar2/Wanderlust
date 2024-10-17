const Listing = require("./models/listing");
const Review = require("./models/review");
const ExpressError = require("./utils/ExpressError.js");
const wrapAsync = require("./utils/wrapAsync.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const Joi = require('joi');

module.exports.isLoggedIn = (req, res, next) => {
    if(!req.isAuthenticated()){
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to create listing");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if(req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;
    listing = await Listing.findById(id);
    if(!listing.owner.equals(res.locals.currUser._id)){
        req.flash("error", "You don't have access to Edit or delete this listing.");
        return res.redirect(`/listings/${id}`);
    }
    next();
};




module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        price: Joi.number().required().min(0),
        location: Joi.string().required(),
        locationType: Joi.string().valid('arctic', 'farms', 'trending', 'rooms', 'iconic cities', 'castle', 'amazing pool', 'camping', 'beach', 'desert').required(), 
        // Other fields like image, etc.
    }).required()
});


module.exports.validateListing = (req, res, next) =>{
    let {error} = listingSchema.validate(req.body);    
            if(error){
                let errMsg = error.details.map((el) => el.message).join(",");
                throw new ExpressError(400, errMsg);
            } else {
                next();
            }
    };

module.exports.validateReview = (req, res, next) =>{
    let {error} = reviewSchema.validate(req.body);    
            if(error){
                let errMsg = error.details.map((el) => el.message).join(",");
                throw new ExpressError(400, errMsg);
            } else {
                next();
            }
};

module.exports.isReviewAuthor = async (req, res, next) => {
    let { id, reviewId } = req.params;
    review = await Review.findById(reviewId);
    if(!review.author.equals(res.locals.currUser._id)){
        req.flash("error", "You don't have access to delete this Review.");
        return res.redirect(`/listings/${id}`);
    }
    next(); 
};


// Middleware for filtering listings based on locationType (filterListings)
module.exports.filterListings = async (req, res, next) => {
    const { 'listing[locationType]': filter } = req.query;  // Extract filter query parameter from URL
    let query = {};  // Initialize query object

    console.log(query);

    if (filter) {
        query.locationType = filter;  // Apply filter to the query if available
    }

    const listings = await Listing.find(query);  // Fetch filtered listings from DB
    req.listings = listings;  // Store filtered listings in the request object
    next();  // Pass control to the next middleware or route handler
};