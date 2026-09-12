# Product Requirements Document

## 1. Product Overview
A Shopify App that allows a Shopify merchant sell individual videos and video series on their store easily while reducing the chance of piracy (unauthorized distribution). This app also triggers a mailservice to email transactional reminders to customers to watch their video, or continue watching, using the Mailchimp API.

This plugin relies on the Mailchimp-Shopify integration installed and configured.

## 2. Product Features

### Setting up a Shopify Product with Vimeo URLs
1. The Store Admin navigates to the product page in the Shopify Admin.

2. For a product that has one video, they provide the Vimeo URL in a text field. This is optional.

3. For a product that has multiple videos, they provide multiple Vimeo URLs in a text field. These are ordered in the order they should play.

4. For each video they can enter the number of days after a purchase the video should be displayed in My Videos.  The first video is always available immediately and this cannot be changed.  Any positive integer entered indicates the number of days after purchase the video should be displayed.  A blank field or a zero indicates that the video is always available immediately. 

5. They can enter the number of days a licence is valid for.   If the product has a series of videos, the licence is the same for all videos in the series.  If any video has a number of days to display after purchase greater than or the same as the number of days licenced, the product cannot be saved until this is remedied (ie the licence field is increased, or the videos release schedule is decreased)

6. Optionally they can enter a Mailchimp Customer Journeys API URL in the field named "When finished add customer to this Mailchimp Customer Journey".  This adds the customer to a Mailchimp Automation when they finish watching the last video in the series.  Finish watching is within 30 seconds of the end of the last video of the series.  

### Purchase and Play
1. A customer purchases a video product on the store.  This creates a licence for this customer to view the video.  

2. On the customer checkout page shown in the file `Check - Empower Therapies.html` the Customer presses the `Complete Order` button and the page processes payment, and displays the Confirmation Page shown in the file `Thank you for your purchase! - Empower Therapies.html`.  The user can either press a button named `Show My Videos` or press `Continue Shopping` and the My Videos page will be displayed insted of the Home page as it is now.  Shopify Customer Accounts (https://help.shopify.com/en/manual/customers/customer-accounts)must be turned on so that the customer can be identified when they return.  Guest checkout is disabled.

3. When a customer purchases a video product on the store, the plugin makes an API call to Mailchimp to ensure that customer is not archived in Mailchimp (if they exist yet).  This makes sure Mailchimp emails can be sent.

4. The customer can navigate to the My Videos page on the store from the main menu on the home page and also from a block in the customer accounts header.

5. The My Videos page shows a list of all licenced videos for this customer.

6. The customer can click on a video to view it. The player will automatically resume playback from the last recorded position minus 10 seconds.

7. If a video is missing from Vimeo, it will not be rendered on the My Videos page, and an error will be logged.

8. The My Videos page uses a hardcoded layout and is only available to authenticated Shopify customers.


### Login and Play
1. A customer can login to the store and navigate to the My Videos page from the Main Menu or from the customer accounts header.

2. The My Videos page shows a list of all licenced videos for this customer.

3. The customer can click on a video to view it. The player will automatically resume from the last position minus 10 seconds.

4. My Videos shows 3 products you might like at the bottom of the page. Random products. [Optional]

5. If any in-video offers need to be made, this should be handled by Vimeo.

### Video Storage and Management
1. The videos are stored and managed in a Vimeo account owned by the merchant.

3. Vimeo Security Configuration (Merchant Ownership):
    - Domain-level privacy enabled.
    - Set to "Unlisted" and "Hide from Vimeo".
    - Downloads disabled.
    - Player controls (Share, Watch Later, Watch in Vimeo, Embed code) disabled.
    - *Note: Requires Vimeo Standard Plan.*

### Playback licencing 
1. When a customer purchases a video product on the store, a licence is created for this customer to view the videos in the product.  An expiry date and time is set for the licence.

2. A product with an expired licence remains in the My Videos list but displays with an "Licence Expired" overlay and playback is disabled.

3. If the user purchases a product with a current licence, or a licence that has expired, the new licence is used, but only the newly licenced version will show in My Videos - i.e. a user will never see two of the same video.  

5. If a customer is refunded for a video product in Shopify, their licence is automatically revoked and it does not appear in My Videos.  

6. The licence is unable to be transferred to another customer.

7. In Shopify customers page, there is an interface to show the list of videos a customer has licenced and how far they have watched in hh:mm:ss format.

8. In this admin interface, the admin can extend the licence by any positive integer days.

### Emails as part of a product when purchased
1. To provide additional content in emails to the customer, the admin would set up a Mailchimp Customer Journey with the trigger Buy a Specific Product or Buy Any Product (this requires the Mailchimp-Shopify integration)

### Email reminders to finish (or start) watching before licence expiry
1. To email customers that have not finished watching a video product before licence expiry, the admin would set up a Shopify Flow that queries orders paid in the last month, returns each orders line items + customer metafields, and checks the metafields to see if a product purchased by a customer expires within 48 hours.  For those that do, each video in the product would be checked to see if it has been watched, and if one has not been watched, the flow would send a HTTP Request action is fired with a URL to a Mailchimp Automation with the Customer Journey API trigger to send a reminder email from Mailchimp.  The Flow would be scheduled to run every 48 hours.

### Email offers when a customer finishes watching
1. To provide offers, next steps and incentives once a customer has finished watching the videos in the product, the admin would configure a Mailchimp automation with a Customer Journeys API trigger and paste the triggers URL into the product page in the Shopify Admin.


### Restricting video distribution
1. The video is unable to be downloaded.

### Playback Tracking
1. The app will record the playback position (in hours, minutes and seconds) of the latest position during playback for each product purchased by each customer.  This is recorded when playback ends naturally at the end of the video, or pause is pressed or the webpage is closed causing playback to stop.  If the product has multiple videos, the last position is recorded for each video.

2. This last view point time is what is displayed in the admin interface showing how much of a video in each product a customer has viewed.


## 3. Non-goals and non-features


## 4. Product Deployment

1. This app will only be distributed to one store.  It is a bespoke app, not for general distribution.

## 5. Technical Considerations
1. The app will log errors in Shopify App logs so they can be visible to the admin user.
1. The app will use the Vimeo Player SDK.
1. The app will avoid having a backend where practicable.
1. The app must be engineering to be reliable since it won't have a team monitoring and maintaining it.
