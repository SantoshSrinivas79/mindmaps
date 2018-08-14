/**
 * Creates a new OpenDocumentView. This view shows a dialog from which the user
 * can select a mind map from the local storage or a hard disk.
 * 
 * @constructor
 */
mindmaps.OpenDocumentView = function() {
  var self = this;

  // create dialog
  var $dialog = $("#template-open").tmpl().dialog({
    autoOpen : false,
    modal : true,
    zIndex : 5000,
    width : 550,
    close : function() {
      $(this).dialog("destroy");
      $(this).remove();
    }
  });

  var $openCloudButton = $("#button-open-cloud").button().click(function() {
    if (self.openCloudButtonClicked) {
      self.openCloudButtonClicked();
    }
  });

  $dialog.find(".file-chooser input").bind("change", function(e) {
    if (self.openExernalFileClicked) {
      self.openExernalFileClicked(e);
    }
  });

  var $table = $dialog.find(".localstorage-filelist");
  $table.delegate("a.title", "click", function() {
    if (self.documentClicked) {
      var t = $(this).tmplItem();
      self.documentClicked(t.data);
    }
  }).delegate("a.delete", "click", function() {
    if (self.deleteDocumentClicked) {
      var t = $(this).tmplItem();
      self.deleteDocumentClicked(t.data);
    }
  });
  
  // Handle click of server file
  var $my_table = $dialog.find(".server-filelist");
  $my_table.delegate("a.title", "click", function() {
    if (self.my_documentClicked) {
      var t = $(this).tmplItem();
      console.log(t.data);
      self.my_documentClicked(t.data.title);
    }
  });

  /**
  * Render list of documents in the local storage
  * 
  * @param {mindmaps.Document[]} docs
  */
  this.render = function(docs) {
    // empty list and insert list of documents
    var $list = $(".document-list", $dialog).empty();
    $("#template-open-table-item").tmpl(docs, {
      format : function(date) {
        if (!date) return "";

        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        return day + "/" + month + "/" + year;
      }
    }).appendTo($list);


    var mapList = 
                $.ajax({
                    type: 'GET',
                    url: "/getmaps",
                    dataType: 'json',
                    contentType: 'application/json',
                    async: false,
                    success: function(json) {
                      return json;
                    }
                  });

    mapList = JSON.parse(mapList.responseText);
    console.log((mapList));
    
    docs = new Array();
    
    $.each(mapList, function(k, m) {
      doc = new Object();
      doc.title = m;
      doc.data = "";
      docs.push(doc);
    });
    
    
    console.log(docs);
    
    // Hack to populate server list too!
    // empty list and insert list of documents
    var $list = $(".my-document-list", $dialog).empty();
    $("#my-template-open-table-item").tmpl(docs, {
      format : function(date) {
        if (!date) return "";

        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        return day + "/" + month + "/" + year;
      }
    }).appendTo($list);


  };

  /**
  * Shows the dialog.
  * 
  * @param {mindmaps.Document[]} docs
  */
  this.showOpenDialog = function(docs) {
    this.render(docs);
    $dialog.dialog("open");
  };

  /**
  * Hides the dialog.
  */
  this.hideOpenDialog = function() {
    $dialog.dialog("close");
  };

  this.showCloudError = function(msg) {
    $dialog.find('.cloud-loading').removeClass('loading');
    $dialog.find('.cloud-error').text(msg);
  };

  this.showCloudLoading = function() {
    $dialog.find('.cloud-error').text('');
    $dialog.find('.cloud-loading').addClass('loading');
  };

  this.hideCloudLoading = function() {
    $dialog.find('.cloud-loading').removeClass('loading');
  };
};

