// Search field value
var searchText = "";

// Time filter entries
var timeFilterEntries = [];
var timeChartSvg;
var timeChartXScale;
var timeChartYScale;
var timeChartHeight;
var timeChartData;
var YEAR_GAP_THRESHOLD = 5; 
// Current window size (used to ignore redundant resize events)
var windowWidth;
var windowHeight;
// Categories statistics (used for D3 diagram)
var stats = {};
// Statistics entries map (used for indexing)
var statsMap = {};

$(document).ready(function(){
	windowWidth = $(window).width();
	windowHeight = $(window).height();
    updateDisplayedCount();
    onSearchClear();
	setupHandlers();
	setupTooltips();
	loadContent();
	
});

$(window).resize(function() {
    if(this.resizeTO) clearTimeout(this.resizeTO);
   this.resizeTO = setTimeout(function() {
       $(this).trigger('resizeEnd');
    }, 500);
});

$(window).bind('resizeEnd', function(){
	// Check if the resize really occurred
	var newWidth = $(window).width();
	var newHeight = $(window).height();
	
	if (newWidth != windowWidth
		|| newHeight != windowHeight) {
		windowWidth = newWidth;
		windowHeight = newHeight;
	} else {
		// Abort the handler
		return;
	}
		
	// Update the layout size
	updateLayoutSize();
});

// Updates the vertical layout size
function updateLayoutSize() {
	var entriesContainer = $("#entriesContainer");
	
	var maxEntriesContainerHeight = $(window).height() - $(".navbar.custom-navbar").height()
		- parseInt($(".navbar.custom-navbar").css("margin-bottom")) * 2;
	
	if (maxEntriesContainerHeight < parseInt(entriesContainer.css("min-height")))
		maxEntriesContainerHeight = parseInt(entriesContainer.css("min-height"));
	
	entriesContainer.height(maxEntriesContainerHeight);
	
	// var categoriesListContainer = $("#categoriesList");
	
	// var filterPanelTopHeight = 0;
	// $("#filtersPanel > *:not(#categoriesList)").each(function(){
	// 	filterPanelTopHeight += $(this).outerHeight();
	// });
		
	// // Set a reasonable fallback value
	// var maxCategoriesListContainerHeight = Math.max(maxEntriesContainerHeight - filterPanelTopHeight, parseInt(entriesContainer.css("min-height")));
		
	// categoriesListContainer.height(Math.min(categoriesListContainer[0].scrollHeight, maxCategoriesListContainerHeight));
}


function updateDisplayedCount(){
	$("#displayedEntriesCount").text($("#entriesContainer .content-entry").size());
}


function onSearchClear(){
	$("#searchField").val("");
	$("#searchField").trigger("keyup");
}

function setupHandlers(){
	$(".search-clear").on("click", onSearchClear);
	$("#searchField").on("keyup", onSearch);
	$("#categoriesList")
		.on("click", ".category-entry", onFilterToggle)
		.on("click", ".reset-category-filter", onCategoryFilterReset);
	$("#addEntryModal form").on("reset", onAddFormReset);
	$("#entriesContainer").on("click", ".content-entry", onEntryClick);
	};
	
	
function setupTooltips(){
	$("body").tooltip({
        selector: "[data-tooltip=tooltip], #timeChartSvg g.time-chart-entry.not-gap",
        container: "body",
        placement: "auto"
    });
}
function onFilterToggle(){
	var element = $(this);
	//alert("you call the textvisbrowser.onFilterToggle()");
	if (!element.hasClass("active"))
		element.addClass("active");
	else
		element.removeClass("active");
	
	updateCategoryResetButton(element);
	updateDisplayedEntries();
	
}


function updateCategoryResetButton(element){
	var container = element.parent();
	var resetButton = container.parent().find(".reset-category-filter");
	
	if (container.children(".category-entry:not(.active)").length > 0)
		resetButton.removeClass("hidden");
	else
		resetButton.addClass("hidden");
}
function onCategoryFilterReset(){
	var element = $(this);
	
	element.parent().next(".category-entries-container").children(".category-entry").addClass("active");
	element.addClass("hidden");
	
	updateDisplayedEntries();

}

function onAddFormReset(){
	$("#addEntryModal form .form-group").removeClass("has-error").removeClass("has-success");
	$("#inputEntryCategories .category-entry.active").removeClass("active");
}


function onSearch(){
	searchText = $("#searchField").val();
	updateDisplayedEntries();
}

