import _ from 'underscore';
import $ from 'jquery';
import is from 'is_js';
import sanitizeHtml from 'sanitize-html';
import baseVw from '../baseVw';
import loadTemplate from '../../utils/loadTemplate';
import app from '../../app';
import { openSimpleMessage } from '../modals/SimpleMessage';
import Dialog from '../modals/Dialog';
import Results from './Results';
import ResultsCol from '../../collections/Results';
import { selectEmojis } from '../../utils';
import { getCurrentConnection } from '../../utils/serverConnect';
import { getMaxReputationAndPrice }  from '../../utils/SearchEngineRequests';
import { getListings }  from '../../utils/SearchEngineRequests';
import { getTagCloud }  from '../../utils/SearchEngineRequests';

export default class extends baseVw {
  constructor(options = {}) {
    const opts = {
      initialState: {
        fetching: false,
        ...options.initialState,
      },
      ...options,
    };

    super(opts);
    this.options = opts;
    this.initialPriceMax = 0;
    this.initialReputationMax = 0;
    this.priceMin = 0;
    this.reputationMin = 0;
    this.pageSize = 18;
    this.pageNumber = 0;
    this.sort = 'reputation';
    this.order = 'desc';
    this.isScrollCallLoading = false;
    this.lastAppliedFiltersData = {
        priceMin: this.priceMin,
        priceMax: this.priceMax,
        reputationMin: this.reputationMin,
        reputationMax: this.reputationMax
    }
    this.isSortOrderChanged = false;
    this.isSearchTermChangedFlag = false;
    this.areFiltersChangedFlag = false;
    this.areFiltersAppliedFlag = false;
    this.searchTerm = '';
    this.word = 0;
    this.render();
    this.getMaxReputationAndPrice = getMaxReputationAndPrice;
    this.getListings = getListings;
    this.getTagCloud = getTagCloud;
    this.getMaxReputationAndPrice().then(data=>{
        this.tagInfoProcessing();
        if(typeof data === 'undefined' || typeof data === 'null'){
            return;
        }

        if(typeof data.priceMax !== 'undefined' && data.priceMax > 0){
            this.createPriceSliderFromData(data);
            this.initialPriceMax = data.priceMax;
            this.priceMax = data.priceMax;
        }
        if(typeof data.reputationMax !== 'undefined' && data.reputationMax > 0){
            this.createReputationSliderFromData(data);
            this.initialReputationMax = data.reputationMax;
            this.reputationMax = data.reputationMax;
        }
        this.submitDataAndGetListings(true);
    }).fail(error=>{
        console.log(error);
        this.tagInfoProcessing();
        this.submitDataAndGetListings(true);
    });
  }

  tagInfoProcessing() {
    this.getTagCloud().then((data) => {
      if(typeof data === 'undefined' || data === null) {
        return;
      }
      if(data.length !== 0) {
        this.$('.tagcloudBox').removeClass('hide');
        this.words = data;
        this.words.forEach((word) => {
          word.html = {
            'title': word.text
          };
          word.handlers = {
            click: () => {
              this.searchTerm = `#${word.text}`;
              this.isSearchTermChangedFlag = this.isSearchTermChanged();
              this.$searchInput.val(this.searchTerm);
              this.submitDataAndGetListings();
            },
          };
        });
        $('#tagcloud').jQCloud(this.words, {
            width: 210.5,
            height: 260,
            removeOverflowing: false,
            colors: ['#25b4b0'],
            afterCloudRender: function(){
                $(this).find('span').each(function(){
                    var left = parseInt($(this).css('left'));
                    var width = parseInt($(this).width());
                    if(left < 0){
                        left = 0;
                        $(this).css('left', '0');
                    }

                    if(width >= 205 || left + width > 205){
                        $(this).width(205 - left);
                    }
                });
            }
        });
      }
    }).fail((error) => {
      console.log(error);
    });
  }

