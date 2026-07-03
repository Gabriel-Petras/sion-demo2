/*
	Dimension by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	var	$window = $(window),
		$body = $('body'),
		$wrapper = $('#wrapper'),
		$header = $('#header'),
		$footer = $('#footer'),
		$main = $('#main'),
		$main_articles = $main.children('article');

	// Breakpoints.
		breakpoints({
			xlarge:   [ '1281px',  '1680px' ],
			large:    [ '981px',   '1280px' ],
			medium:   [ '737px',   '980px'  ],
			small:    [ '481px',   '736px'  ],
			xsmall:   [ '361px',   '480px'  ],
			xxsmall:  [ null,      '360px'  ]
		});

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Fix: Flexbox min-height bug on IE.
		if (browser.name == 'ie') {

			var flexboxFixTimeoutId;

			$window.on('resize.flexbox-fix', function() {

				clearTimeout(flexboxFixTimeoutId);

				flexboxFixTimeoutId = setTimeout(function() {

					if ($wrapper.prop('scrollHeight') > $window.height())
						$wrapper.css('height', 'auto');
					else
						$wrapper.css('height', '100vh');

				}, 250);

			}).triggerHandler('resize.flexbox-fix');

		}

	// Nav.
		var $nav = $header.children('nav'),
			$nav_li = $nav.find('li');

		// Add "middle" alignment classes if we're dealing with an even number of items.
			if ($nav_li.length % 2 == 0) {

				$nav.addClass('use-middle');
				$nav_li.eq( ($nav_li.length / 2) ).addClass('is-middle');

			}

	// Main.
		var	delay = 325,
			locked = false;

		// Methods.
			$main._show = function(id, initial) {

				var $article = $main_articles.filter('#' + id);

				// No such article? Bail.
					if ($article.length == 0)
						return;

				// Handle lock.

					// Already locked? Speed through "show" steps w/o delays.
						if (locked || (typeof initial != 'undefined' && initial === true)) {

							// Mark as switching.
								$body.addClass('is-switching');

							// Mark as visible.
								$body.addClass('is-article-visible');

							// Deactivate all articles (just in case one's already active).
								$main_articles.removeClass('active');

							// Hide header, footer.
								$header.hide();
								$footer.hide();

							// Show main, article.
								$main.show();
								$article.show();

							// Activate article.
								$article.addClass('active');

							// Unlock.
								locked = false;

							// Unmark as switching.
								setTimeout(function() {
									$body.removeClass('is-switching');
								}, (initial ? 1000 : 0));

							return;

						}

					// Lock.
						locked = true;

				// Article already visible? Just swap articles.
					if ($body.hasClass('is-article-visible')) {

						// Deactivate current article.
							var $currentArticle = $main_articles.filter('.active');

							$currentArticle.removeClass('active');

						// Show article.
							setTimeout(function() {

								// Hide current article.
									$currentArticle.hide();

								// Show article.
									$article.show();

								// Activate article.
									setTimeout(function() {

										$article.addClass('active');

										// Window stuff.
											$window
												.scrollTop(0)
												.triggerHandler('resize.flexbox-fix');

										// Unlock.
											setTimeout(function() {
												locked = false;
											}, delay);

									}, 25);

							}, delay);

					}

				// Otherwise, handle as normal.
					else {

						// Mark as visible.
							$body
								.addClass('is-article-visible');

						// Show article.
							setTimeout(function() {

								// Hide header, footer.
									$header.hide();
									$footer.hide();

								// Show main, article.
									$main.show();
									$article.show();

								// Activate article.
									setTimeout(function() {

										$article.addClass('active');

										// Window stuff.
											$window
												.scrollTop(0)
												.triggerHandler('resize.flexbox-fix');

										// Unlock.
											setTimeout(function() {
												locked = false;
											}, delay);

									}, 25);

							}, delay);

					}

			};

			$main._hide = function(addState) {

				var $article = $main_articles.filter('.active');

				// Article not visible? Bail.
					if (!$body.hasClass('is-article-visible'))
						return;

				// Add state?
					if (typeof addState != 'undefined'
					&&	addState === true)
						history.pushState(null, null, '#');

				// Handle lock.

					// Already locked? Speed through "hide" steps w/o delays.
						if (locked) {

							// Mark as switching.
								$body.addClass('is-switching');

							// Deactivate article.
								$article.removeClass('active');

							// Hide article, main.
								$article.hide();
								$main.hide();

							// Show footer, header.
								$footer.show();
								$header.show();

							// Unmark as visible.
								$body.removeClass('is-article-visible');

							// Unlock.
								locked = false;

							// Unmark as switching.
								$body.removeClass('is-switching');

							// Window stuff.
								$window
									.scrollTop(0)
									.triggerHandler('resize.flexbox-fix');

							return;

						}

					// Lock.
						locked = true;

				// Deactivate article.
					$article.removeClass('active');

				// Hide article.
					setTimeout(function() {

						// Hide article, main.
							$article.hide();
							$main.hide();

						// Show footer, header.
							$footer.show();
							$header.show();

						// Unmark as visible.
							setTimeout(function() {

								$body.removeClass('is-article-visible');

								// Window stuff.
									$window
										.scrollTop(0)
										.triggerHandler('resize.flexbox-fix');

								// Unlock.
									setTimeout(function() {
										locked = false;
									}, delay);

							}, 25);

					}, delay);


			};

		// Articles.
			$main_articles.each(function() {

				var $this = $(this);

				// Close.
					$('<div class="close">Close</div>')
						.appendTo($this)
						.on('click', function() {
							location.hash = '';
						});

				// Prevent clicks from inside article from bubbling.
					$this.on('click', function(event) {
						event.stopPropagation();
					});

			});

		// Events.
			$body.on('click', function(event) {

				// Article visible? Hide.
					if ($body.hasClass('is-article-visible'))
						$main._hide(true);

			});

			$window.on('keyup', function(event) {

				switch (event.keyCode) {

					case 27:

						// Article visible? Hide.
							if ($body.hasClass('is-article-visible'))
								$main._hide(true);

						break;

					default:
						break;

				}

			});

			$window.on('hashchange', function(event) {

				// Empty hash?
					if (location.hash == ''
					||	location.hash == '#') {

						// Prevent default.
							event.preventDefault();
							event.stopPropagation();

						// Hide.
							$main._hide();

					}

				// Otherwise, check for a matching article.
					else if ($main_articles.filter(location.hash).length > 0) {

						// Prevent default.
							event.preventDefault();
							event.stopPropagation();

						// Show article.
							$main._show(location.hash.substr(1));

					}

			});

		// Scroll restoration.
		// This prevents the page from scrolling back to the top on a hashchange.
			if ('scrollRestoration' in history)
				history.scrollRestoration = 'manual';
			else {

				var	oldScrollPos = 0,
					scrollPos = 0,
					$htmlbody = $('html,body');

				$window
					.on('scroll', function() {

						oldScrollPos = scrollPos;
						scrollPos = $htmlbody.scrollTop();

					})
					.on('hashchange', function() {
						$window.scrollTop(oldScrollPos);
					});

			}

		// Initialize.

			// Hide main, articles.
				$main.hide();
				$main_articles.hide();

			// Initial article.
				if (location.hash != ''
				&&	location.hash != '#')
					$window.on('load', function() {
						$main._show(location.hash.substr(1), true);
					});
			// Verse of the day storage and admin UI.
			var verseStorageKey = 'verseOfTheDayDB';
			var defaultVerses = [
				{ date: '2026-01-01', text: 'Jer Bog je tako zavoleo svet, da je svog jedinorođenog Sina dao, da ko god poveruje u njega ne propadne, nego da ima večni život.', reference: 'Jovan 3:16' },
				{ date: '2026-01-02', text: 'Gospod je pastir moj: nijednog mi dobra neće zafaliti.', reference: 'Psalam 23:1' },
				{ date: '2026-01-03', text: 'Sve mogu u onome koji me jača.', reference: 'Filipljanima 4:13' }
			];

			function loadVerseDB() {
				var raw = localStorage.getItem(verseStorageKey);
				if (!raw) {
					localStorage.setItem(verseStorageKey, JSON.stringify(defaultVerses));
					return defaultVerses.slice();
				}
				try {
					var parsed = JSON.parse(raw);
					return Array.isArray(parsed) ? parsed : defaultVerses.slice();
				} catch (e) {
					return defaultVerses.slice();
				}
			}

			function saveVerseDB(db) {
				localStorage.setItem(verseStorageKey, JSON.stringify(db));
			}

			function formatVerseDisplay(entry, fallback) {
				if (!entry) return '<p>Nema stiha danas.</p>';
				return '<p>' + entry.text + '</p><p><strong>' + entry.reference + '</strong>' + (fallback ? ' <em>(random)</em>' : '') + '</p>';
			}

			function getTodayKey() {
				var d = new Date();
				return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
			}

			function findVerseForDate(db, date) {
				return db.filter(function(entry) {
					return entry.date === date;
				})[0] || null;
			}

			function renderVerseDisplay() {
				var db = loadVerseDB();
				var today = getTodayKey();
				var entry = findVerseForDate(db, today);
				var fallback = false;
				if (!entry && db.length > 0) {
					entry = db[Math.floor(Math.random() * db.length)];
					fallback = true;
				}
				$('#verse-display').html(formatVerseDisplay(entry, fallback));
				renderVerseHistory(db, today);
				renderCurrentVerse(entry, fallback);
			}

			function renderCurrentVerse(entry, fallback) {
				if (!entry) {
					$('#verse-current').html('<p>Nema zapisanog stiha.</p>');
					return;
				}
				$('#verse-current').html(formatVerseDisplay(entry, fallback));
			}

			function renderVerseHistory(db, today) {
				var history = db.slice().sort(function(a, b) {
					return a.date < b.date ? 1 : -1;
				});
				var html = history.map(function(entry) {
					return '<div class="verse-history-item"><strong>' + entry.date + '</strong>: ' + entry.text + ' <em>(' + entry.reference + ')</em>' + (entry.date === today ? ' <span style="font-weight:bold;">[danas]</span>' : '') + '</div>';
				}).join('');
				$('#verse-history').html(html);
			}

			$('#verse-admin-form').on('submit', function(event) {
				event.preventDefault();
				var text = $('#verse-text').val().trim();
				var reference = $('#verse-reference').val().trim();
				if (!text || !reference) {
					alert('Unesite tekst stiha i referencu.');
					return;
				}
				var db = loadVerseDB();
				var today = getTodayKey();
				var existing = findVerseForDate(db, today);
				if (existing) {
					existing.text = text;
					existing.reference = reference;
				} else {
					db.push({ date: today, text: text, reference: reference });
				}
				saveVerseDB(db);
				renderVerseDisplay();
				alert('Stih za danas je sačuvan.');
			});

			$('#verse-clear').on('click', function() {
				$('#verse-text').val('');
				$('#verse-reference').val('');
			});
		$('.admin-button').on('click', function(event) {
			event.preventDefault();
			requireAdminAccess(function() {
				window.location.hash = '#admin';
			});
		});

		// Prevent direct admin access without authentication.
		var originalShow = $main._show;
		$main._show = function(id, initial) {
			if (id === 'admin' && !isAdminAuthenticated()) {
				if (!authenticateAdmin()) {
					return;
				}
			}
			originalShow.call(this, id, initial);
		};
			renderVerseDisplay();
})(jQuery);