function updateDisplayedEntries(){
	var container = $("#entriesContainer");
	container.empty();
	
	// Also, remove the tooltips
    $(".tooltip").remove();
	
	// Get the set of active filters
	var activeFilters = {};
	// $(".category-entry.active:not(.category-other)").each(function(){
	// 	var category = $(this).data("entry");
	// 	var parent = categoriesMap[category].parentCategory;
	// 	if (!activeFilters[parent])
	// 		activeFilters[parent] = [];
		 
	// 	activeFilters[parent].push(category);
	// });
		
	// Get the set of inactive filters for "Other" buttons
	var inactiveOthers = [];
	// $(".category-other:not(.active)").each(function(){
	// 	inactiveOthers.push($(this).data("category"));
	// });
	
	// Get the time filter range
	var indices = $("#timeFilter").val();
	var yearMin = timeFilterEntries[parseInt(indices[0])];
	var yearMax = timeFilterEntries[parseInt(indices[1])];
		
	// Filter the entries and sort the resulting array
	var eligibleEntries = $.map(entriesMap, function(entry, index){
		// First of all, check for search text relevancy
		if (!isRelevantToSearch(entry))
			return null;
		
		// Check the time value
		if (entry.year < yearMin || entry.year > yearMax)
			return null;
		
		// Check if entry is not relevant to inactive "other" filters
		// for (var i = 0; i < entry.incompleteCategories.length; i++) {
		// 	if (inactiveOthers.indexOf(entry.incompleteCategories[i]) != -1)
		// 		return null;
		// }
		
		// Check if all entry's categories are disabled
		// for (var k in entry.categoriesMap) {
		// 	if (!activeFilters[k] || !activeFilters[k].length)
		// 		return null;
			
		// 	var found = false;
		// 	for (var i = 0; i < entry.categoriesMap[k].length; i++) {
		// 		if (activeFilters[k].indexOf(entry.categoriesMap[k][i]) != -1) {
		// 			found = true;
		// 			break;
		// 		}
		// 	}
			
		// 	if (!found)
		// 		return null;
		// }
		
		return entry;
	});
	
	// Sort the entries by year in descending order,
	// entries without proper year value come last.
	// Secondary sorting field is reference (in ascending order).
	eligibleEntries.sort(function(d1, d2){
		return d1.sortIndex - d2.sortIndex;
	});
		
	if (!eligibleEntries.length) {
		container.append("<p class=\"text-muted\">No eligible entries found</p>");
	} else {
		$.each(eligibleEntries, function(i,d){
			var element = $("<div class=\"content-entry\" data-tooltip=\"tooltip\"></div>");
			element.attr("data-id", d.id);
			element.prop("title", d.title + " (" + d.year + ")");
			
			var image = $("<img class=\"media-object thumbnail100\">");
			image.attr("src", d.pics100.src);
			
			element.append(image);
			
			container.append(element);
		});
	}
	updateDisplayedCount();
	updateTimeChart(eligibleEntries);
}

function isRelevantToSearch(entry){
	var query = searchText ? searchText.toLowerCase().trim() : null;
	if (!query)
		return true;
	
	// Note: "allAuthors" should be included in order to support alternative name spellings
	//var keys = ["id", "title", "year", "authors", "allAuthors", "reference", "url", "categories"];
	var keys = ["id", "title", "year", "authors", "reference", "url"];
	for (var i = 0; i < keys.length; i++) {
		if (String(entry[keys[i]]).toLowerCase().indexOf(query) != -1) {
			return true;
		}
	}
	
	
	
	return false;
}

var entriesMap = {};
function loadContent() {
	$.ajaxSettings.async = false;
	
	var eligibleEntries = null;
	var container = $("#entriesContainer");
	$.getJSON("content4.json", function (data) {
		$.each(data, function (i, d) {
			entriesMap[d.id] = d;
			// alert("i" + i);
			// alert("d" + d.id);
			// Load thumbnails
			d.pics100 = new Image();
			d.pics100.src = "pics100/" + d.id + ".png";
			//console.log("src: " + d.pics100.src);
			// alert("entry123");
		})
	});
	// setTimeout(function () {
	//     alert(Object.keys(entriesMap).length);

	// }, 3000);
	// sleep(2000);
	// alert(Object.keys(entriesMap).length);
	eligibleEntries = $.map(entriesMap, function (entry, index) {
		return entry;
	});

	$.each(eligibleEntries, function (i, d) {
	//console.log("eligibleEntries  " + d.id);
		var element = $(
			"<div class=\"content-entry\" data-tooltip=\"tooltip\"></div>"
		);
		element.attr("data-id", d.id);
		element.prop("title", d.title + " (" + d.year + ")");

		var image = $("<img class=\"media-object thumbnail100\">");
		image.attr("src", d.pics100.src);

		element.append(image);

		container.append(element);
	});
	calculateSorting();
	
	appendAuxiliaryFilters();
	
	renderTimeChart();
	configureTimeFilter();
	
	
	updateDisplayedCount();
};