   updateSliderFromInput(inputObj, slider, oldValue){
       var newMinValue = '';
       var newMaxValue = '';
     if(inputObj.className.includes('input-with-focus-0')){
         newMinValue = $(inputObj).val();
         newMaxValue = slider.noUiSlider.get()[1];

         if(isNaN(newMinValue) || newMinValue > newMaxValue){
             $(inputObj).val(oldValue);
            return;
         }
     }else{
         newMaxValue = $(inputObj).val();
         newMinValue = slider.noUiSlider.get()[0];

         if(isNaN(newMaxValue) || newMinValue > newMaxValue){
             $(inputObj).val(oldValue);
            return;
         }
     }

      slider.noUiSlider.updateOptions({
          start: [newMinValue, newMaxValue]
      });
  }

  createPriceSliderFromData(data) {
      var oldMinPriceValue = '';
      var oldMaxPriceValue = '';
      var priceSlider = this.el.getElementsByClassName('price-slider')[0];
      var that = this;
      priceSlider.noUiSlider.updateOptions({
          range: {
              'min': 0,
              'max': data.priceMax
          },
          start: [0, data.priceMax]
      });
      var priceInput0 = this.el.getElementsByClassName('input-with-focus-0-price')[0];
      var priceInput1 = this.el.getElementsByClassName('input-with-focus-1-price')[0];
      var priceInputs = [priceInput0, priceInput1];
       priceSlider.noUiSlider.on('update', function( values, handle ) {
           priceInputs[handle].value = values[handle];
       });
       this.$('.input-with-focus-0-price').on('focusin', function (){
           oldMinPriceValue = $(this).val();
       });
       this.$('.input-with-focus-1-price').on('focusin', function (){
           oldMaxPriceValue = $(this).val();

       });
       this.$('.input-with-focus-0-price').change( function(){
          that.updateSliderFromInput(this, priceSlider, oldMinPriceValue);
       });
       this.$('.input-with-focus-1-price').change( function(){
          that.updateSliderFromInput(this, priceSlider, oldMaxPriceValue);
       });
       $(priceSlider).removeAttr('disabled');
       this.enableSubmitFilterButtons();
       this.enablePriceInputs();
  }

  createReputationSliderFromData(data) {
      var oldMinReputationValue = '';
      var oldMaxReputationValue = '';
      var that = this;
      var reputationSlider = this.el.getElementsByClassName('reputation-slider')[0];
      reputationSlider.noUiSlider.updateOptions({
         range: {
             'min': 0,
             'max': data.reputationMax
         },
          start: [0, data.reputationMax]
      });
      var reputationInput0 = this.el.getElementsByClassName('input-with-focus-0-reputation')[0];
      var reputationInput1 = this.el.getElementsByClassName('input-with-focus-1-reputation')[0];
      var reputationInputs = [reputationInput0, reputationInput1];

      reputationSlider.noUiSlider.on('update', function( values, handle ) {
          reputationInputs[handle].value = values[handle];
      });

       this.$('.input-with-focus-0-reputation').on('focusin', function (){
           oldMinReputationValue = $(this).val();
       });
       this.$('.input-with-focus-1-reputation').on('focusin', function (){
           oldMaxReputationValue = $(this).val();
       });

       this.$('.input-with-focus-0-reputation').change( function(){
          that.updateSliderFromInput(this, reputationSlider, oldMinReputationValue);
       });
       this.$('.input-with-focus-1-reputation').change( function(){
          that.updateSliderFromInput(this, reputationSlider, oldMaxReputationValue);
       });
       $(reputationSlider).removeAttr('disabled');
       this.enableSubmitFilterButtons();
       this.enableReputationInputs();
  }

  enableSubmitFilterButtons(){
      $('.apply-filters').removeAttr('disabled');
      $('.reset-filters').removeAttr('disabled');
  }
  enablePriceInputs(){
      $('.input-with-focus-0-price').removeAttr('disabled');
      $('.input-with-focus-1-price').removeAttr('disabled');
  }
  enableReputationInputs(){
      $('.input-with-focus-0-reputation').removeAttr('disabled');
      $('.input-with-focus-1-reputation').removeAttr('disabled');
  }

