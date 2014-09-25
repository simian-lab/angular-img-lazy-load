'use strict';

angular.module('angular-img-lazy-load', [])
.config(function($provide) {
  $provide.decorator('ngSrcDirective', ['$delegate', function($delegate) {
    $delegate.shift();
    return $delegate;
  }]);
})

.directive('ngSrc', function factory($window, $document) {

  /**
  * Disclaimer! most of this code has been
  * er... "inspired" by Ben Nadel:
  * http://www.bennadel.com/blog/2498-lazy-loading-image-with-angularjs.html
  */

  // I manage all the images that are currently being
  // monitored on the page for lazy loading.
  var lazyLoader = (function() {

    // I maintain a list of images that lazy-loading
    // and have yet to be rendered.
    var images = [];

    // I define the render timer for the lazy loading
    // images to that the DOM-querying (for offsets)
    // is chunked in groups.
    var renderTimer = null;
    var renderDelay = 100;

    // I cache the window element as a jQuery reference.
    var win = angular.element( $window );

    // I cache the document document height so that
    // we can respond to changes in the height due to
    // dynamic content.
    var doc = $document;
    var documentHeight = doc.prop('offsetHeight');
    var documentTimer = null;
    var documentDelay = 2000;

    // I determine if the window dimension events
    // (ie. resize, scroll) are currenlty being
    // monitored for changes.
    var isWatchingWindow = false;


    // ---
    // PUBLIC METHODS.
    // ---


    // I start monitoring the given image for visibility
    // and then render it when necessary.
    function addImage( image ) {
      images.push( image );

      if ( ! renderTimer ) {
        startRenderTimer();
      }

      if ( ! isWatchingWindow ) {
        startWatchingWindow();
      }
    }


    // I remove the given image from the render queue.
    function removeImage( image ) {
      // Remove the given image from the render queue.
      for ( var i = 0 ; i < images.length ; i++ ) {
        if ( images[ i ] === image ) {
          images.splice( i, 1 );
          break;
        }
      }

      // If removing the given image has cleared the
      // render queue, then we can stop monitoring
      // the window and the image queue.
      if ( ! images.length ) {
        clearRenderTimer();
        stopWatchingWindow();
      }
    }


    // ---
    // PRIVATE METHODS.
    // ---


    // I check the document height to see if it's changed.
    function checkDocumentHeight() {
      // If the render time is currently active, then
      // don't bother getting the document height -
      // it won't actually do anything.
      if ( renderTimer ) {
        return;
      }

      var currentDocumentHeight = doc.prop('offsetHeight');

      // If the height has not changed, then ignore -
      // no more images could have come into view.
      if ( currentDocumentHeight === documentHeight ) {
        return;
      }

      // Cache the new document height.
      documentHeight = currentDocumentHeight;
      startRenderTimer();
    }


    // I check the lazy-load images that have yet to
    // be rendered.
    function checkImages() {
      var visible = [];
      var hidden = [];

      // Determine the window dimensions.
      var windowHeight =  (win[0].innerHeight || doc[0].documentElement.clientHeight);
      var windowWidth = (win[0].innerWidth || doc[0].documentElement.clientWidth);

      // Query the DOM for layout and seperate the
      // images into two different categories: those
      // that are now in the viewport and those that
      // still remain hidden.
      for ( var i = 0 ; i < images.length ; i++ ) {
        var image = images[ i ];

        if ( image.isVisible( windowHeight, windowWidth ) ) {
          visible.push( image );
        }
        else {
          hidden.push( image );
        }
      }

      // Update the DOM with new image source values.
      for ( var i = 0 ; i < visible.length ; i++ ) {
        visible[ i ].render();
      }

      // Keep the still-hidden images as the new
      // image queue to be monitored.
      images = hidden;

      // Clear the render timer so that it can be set
      // again in response to window changes.
      clearRenderTimer();

      // If we've rendered all the images, then stop
      // monitoring the window for changes.
      if ( ! images.length ) {
        stopWatchingWindow();
      }
    }


    // I clear the render timer so that we can easily
    // check to see if the timer is running.
    function clearRenderTimer() {
      clearTimeout( renderTimer );
      renderTimer = null;
    }


    // I start the render time, allowing more images to
    // be added to the images queue before the render
    // action is executed.
    function startRenderTimer() {
      renderTimer = setTimeout( checkImages, renderDelay );
    }


    // I start watching the window for changes in dimension.
    function startWatchingWindow() {
      isWatchingWindow = true;

      // Listen for window changes.
      win.on( "resize", windowChanged );
      win.on( "scroll", windowChanged );

      // Set up a timer to watch for document-height changes.
      documentTimer = setInterval( checkDocumentHeight, documentDelay );
    }

    // I stop watching the window for changes in dimension.
    function stopWatchingWindow() {
      isWatchingWindow = false;

      // Stop watching for window changes.
      win.off( "resize" );
      win.off( "scroll" );

      // Stop watching for document changes.
      clearInterval( documentTimer );
    }


    // I start the render time if the window changes.
    function windowChanged() {
      if ( ! renderTimer ) {
        startRenderTimer();
      }
    }


    // Return the public API.
    return({
      addImage: addImage,
      removeImage: removeImage
    });

  })();


  // ------------------------------------------ //
  // ------------------------------------------ //


  // I represent a single lazy-load image.
  function LazyImage( element ) {

    // I am the interpolated LAZY SRC attribute of
    // the image as reported by AngularJS.
    var source = null;

    // I determine if the image has already been
    // rendered (ie, that it has been exposed to the
    // viewport and the source had been loaded).
    var isRendered = false;

    // I am the cached height of the element. We are
    // going to assume that the image doesn't change
    // height over time.
    var height = null;

    // ---
    // PUBLIC METHODS.
    // ---

    // I determine if the element is visible in the viewport
    function isVisible( windowHeight, windowWidth ) {
      var rect = element[0].getBoundingClientRect();

      return (
          rect.bottom >= 0 &&
          rect.right >= 0 &&
          rect.top <= windowHeight &&
          rect.left <= windowWidth
      );
    }

    // I move the cached source into the live source.
    function render() {
      isRendered = true;
      renderSource();
    }


    // I set the interpolated source value reported
    // by the directive / AngularJS.
    function setSource( newSource ) {
      source = newSource;
      if ( isRendered ) {
        renderSource();
      }
    }


    // ---
    // PRIVATE METHODS.
    // ---


    // I load the lazy source value into the actual
    // source value of the image element.
    function renderSource() {
      element[ 0 ].src = source;
    }


    // Return the public API.
    return({
      isVisible: isVisible,
      render: render,
      setSource: setSource
    });

  }

  return {
    restrict: 'A',
    priority: 99,
    link: function($scope, $element, $attrs) {

      var lazyImage = new LazyImage( $element );

      // Start watching the image for changes in its
      // visibility.
      lazyLoader.addImage( lazyImage );

      $attrs.$observe('ngSrc', function( newSource ) {
        lazyImage.setSource( newSource );
      });

      // When the scope is destroyed, we need to remove
      // the image from the render queue.
      $scope.$on( '$destroy', function() {
        lazyLoader.removeImage( lazyImage );
      });
    }
  };
});