function onEntryClick(){
	var id = $(this).data("id");
	//alert("id" + id);
	if (!entriesMap[id])
		return;
	
	$(this).tooltip("hide");
	
	$(this).addClass("active");
	
	displayEntryDetails(id);
}


function displayEntryDetails(id) {
	if (!entriesMap[id])
		return;
	
	var entry = entriesMap[id];
	//alert("id"+id);
	//$("#entryDetailsThumbnail").attr("src", entry.thumb200.src);
	// Since the large thumbnails are not preloaded anymore, load the thumbnail via URL
	$("#entryDetailsThumbnail").attr("src", "pics200/" + id + ".png");
	// $("#entryDetailsThumbnail").attr("src", "TextVisualizationBrowser_files/Abbasi2006.png");
	//$("#entryDetailsThumbnail").attr("src", "pics200/Ada2010.png");
	$("#entryDetailsModal .entry-details-field").empty();
	//alert("entry.title"+entry.title);
	$("#entryDetailsTitle").html(entry.title + " (" + entry.year + ")");
	//alert("entry.authors"+entry.authors);
	if (entry.authors)
		$("#entryDetailsAuthors").html("by " + entry.authors);
		//alert("entry.reference"+entry.reference);
	if (entry.reference)
		$("#entryDetailsReference").html(entry.reference);
		//alert("entry.url"+entry.url);
	if (entry.url)
		$("#entryDetailsUrl").html("URL: <a href=\"" + entry.url + "\" target=\"_blank\">" + entry.url + "</a>");
	
	$("#entryDetailsBibtex").html("<a href=\"" + ("bibtex/" + entry.id + ".bib" )
			+ "\" target=\"_blank\"><span class=\"glyphicon glyphicon-save\"></span> BibTeX</a>");
	
	// $.each(entry.categories, function(i,d){
	// 	var item = categoriesMap[d];
		
	// 	var element = $("<span class=\"category-entry category-entry-span\""
	// 		    + "data-tooltip=\"tooltip\"></span>");
	// 	element.prop("title", item.descriptionPrefix
	// 			? item.descriptionPrefix + item.description
	// 			: item.description);
	// 	element.append(item.content);
		
	// 	$("#entryDetailsCategories").append(element);
	// 	$("#entryDetailsCategories").append(" ");
	// });
	
	$("#entryDetailsModal").modal("show");
	 onDetailsModalHidden();
}


function onDetailsModalHidden(){
	$(".content-entry.active").removeClass("active");
}
function calculateSorting(){
	var ids = Object.keys(entriesMap);
	
	// Sort the entries by year in descending order,
	// entries without proper year value come last.
	// Secondary sorting field is ID (in ascending order), which corresponds to the first author surname.
	ids.sort(function(id1, id2){
		var d1 = entriesMap[id1];
		var d2 = entriesMap[id2];
		
		if (!d1.year && !d2.year)
			return 0;
		else if (!d1.year)
			return 1;
		else if (!d2.year)
			return -1;
		
		if (d2.year - d1.year)
			return d2.year - d1.year;
		
		if (d1.id && d2.id) 
			return d1.id.localeCompare(d2.id);
		else
			return 0;
	});
	
	$.each(ids, function(i,d){
		entriesMap[d].sortIndex = i;
	});
}