/**
* Creates a new OpenDocumentPresenter. The presenter can load documents from
* the local storage or hard disk.
* 
* @constructor
* @param {mindmaps.EventBus} eventBus
* @param {mindmaps.MindMapModel} mindmapModel
* @param {mindmaps.OpenDocumentView} view
* @param {mindmaps.FilePicker} filePicker
*/
mindmaps.OpenDocumentPresenter = function(eventBus, mindmapModel, view, filePicker) {

  /**
   * Open file via cloud
   */
  view.openCloudButtonClicked = function(e) {
    mindmaps.Util.trackEvent("Clicks", "cloud-open");
    mindmaps.Util.trackEvent("CloudOpen", "click");

    filePicker.open({
      load: function() {
        view.showCloudLoading();
      },
      cancel: function () {
        view.hideCloudLoading();
        mindmaps.Util.trackEvent("CloudOpen", "cancel");
      },
      success: function() {
        view.hideOpenDialog();
        mindmaps.Util.trackEvent("CloudOpen", "success");
      },
      error: function(msg) {
        view.showCloudError(msg);
        mindmaps.Util.trackEvent("CloudOpen", "error", msg);
      }
    });
  };

  // http://www.w3.org/TR/FileAPI/#dfn-filereader
  /**
  * View callback: external file has been selected. Try to read and parse a
  * valid mindmaps Document.
  * 
  * @ignore
  */
  view.openExernalFileClicked = function(e) {
    mindmaps.Util.trackEvent("Clicks", "hdd-open");

    var files = e.target.files;
    var file = files[0];

    var reader = new FileReader();
    reader.onload = function() {
      try {
        // var doc = mindmaps.Document.fromJSON(reader.result);
        
        var doc = {
          title : "Auction Resume.json"
        }
        
        var jsonMap = 
              $.ajax({
                  type: 'POST',
                  url: "/loadmap",
                  dataType: 'json',
                  contentType: 'application/json',
                  async: false,
                  data: JSON.stringify(doc),
                  success: function(json) {
                    return json;
                  }
                });

        console.log(jsonMap);
        jsonMap = (jsonMap.responseText);
        var doc = mindmaps.Document.fromJSON(jsonMap);
      } catch (e) {
        eventBus.publish(mindmaps.Event.NOTIFICATION_ERROR, 'File is not a valid mind map!');
        throw new Error('Error while opening map from hdd', e);
      }
      mindmapModel.setDocument(doc);
      view.hideOpenDialog();
    };

    reader.readAsText(file);
  };

  /**
  * View callback: A document in the local storage list has been clicked.
  * Load the document and close view.
  * 
  * @ignore
  * @param {mindmaps.Document} doc
  */
  view.documentClicked = function(doc) {
    mindmaps.Util.trackEvent("Clicks", "localstorage-open");
    
    mindmapModel.setDocument(doc);
    view.hideOpenDialog();
  };

  // Handle the click of the server file item document
  view.my_documentClicked = function(title) {
    mindmaps.Util.trackEvent("Clicks", "server-open");
    
    console.log(title);
    console.log("Server document clicked");
    try {
        var doc = {
          title : title
        }
        
        var jsonMap = 
              $.ajax({
                  type: 'POST',
                  url: "/loadmap",
                  dataType: 'json',
                  contentType: 'application/json',
                  async: false,
                  data: JSON.stringify(doc),
                  success: function(json) {
                    return json;
                  }
                });

        console.log(jsonMap);
        jsonMap = (jsonMap.responseText);
        var doc = mindmaps.Document.fromJSON(jsonMap);
      } catch (e) {
        eventBus.publish(mindmaps.Event.NOTIFICATION_ERROR, 'File is not a valid mind map!');
        throw new Error('Error while opening map from hdd', e);
      }
      
      mindmapModel.setDocument(doc);
      view.hideOpenDialog();
    
    mindmapModel.setDocument(doc);
    view.hideOpenDialog();
  };

  /**
  * View callback: The delete link the local storage list has been clicked.
  * Delete the document, and render list again.
  * 
  * @ignore
  * @param {mindmaps.Document} doc
  */
  view.deleteDocumentClicked = function(doc) {
    // TODO event
    mindmaps.LocalDocumentStorage.deleteDocument(doc);

    // re-render view
    var docs = mindmaps.LocalDocumentStorage.getDocuments();
    view.render(docs);
  };

  /**
  * Initialize.
  */
  this.go = function() {
    var docs = mindmaps.LocalDocumentStorage.getDocuments();
    docs.sort(mindmaps.Document.sortByModifiedDateDescending);
    view.showOpenDialog(docs);
  };
};