  applyTwoListingsMarginFix(){
      //There is a cornercase with listings flexbox(only if there are 2 results)
      if ($('.searchResults .listingCard').length === 2){
          $('.searchResults .listingCard:first-child').css('margin-right', '17px');
      }else{
          $('.searchResults .listingCard:first-child').css('margin-right', '0');
      }
  }

  areFiltersChanged (){
      var changedFiltersFlag = false;
      if(this.priceMin != this.$('.input-with-focus-0-price').val()){
        changedFiltersFlag = true;
      }
      if(this.priceMax != this.$('.input-with-focus-1-price').val()){
        changedFiltersFlag = true;
      }
      if(this.reputationMin != this.$('.input-with-focus-0-reputation').val()){
        changedFiltersFlag = true;
      }
      if(this.reputationMax != this.$('.input-with-focus-1-reputation').val()){
        changedFiltersFlag = true;
      }
      return changedFiltersFlag;
  }

  areFiltersApplied(){
      var appliedFiltersFlag = false;
      if(this.$('.input-with-focus-0-price').val() != 0 && this.lastAppliedFiltersData.priceMin != 0){
        appliedFiltersFlag = true;
      }
      if(this.$('.input-with-focus-1-price').val() != this.initialPriceMax && this.lastAppliedFiltersData.priceMax != this.initialPriceMax){
        appliedFiltersFlag = true;
      }
      if(this.$('.input-with-focus-0-reputation').val() != 0 && this.lastAppliedFiltersData.reputationMin != 0){
        appliedFiltersFlag = true;
      }
      if(this.$('.input-with-focus-1-reputation').val() != this.initialReputationMax && this.lastAppliedFiltersData.reputationMax != this.initialReputationMax){
        appliedFiltersFlag = true;
      }
      return appliedFiltersFlag;
  }

  isSearchTermChanged(){
      if(this.searchTerm !== this.$('.js-searchInput').val()){
          return true;
      }
      return false;
  }

  className() {
    return 'search';
  }

  events() {
    return {
      'click .js-searchBtn': 'clickSearchBtn',
      'keyup .js-searchInput': 'onKeyupSearchInput',
      'change .js-sortBySelect': 'changeSortingOption',
      'click .apply-filters': 'applyFilters',
      'click .reset-filters': 'resetFilters',
    };
  }

    createResults(data, isFromSearchFilter) {
        this.resultsCol = new ResultsCol();
        this.resultsCol.add(this.resultsCol.parse(data, isFromSearchFilter));

        const resultsView = this.createChild(Results, {
          initCol: this.resultsCol,
          isFromSearchFilter: isFromSearchFilter,
        });

        this.$resultsWrapper.append(resultsView.render().el);
        /* This is a workaround - the listings are constructed and served through
            parent element "div.searchResults", it should be removed for the purpose
            of proper visualization. We use "force clone" to get the listings because
            of the custom events attached and their preservation.
        */
        this.$resultsWrapper.append(this.$el.find('.listings-parent--to-be-removed .listingCard').clone(true,true));
        this.$el.find('.listings-parent--to-be-removed').remove();
        /* workaround end */

        this.listenTo(resultsView, 'loadingPage', () => this.scrollToTop());
        this.applyTwoListingsMarginFix();
        var listingsNum = this.$el.find('.listingCard').length;
        this.$el.find('.listings__num').text(listingsNum + ' listings');
        this.isScrollCallLoading = false;
        this.scrollListener();
    }