function appendAuxiliaryFilters(){
	
	var totalCount = Object.keys(entriesMap).length;
	//alert(123);
	var content = "<span class=\"content-entry-label\">...</span>";
	
	// $("#categoriesList .category-item").each(function(i,d){
	// 	var element = $(d);
	// 	var title = element.attr("data-category");
		
	// 	// Prevent erroneous situations, including top-level categories
	// 	// without nested "leaf" entries (such as "data")
	// 	if (!statsMap[title] || !statsMap[title].hasDirectEntries)
	// 		return;
		
	// 	// Check if category covers the whole set
	// 	if (Object.keys(statsMap[title].ids).length < totalCount) {
	// 		incompleteCategories.push(title);
			
	// 		var button = $("<button type=\"button\" class=\"btn btn-default category-entry category-other active\""
	// 			    + "data-tooltip=\"tooltip\"></button>");
	// 		button.attr("data-category", title);
	// 		button.prop("title", "Other");
	// 		button.append(content);
			
	// 		element.find(".category-entries-container").append(button);
	// 	}
	// });
}

function prepareTimeChartData() {
	var yearEntries = [];
	
	var yearStats = {};
	var minYear = 1e6;
	var maxYear = -1e6;
	var maxYearCount = 0;
	$.each(entriesMap, function(k, v){
		if (!yearStats[v.year])
			yearStats[v.year] = 0;
		
		yearStats[v.year] += 1;
		
		if (yearStats[v.year] > maxYearCount)
			maxYearCount = yearStats[v.year]; 
		
		if (v.year > maxYear)
			maxYear = v.year;
		
		if (v.year < minYear)
			minYear = v.year;
	});
	
	for (var i = minYear; i <= maxYear; i++) {
		if (yearStats[i]) {
			yearEntries.push({
				year: i,
				gap: false,
				total: yearStats[i],
				current: yearStats[i]
			});
		}
	}

	// Detect the gaps between year entries
	// While the long gaps should be filled with special elements, short gaps should be filled with empty years
	var gaps = [];
	for (var i = 1; i < yearEntries.length; i++) {
		if (yearEntries[i].year - yearEntries[i-1].year >= YEAR_GAP_THRESHOLD) {
			gaps.push({
				year: yearEntries[i-1].year + 1,
				gap: true,
				duration: yearEntries[i].year - yearEntries[i-1].year - 1
			})
		} else if (yearEntries[i].year - yearEntries[i-1].year > 1) {
			for (var j = yearEntries[i-1].year + 1; j < yearEntries[i].year; j++) {
				gaps.push({
					year: j,
					gap: false,
					total: 0,
					current: 0
				});
			}	
		}
	}
	
	// Update the time chart data with gaps
	for (var i = 0; i < gaps.length; i++) {
		for (var j = 0; j < yearEntries.length; j++) {
			if (yearEntries[j].year > gaps[i].year) {
				yearEntries.splice(j, 0, gaps[i]);
				break;
			}
		}
	}
	
	// Finally, return the data and statistics
	return { timeChartData: yearEntries,
			 maxYearCount: maxYearCount };
}

// Renders the bar chart with statistics per year
function renderTimeChart() {
	// Prepare the chart data
	var chartData = prepareTimeChartData();
	timeChartData = chartData.timeChartData;
			
	// Setup SVG canvas
	var margin = { top: 1, right: 1, bottom: 1, left: 1};
	
	var outerWidth = Math.round($("#timeChart").width());
	var outerHeight = Math.round($("#timeChart").height());
	
	var canvasHeight = outerHeight - margin.top - margin.bottom;
	var canvasWidth = outerWidth - margin.left - margin.right;
	
	timeChartSvg = d3.select($("#timeChart").get(0)).append("svg:svg")
	.attr("id", "timeChartSvg")
	.classed("svg-vis", true)
	.attr("height", outerHeight + "px")
	.attr("width", outerWidth + "px")
	.attr("clip", [margin.top, outerWidth - margin.right, outerHeight - margin.bottom, margin.left].join(" "));
	
	timeChartSvg.append("rect")
	.classed("svg-fill", true)
	.attr("height", outerHeight)
	.attr("width", outerWidth)
	.style("fill", "white");
	
	timeChartSvg.append("rect")
	.classed("svg-frame-rect", true)
	.attr("height", outerHeight)
	.attr("width", outerWidth)
	.style("fill", "none")
	.style("stroke", "grey")
	.style("stroke-width", "1");
	
	var frame = timeChartSvg.append("g")
		.classed("frame-vis", true)
		.attr("id", "timeChartFrame")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	// Prepare the clipping path for inner canvas
	frame.append("clipPath")
		.attr("id", "timeChartCanvasClip")
	.append("rect")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", canvasWidth)
	    .attr("height", canvasHeight);
	
	var canvas = frame.append("g")
		.classed("canvas-vis", true)
		.attr("id", "timeChartCanvas")
		.attr("clip-path", "url(#timeChartCanvasClip)");
	
	// References to scales should be reused
	timeChartXScale = d3.scale.ordinal()
		.domain(timeChartData.map(function(d){return d.year;}))
		.rangeBands([0, canvasWidth]);
	
	timeChartHeight = canvasHeight;
	
	timeChartYScale = d3.scale.linear()
		.domain([0, chartData.maxYearCount])
		.range([0, timeChartHeight]);
	
	// Add the bars
	canvas.selectAll("g.time-chart-entry")
	.data(timeChartData)
	.enter().append("g")
	.classed("time-chart-entry", true)
	.classed("not-gap", function(d){return !d.gap;})
	.attr("transform", function(d){ return "translate(" + timeChartXScale(d.year) + ",0)"; })
	.attr("title", getTimeChartEntryDescription)
	.each(function(d, i){
		var group = d3.select(this);
		
		if (!d.gap) {
			// Create bars
			
			group.append("rect")
				.classed("time-chart-total", true)
				.attr("width", timeChartXScale.rangeBand())
				.attr("y", timeChartHeight - timeChartYScale(d.total))
				.attr("height", timeChartYScale(d.total));
		
			group.append("rect")
				.classed("time-chart-current", true)
				.attr("width", timeChartXScale.rangeBand())
				.attr("y", timeChartHeight - timeChartYScale(d.current))
				.attr("height", timeChartYScale(d.current));
			
		} else {
			// Create an ellipsis mark
			
			alert(123);
			group.append("text")
				.classed("time-chart-gap", true)
				.text("…")
				.attr("x", timeChartXScale.rangeBand()/2)
				.attr("y", timeChartHeight/2)
				.attr("text-anchor", "middle");
		}
		
	});
}

