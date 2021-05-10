//jshint esversion: 6

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.set("view engine", "ejs");
const _ = require("lodash");

//adding mongoose db
const mongoose = require("mongoose");
//MAKE A COLLECTION FIRST

//we use the below to use remote mongodb atlas cloud
// mongodb+srv://admin-ssm:root124@cluster0.gh2uv.mongodb.net/todolistDB?retryWrites=true&w=majority
// mongodb://localhost:27017/todolistDB
mongoose.connect("mongodb+srv://admin-ssm:root124@cluster0.gh2uv.mongodb.net/todolistDB?retryWrites=true&w=majority", {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useFindAndModify: false
});
//create items schema i.e structre
const itemsSchema = new mongoose.Schema({
  name: String
});
//we create a collection named "items" and bind the it with the new the schema
const Item = mongoose.model("Item", itemsSchema);

//push new datas, i.e create new documents
const item1 = new Item({
  name: "Welcome to todolist!"
});
const item2 = new Item({
  name: "Hit + to add items."
});
const item3 = new Item({
  name: "<-- Hit this to delete the item."
});

const defaultItems = [item1, item2, item3];
//schema for custom list
const listSchema = new mongoose.Schema({
  name: String,

  //the items field contains the items (with itemsSchema)
  items: [itemsSchema]
});
//we create a collection named "lists" and bind the it with the new the  listSchema
const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems) {
    //if there is currently no items in databse, push the default items
    //we are not logging errors (i.e assuming there aren't any)
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        console.log("Inserted");
        //after adding items, we redirect to page, to run the code again, and now the if block won't be executed,
        //as all the items have already been added.
        res.redirect("/");
      });
    }
    res.render("list", {listTitle: "Today", newListItems: foundItems});
  });

});

// catching the post request by the client, i.e saving the new item name in the database
app.post("/", function(req, res) {
  const listName = req.body.list;
  const itemName = req.body.nextItem;
  const item = new Item({
    name: itemName
  });

  //if list name is today, we apply default behaviour
  if(listName === "Today"){
    item.save();
    res.redirect("/");
  }
  else{ //the item has come from a custom list, so we need to search and update the database there
    List.findOne({name: listName}, function(err, resultList){
      resultList.items.push(item);
      //https://stackoverflow.com/questions/33049707/push-items-into-mongo-array-via-mongoose
      //it's confusing how you can push directly, but this is the way to go.
      resultList.save();
      res.redirect("/" + listName);
    });


    // yay! we can also use this to update array element in mongoose
    //$operator-name is mongoose operator
      // List.findOneAndUpdate(
      //     {name: listName},
      //     {$push: {items: {name: itemName}}},
      //     function(err, results){
      //       // console.log(results);
      //     });
      // res.redirect("/" + listName);
    }


  //after saving item to database, redirect to the home route, to show up the item,
  //or else the page will be loading for ever!
});

app.post("/delete", function(req, res) {
  //get the item id and remove it from database
  const checkedItemId = req.body.checkBoxItem;
  //check the list title (using hiiden input)
  const listName = req.body.listName;

  //check if we are on the default list else we are on the custom list
  //so, delete and redirect to same list page
  if(listName == "Today"){
    Item.findByIdAndRemove(checkedItemId, function(err, result){
      if(!err){ //if no error
        console.log(result);
        res.redirect("/");
      }
    });
  }
  else{
    //find the list and delete the value
      List.findOneAndUpdate(
        {name: listName},
        {$pull: {items: {_id: checkedItemId}}},
        function(err, results){
          console.log("Deleted");
          res.redirect("/" + listName);
        });
    }

});

//creating dynamic routes (for dynamic todolists)
app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName);
  //check if a document already exists else we create on
  List.findOne({name: customListName}, function(err, results){
    if(results){ //list already exists
      // console.log(results);
      res.render("list", {listTitle: customListName, newListItems: results.items});
    }
    else{ //else, create
      const list = new List({
        name: customListName,
        //this is the default items
        items: defaultItems
      });
      list.save();

      //then finally go to that list page
      res.redirect("/" + customListName);
    }
  });
  //create a new document for every list

  // res.redirect("/" + customListName);
});


app.get("/about", function(req, res) {
  res.render("about");
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Server is running");
});