    applyFilters(){
        this.areFiltersChangedFlag  = this.areFiltersChanged();
        this.updateFilterValues();
        if(this.areFiltersChangedFlag){
            this.$('.fa.fa-filter').remove();
            this.$('.tx5.flexExpand').append('<i class="fa fa-filter" title="Applied filters"></i>');
        }
        this.submitDataAndGetListings();
    }
    updateFilterValues(){
        this.priceMin = this.$('.input-with-focus-0-price').val();
        this.priceMax = this.$('.input-with-focus-1-price').val();
        this.reputationMin = this.$('.input-with-focus-0-reputation').val();
        this.reputationMax = this.$('.input-with-focus-1-reputation').val();
    }
    resetFilterValues(){
        this.priceMin = 0;
        this.priceMax = this.initialPriceMax;
        this.reputationMin = 0;
        this.reputationMax = this.initialReputationMax;

        this.$('.input-with-focus-0-price').val(0);
        this.$('.input-with-focus-0-price').trigger('change');
        this.$('.input-with-focus-1-price').val(this.initialPriceMax);
        this.$('.input-with-focus-1-price').trigger('change');
        this.$('.input-with-focus-0-reputation').val(0);
        this.$('.input-with-focus-0-reputation').trigger('change');
        this.$('.input-with-focus-1-reputation').val(this.initialReputationMax);
        this.$('.input-with-focus-1-reputation').trigger('change');
    }
    resetFilters(){
        this.areFiltersAppliedFlag  = this.areFiltersApplied();
        this.$('.fa.fa-filter').remove();
        this.resetFilterValues();
        this.submitDataAndGetListings();
    }

    submitDataAndGetListings(isInitialFunctionCall){
        if(!this.isSearchTermChangedFlag && !this.areFiltersChangedFlag && !this.isSortOrderChanged && !this.areFiltersAppliedFlag && !isInitialFunctionCall){
            return;
        }
        this.emptyGrid();
        this.showStandardLoader();
        this.lastAppliedFiltersData = {
            priceMin: this.priceMin,
            priceMax: this.priceMax,
            reputationMin: this.reputationMin,
            reputationMax: this.reputationMax
        }
        this.pageNumber = 0;
        var initialListingsData = {
            pageSize: this.pageSize,
            pageNumber: this.pageNumber,
            sort: this.sort,
            order: this.order,
            searchTerm: this.searchTerm,
            priceMin: this.priceMin,
            priceMax: this.priceMax,
            reputationMin: this.reputationMin,
            reputationMax: this.reputationMax
        };
        this.getListings(initialListingsData).then(data=>{
            this.removeLoader();
            if(typeof data !== 'undefined'){
                var listingsNum = this.$el.find('.listingCard').length;
                this.$el.find('.listings__num').text(listingsNum + ' listings');
                if(data.length){
                    this.createResults(data, true)
                }else{
                    this.$el.find('.js-resultsGrid').append('<h4 class="no-results-message">There are no results found.</h4>');
                }
            }
        }).fail(error=>{
            console.log(error);
        });
        this.isSortOrderChanged = false;
        this.isSearchTermChangedFlag = false;
        this.areFiltersChangedFlag = false;
        this.areFiltersAppliedFlag = false;
    }
    showStandardLoader(){
        this.$el.find('.js-resultsGrid').append('<img id="ajaxLoader" src="../js/templates/spinnerAsync.svg">');
    }
    showEndlessScrollLoader(){
        this.$el.find('.js-resultsWrapper').append('<img id="ajaxLoader" class="standard-margin" src="../js/templates/spinnerAsync.svg">');
    }
    removeLoader(){
        this.$el.find('#ajaxLoader').remove();
    }
    changeSortingOption(){
         switch (this.$sortBy.select2("val")) {
             case '0':
                if(this.sort !== 'reputation' || this.order !== 'desc'){
                    this.isSortOrderChanged = true;
                }
                this.sort = 'reputation';
                this.order = 'desc';
            break;
            case '1':
                if(this.sort !== 'reputation' || this.order !== 'asc'){
                    this.isSortOrderChanged = true;
                }
                this.sort = 'reputation';
                this.order = 'asc';
            break;
            case '2':
                if(this.sort !== 'price' || this.order !== 'desc'){
                    this.isSortOrderChanged = true;
                }
                this.sort = 'price';
                this.order = 'desc';
            break;
            case '3':
                if(this.sort !== 'price' || this.order !== 'asc'){
                    this.isSortOrderChanged = true;
                }
                this.sort = 'price';
                this.order = 'asc';
            break;
            default:
                this.sort = 'reputation';
                this.order = 'desc';
         }
         this.submitDataAndGetListings();
    }