// Creates the text description for a time chart entry
function getTimeChartEntryDescription(entry){
	if (!entry.gap) {
		return entry.year + ": "
			+ entry.current + " techniques displayed, "
			+ entry.total + " techniques in total";
	} else {
		return null;
	}
}
function updateTimeChart(eligibleEntries) {

	// Update the time chart
	var yearStats = {};
	$.each(eligibleEntries, function(i,d){
		if (!yearStats[d.year])
			yearStats[d.year] = 0;
		
		yearStats[d.year] += 1;
	});
	
	$.each(timeChartData, function(i, d){
		if (d.gap)
			return;
		
		d.current = yearStats[d.year] || 0;
	});
	
	timeChartSvg.selectAll("g.time-chart-entry.not-gap")
	.each(function(d, i){
		if (d.gap)
			return;
		
		var group = d3.select(this);
		
		group.select(".time-chart-current")
			.transition()
				.attr("y", timeChartHeight - timeChartYScale(d.current))
				.attr("height", timeChartYScale(d.current));
		
		group.attr("title", getTimeChartEntryDescription(d));
		// Force Bootstrap tooltip update
		group.attr("data-original-title", getTimeChartEntryDescription(d));
	});
}

// Configures the time filter
function configureTimeFilter() {
	// Get the set of time values
	var values = {};
	$.each(entriesMap, function(i, d){
		if (!isFinite(parseInt(d.year)))
			return;
		
		values[d.year] = true;
	});
	
	// Get the range of time values
	timeFilterEntries = $.map(values, function(d, i){
		return parseInt(i);
	}).sort(function(a, b) {
		  return a - b;
	});
	
	// Update labels
	$("#timeFilterMin").text(timeFilterEntries[0]);
	$("#timeFilterMax").text(timeFilterEntries[timeFilterEntries.length-1]);
	// Setup the slider
	//alert("timeFilterEntries.length"+timeFilterEntries.length);
	// alert(12345);
	$("#timeFilter").noUiSlider({
		
		start: [0, timeFilterEntries.length-1],
		step: 1,
		range: {
			"min": 0,
			"max": timeFilterEntries.length-1
		},
		behaviour: "drag",
		connect: true
	}).on("slide", onTimeFilterUpdate);
}

// Updates the labels and triggers time filtering
function onTimeFilterUpdate() {
	//alert(123);
	var indices = $("#timeFilter").val();
	//alert()
	$("#timeFilterMin").text(timeFilterEntries[parseInt(indices[0])]);
	$("#timeFilterMax").text(timeFilterEntries[parseInt(indices[1])]);
	
	updateDisplayedEntries();
}