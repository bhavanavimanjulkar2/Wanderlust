const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken:mapToken });


module.exports.index = async (req, res) => {
    const { filter, searchQuery } = req.query; // Extract filter and searchQuery from the query string
    let query = {}; // Initialize an empty query object
  
    // If filter is present, add locationType to query
    if (filter) {
      query.locationType = filter; 
    }
  
    // If searchQuery is present, search by title, description, or location
    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },      // Case-insensitive search in title
        { description: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search in description
        { location: { $regex: searchQuery, $options: 'i' } }     // Case-insensitive search in location
      ];
    }
  
    // Fetch listings based on the query
    const allListings = await Listing.find(query);
  
    // Message for no listings found
    const noListingsMessage = allListings.length === 0 ? "No listings found matching your search criteria." : null;
  
    // Render the listings page and pass the listings, active filter, and message
    res.render("listings/index", { allListings, filter, noListingsMessage });
  };
  


module.exports.renderNewForm =  (req, res) =>{
    res.render("listings/new.ejs");
}

module.exports.showListing = async (req, res) =>{
    let {id} = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");
    if(!listing){
        req.flash("error", "Listing you requested does not exist");
        res.redirect("/listings");
    }
    console.log(listing);
    res.render("listings/show.ejs",{ listing });
};



module.exports.createListing = async (req, res, next) => {
    try {
        let location = req.body.listing.location;

        // Geocode the location
        let response = await geocodingClient
            .forwardGeocode({
                query: location,
                limit: 1
            })
            .send();

        // Handle case where geocoding does not return any results
        if (!response.body.features.length) {
            req.flash("error", "Location could not be found.");
            return res.redirect("/listings/new"); // Redirect to the listing creation page
        }

        let url = req.file.path; // Ensure that req.file is defined
        let filename = req.file.filename; // Ensure that req.file is defined
        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;
        newListing.image = { url, filename };

        // Assign geometry from geocoding response
        newListing.geometry = response.body.features[0].geometry;

        // Save the new listing to the database
        let savedListing = await newListing.save();
        console.log(savedListing);

        req.flash("success", "New Listing Created..!");
        res.redirect("/listings");

    } catch (error) {
        console.error(error); // Log the error to the console

        // Handle different types of errors appropriately
        if (error.name === 'ValidationError') {
            req.flash("error", "There was a validation error. Please check your input.");
        } else {
            req.flash("error", "An error occurred while creating the listing.");
        }

        // Redirect to the creation form or the previous page
        return res.redirect("/listings/new");
    }
};



module.exports.renderEditForm = async (req, res) =>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
        req.flash("error", "Listing you requested does not exist");
        res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload","/upload/,w_250");

    res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) =>{
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});
    
    if(typeof req.file !== "undefined"){
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing Updated.!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) =>{
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted.!");
    res.redirect("/listings");
};
