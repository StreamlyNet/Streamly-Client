import $ from 'jquery';
import baseVw from '../baseVw';
import app from '../../app';
import loadTemplate from '../../utils/loadTemplate';
import ListingCard from '../ListingCard';
import UserCard from '../UserCard';
import PageControls from '../components/PageControls';
import ListingCardModel from '../../models/listing/ListingShort';
import ResultsCol from '../../collections/Results';


export default class extends baseVw {
  constructor(options = {}) {
    super(options);
    this.options = options;

    this.isFromSearchFilter = this.options.isFromSearchFilter;

    this.cardViews = [];
    this.pageCollections = {};
    // if an initial collection was passed in, add it
    if (options.initCol) this.pageCollections[0] = (options.initCol);
  }

  className() {
    return 'listings-parent--to-be-removed';
  }

  createCardView(model) {
    // models can be listings or nodes
    if (model instanceof ListingCardModel) {
      var vendor = {
          peerID: model.attributes.profile.peerID
      };
      vendor.avatar = model.attributes.profile.avatarHashes;
      vendor.name = model.attributes.profile.name;
      var price = {
          amount: model.attributes.item.price,
          currencyCode: model.attributes.metadata.pricingCurrency
      };
      var availability = model.attributes.availability;
      const base = vendor.peerID;
      const options = {
        listingBaseUrl: `${base}/store/`,
        model,
        vendor,
        onStore: false,
        ownerGuid: vendor.peerID,
        thumbnail: model.attributes.item.images[0],
        title: model.attributes.item.title,
        price: price,
        reputation: model.attributes.reputation,
        availability: availability,
        isFromDiscoveryView: true,
      };

      return this.createChild(ListingCard, options);
    }

    return this.createChild(UserCard, { model });
  }

  renderCards(models) {
     const resultsFrag = document.createDocumentFragment();

     const noResults = $(`<h2 class='width100 padLg txCtr'>There are no listings to show</h2>`);

    models.forEach(model => {
      const cardVw = this.createCardView(model);

      if (cardVw) {
        this.cardViews.push(cardVw);
        cardVw.render().$el.appendTo(resultsFrag);
      }
    });
    $('.pageContent>.flexRow.gutterHLg>div>.flexCol>.width100>.row.flexVBase.gutterH>.tx5.flexExpand>b').text(models.length + ' listings');
     if (models.length < 1){
         noResults.appendTo(resultsFrag);
     }

     //There is a cornercase with listings flexbox(only if there are 2 results)
    this.$resultsGrid.html(resultsFrag);

    // hide the loading spinner
    this.$el.removeClass('loading');

  }

  loadPage() {
    this.trigger('loadingPage');
    this.renderCards(this.pageCollections[0]);
  }

  remove() {
    if (this.newPageFetch) this.newPageFetch.abort();
    super.remove();
  }


  render() {
    loadTemplate('search/results.html', (t) => {
      this.$el.html(t());

      this.$resultsGrid = this.$el;
      this.$displayText = this.$('.js-displayingText');
      this.cardViews.forEach(vw => vw.remove());
      this.cardViews = [];

      this.loadPage();
    });

    return this;
  }
}
