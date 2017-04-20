(function ($, window, document, undefined) {

  'use strict';

  $(function () {


    $.fn.socialPosts = function( options ) {
        // Establish our default settings
        var settings = $.extend( {
            domNode           : this,
            profile: {
              "screenName": null
            },
            maxTweets         : this.length,
            enableLinks       : true,
            showUser          : true,
            showTime          : true,
            dateFunction      : 'default',
            showRetweet       : true,
            customCallback    : null,
            showInteraction   : true,
            showImages        : true,
            backupImg         : null,
            linksInNewWindow  : true,
            showPermalinks    : true
        }, options );


        function handleTweets(tweets){
          if (customCallbackFunction === null) {
            var x = tweets.length;
            var n = 0;

            $(settings.domNode).each(function (i) {
              // image placement
              if (tweets[i].image == undefined) {
                $(this).find('img').attr("src", settings.backupImg);
              } else {
                $(this).find('img').attr("src", tweets[i].image);
              }
              // copy placement
              $(this).find('p').html(tweets[i].tweet);
            });
          } else {
            customCallbackFunction(tweets);
          }
        }

        var maxTweets = settings.maxTweets;
        var parseLinks = true;
        var queue = [];
        var inProgress = false;
        var printTime = true;
        var printUser = true;
        var formatterFunction = null;
        var showRts = true;
        var customCallbackFunction = null;
        var showInteractionLinks = true;
        var showImages = false;
        var targetBlank = true;
        var lang = 'en';
        var permalinks = true;
        var script = null;
        var scriptAdded = false;

        function strip(data) {
        return data.replace(/<b[^>]*>(.*?)<\/b>/gi, function(a,s){return s;})
            .replace(/class="(?!(tco-hidden|tco-display|tco-ellipsis))+.*?"|data-query-source=".*?"|dir=".*?"|rel=".*?"/gi,
            '');
        }
        function targetLinksToNewWindow(el) {
          var links = el.getElementsByTagName('a');
          for (var i = links.length - 1; i >= 0; i--) {
            links[i].setAttribute('target', '_blank');
          }
        }
        function getElementsByClassName (node, classname) {
          var a = [];
          var regex = new RegExp('(^| )' + classname + '( |$)');
          var elems = node.getElementsByTagName('*');
          for (var i = 0, j = elems.length; i < j; i++) {
              if(regex.test(elems[i].className)){
                a.push(elems[i]);
              }
          }
          return a;
        }
        function extractImageUrl(image_data) {
          if (image_data !== undefined && image_data.innerHTML.indexOf('data-srcset') >= 0) {
            var data_src = image_data.innerHTML
                .match(/data-srcset="([A-z0-9%_\.-]+)/i)[0];
            return decodeURIComponent(data_src).split('"')[1];
          }
        }

        var twitterFetcher = {
          fetch: function(config) {
            if (config.maxTweets === undefined) {
              config.maxTweets = 20;
            }
            if (config.enableLinks === undefined) {
              config.enableLinks = true;
            }
            if (config.showUser === undefined) {
              config.showUser = true;
            }
            if (config.showTime === undefined) {
              config.showTime = true;
            }
            if (config.dateFunction === undefined) {
              config.dateFunction = 'default';
            }
            if (config.showRetweet === undefined) {
              config.showRetweet = true;
            }
            if (config.customCallback === undefined) {
              config.customCallback = null;
            }
            if (config.showInteraction === undefined) {
              config.showInteraction = true;
            }
            if (config.showImages === undefined) {
              config.showImages = true;
            }
            if (config.linksInNewWindow === undefined) {
              config.linksInNewWindow = true;
            }
            if (config.showPermalinks === undefined) {
              config.showPermalinks = true;
            }

            if (inProgress) {
              queue.push(config);
            } else {
              inProgress = true;

              maxTweets = config.maxTweets;
              parseLinks = config.enableLinks;
              printUser = config.showUser;
              printTime = config.showTime;
              showRts = config.showRetweet;
              formatterFunction = config.dateFunction;
              customCallbackFunction = config.customCallback;
              showInteractionLinks = config.showInteraction;
              showImages = config.showImages;
              targetBlank = config.linksInNewWindow;
              permalinks = config.showPermalinks;

              var head = document.getElementsByTagName('head')[0];
              if (script !== null) {
                head.removeChild(script);
              }
              script = document.createElement('script');
              script.type = 'text/javascript';
              script.src = 'https://syndication.twitter.com/timeline/profile?' +
                'callback=twitterFetcher.callback&dnt=false' +
                '&screen_name=' + settings.profile.screenName +
                '&suppress_response_codes=true&lang=' + (config.lang || lang) +
                '&rnd=' + Math.random();
              head.appendChild(script);
            }
          },
          callback: function(data) {
            if (data === undefined || data.body === undefined) {
              inProgress = false;
              if (queue.length > 0) {
                twitterFetcher.fetch(queue[0]);
                queue.splice(0,1);
              }
              return;
            }
            // Remove emoji and summary card images.
            data.body = data.body.replace(/(<img[^c]*class="Emoji[^>]*>)|(<img[^c]*class="u-block[^>]*>)/g, '');
            // Remove display images.
            if (!showImages) {
              data.body = data.body.replace(/(<img[^c]*class="NaturalImage-image[^>]*>|(<img[^c]*class="CroppedImage-image[^>]*>))/g, '');
            }
            // Remove avatar images.
            if (!printUser) {
              data.body = data.body.replace(/(<img[^c]*class="Avatar"[^>]*>)/g, '');
            }

            var div = document.createElement('div');
            div.innerHTML = data.body;

            function swapDataSrc(element) {
              var avatarImg = element.getElementsByTagName('img')[0];
              avatarImg.src = avatarImg.getAttribute('data-src-2x');
              return element;
            }

            var tweets = [];
            var authors = [];
            var times = [];
            var images = [];
            var rts = [];
            var tids = [];
            var permalinksURL = [];
            var x = 0;

            var tmp = getElementsByClassName(div, 'timeline-Tweet');
            while (x < tmp.length) {
              if (getElementsByClassName(tmp[x], 'timeline-Tweet-retweetCredit').length > 0) {
                rts.push(true);
              } else {
                rts.push(false);
              }
              if (!rts[x] || rts[x] && showRts) {
                tweets.push(getElementsByClassName(tmp[x], 'timeline-Tweet-text')[0]);
                tids.push(tmp[x].getAttribute('data-tweet-id'));
                if (printUser) {
                  authors.push(swapDataSrc(getElementsByClassName(tmp[x],'timeline-Tweet-author')[0]));
                }
                times.push(getElementsByClassName(tmp[x], 'dt-updated')[0]);
                permalinksURL.push(getElementsByClassName(tmp[x], 'timeline-Tweet-timestamp')[0]);
                if (getElementsByClassName(tmp[x], 'timeline-Tweet-media')[0] !== undefined) {
                  images.push(getElementsByClassName(tmp[x], 'timeline-Tweet-media')[0]);
                } else {
                  images.push(undefined);
                }
              }
              x++;
            }

            if (tweets.length > maxTweets) {
              tweets.splice(maxTweets, (tweets.length - maxTweets));
              authors.splice(maxTweets, (authors.length - maxTweets));
              times.splice(maxTweets, (times.length - maxTweets));
              rts.splice(maxTweets, (rts.length - maxTweets));
              images.splice(maxTweets, (images.length - maxTweets));
              permalinksURL.splice(maxTweets, (permalinksURL.length - maxTweets));
            }

            var arrayTweets = [];
            var x = tweets.length;
            var n = 0;

            while (n < x) {
              arrayTweets.push({
                tweet: tweets[n].innerHTML,
                author: authors[n] ? authors[n].innerHTML : 'Unknown Author',
                time: times[n].textContent,
                timestamp: times[n].getAttribute('datetime').replace('+0000', 'Z').replace(/([\+\-])(\d\d)(\d\d)/, '$1$2:$3'),
                image: extractImageUrl(images[n]),
                rt: rts[n],
                tid: tids[n],
                permalinkURL: (permalinksURL[n] === undefined) ?
                    '' : permalinksURL[n].href
              });
              n++;
            }

            handleTweets(arrayTweets);
            inProgress = false;

            if (queue.length > 0) {
              twitterFetcher.fetch(queue[0]);
              queue.splice(0,1);
            }
          }
        }; // End of Fetch

        // It must be a global variable because it will be called by JSONP.
        window.twitterFetcher = twitterFetcher;
        // return twitterFetcher;

        var socialSettings = {
            "profile": {"screenName": settings.profile.screenName},
            "maxTweets": settings.maxTweets,
            "enableLinks": settings.enableLinks,
            "showUser": settings.showUser,
            "showTime": settings.showTime,
            "showImages": settings.showImages,
            "dateFunction": settings.dateFunction,
            "showRetweet": settings.showRetweet,
            "customCallback": settings.customCallback,
            "showInteraction": settings.showInteraction,
            "showImages"        : settings.showImages,
            "linksInNewWindow"  : settings.linksInNewWindow,
            "showPermalinks"  : settings.showPermalinks
        };
        twitterFetcher.fetch(socialSettings);
        console.log(socialSettings)
    }





    /* Use that Plugin! */
    // target element must have <img> and <p> elements for placeholders

    $('.item').socialPosts({
      "profile" : {"screenName": 'McDonaldsCorp'},
      'backupImg' : 'images/mcd_fpo.png',   // if tweet doesn't have photo
      'showRetweet' : true
    })


  });

})(jQuery, window, document);