    clickSearchBtn() {
        this.isSearchTermChangedFlag = this.isSearchTermChanged();
        this.searchTerm = this.$('.searchInput').val();
        this.submitDataAndGetListings();
    }

    onKeyupSearchInput(e) {
        if (e.which === 13) {
            this.clickSearchBtn();
        }
    }

    emptyGrid(){
      this.$('.js-resultsGrid').empty();
    }

  scrollToTop() {
    this.$el[0].scrollIntoView();
  }

  scrollListener () {
        // Each time the user scrolls
        var that = this;
        $('#contentFrame').off();
        $('#contentFrame').scroll(function(data) {
        	// End of the document reached?
        	if ( ($(this)[0].scrollHeight - $(this).height() == parseInt($(this).scrollTop())) && !that.isScrollCallLoading) {
                that.isScrollCallLoading = true;
                that.showEndlessScrollLoader();
                var listingsData = {
                    pageSize: that.pageSize,
                    pageNumber: ++that.pageNumber,
                    sort: that.sort,
                    order: that.order,
                    searchTerm: that.searchTerm,
                    priceMin: that.priceMin,
                    priceMax: that.priceMax,
                    reputationMin: that.reputationMin,
                    reputationMax: that.reputationMax
                };
                that.getListings(listingsData).then(data=>{
                    that.removeLoader();
                    if(typeof data !== 'undefined'){
                        var listingsNum = that.$el.find('.listingCard').length;
                        that.$el.find('.listings__num').text(listingsNum + ' listings');
                        if(data.length){
                            that.createResults(data, true)
                        }else{
                            $(this).off();
                            that.isScrollCallLoading = false;
                        }
                    }
                }).fail(error=>{
                    console.log(error);
                    that.removeLoader();
                    that.isScrollCallLoading = false;
                });

        	}
        });
    }

  render() {
    super.render();
    const state = this.getState();
    const data = state.data;

    loadTemplate('search/search.html', (t) => {
      this.$el.html(t({
        ...state,
        ...'',
        peerId: app.profile.id
      }));
    });
    this.$sortBy = this.$('.js-sortBySelect');
    this.$sortBy.select2({
      minimumResultsForSearch: -1,
      dropdownParent: this.$('.js-sortBySelectDropdownContainer')
    });
    var reputationSlider = this.el.getElementsByClassName('reputation-slider')[0];
    noUiSlider.create(reputationSlider, {
        start: [0, 0],
        connect: true,
        direction: 'ltr',
        range: {
            'min': [0],
            'max': 0
        },
        format: {
            to: function ( value ) {
                return Math.round(value);
            },
            from: function ( value ) {
                return value;
            }
	    }
    });
    var priceSlider = this.el.getElementsByClassName('price-slider')[0];

    noUiSlider.create(priceSlider, {
        start: [0, 0],
        connect: true,
        direction: 'ltr',
        range: {
            'min': [0],
            'max': 0
        },
        format: {
            to: function ( value ) {
                return Math.round(value);
            },
            from: function ( value ) {
                return value;
            }
	    }
    });
    reputationSlider.setAttribute('disabled', true);
    priceSlider.setAttribute('disabled', true);
    this.$resultsWrapper = this.$('.js-resultsGrid');
    this.$searchInput = this.$('.js-searchInput');

    return this;
  }
}
