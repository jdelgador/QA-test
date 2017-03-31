var ItxMobileProductPageClass = function (aProduct) {

  var self = this;
  //self.searchTerm = inditex.iXSearchTerm;
  inditex.iXSearchTerm = inditex._getURLParameter("search-term");
  if (inditex.iXSearchTerm != undefined) {
    self.searchTerm = inditex.iXSearchTerm;
  } else {
    self.searchTerm = "";
  }

  self.from = decodeURI(
    (RegExp('from=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]
  );
  self.fromi = decodeURI(
    (RegExp('fromi=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]
  );
  self.bundleId = decodeURI(
    (RegExp('bundleId=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]
  );
  //console.log('NVP-log constructor aProduct', aProduct, inditex.iXProductInfo);
  if (aProduct != null) {
    self.iProductInfo = aProduct;
    self.currentProduct = aProduct;
  } else {
    self.iProductInfo = inditex.iXProductInfo;
  }

  // -- comprueba si es Bundle o ProductBean
  self.isBundleSpecial = ((self.iProductInfo.type == 'BundleBean') && self.iProductInfo.onSpecial)
  self.isBundle = ((self.iProductInfo.type == 'BundleBean') && !self.iProductInfo.onSpecial);

  self.iColorId = self._getColorIdFromUrl();


  // -- se recupera la informaciï¿½n de la categoria
  var categoryPromise = inditex.xRestGetCategory(inditex.iCategoryId);

  var userPromise = inditex.xRestCurrentUser();
  Promise.all(categoryPromise, userPromise).done(function (values) {
    self.iCategoryInfo = values[0];

    // -- se recupera la informaciÃ¯Â¿Â½n del usuario
    self.userInfo = inditex.iUserJSON;
    self._init();
  }).Catch(function (error) {});

  $(".content:last").css("width", "100%");
  //$(".content:last").css("overflow-x","hidden"); // oculta los slides anteriores y siguientes
  $("#iContent:last").addClass("productPage");

};


ItxMobileProductPageClass.prototype._init = function () {

  var self = this;
  self.log = false;
  self.iStore = inditex.iStoreJSON;
  self.iProductList = {};

  inditex.xDefaultLoader(-1, $(".container:last"), 0);

  var mSlider = null;

  self.mSliderProductos = null;
  self.mSlidersImagenes = []; //sliders verticales de imagenes

  self.ProductosRelacionadosProducto = [];

  self.iVisibilityMapProducts = [];
  self.iAvailabilityMapProducts = []; // para backsoon


  self.ProductosCargados = [];

  self.topAperturaCapa = 0;
  self.productoVisibleActivo;

  self.IntervaloCierre;

  self.bloquelegal;

  var TallaSelected = null;

  var colorClickeado = null;

  var SeleccionadoSelected = null;

  var product = self.isBundleSpecial ? self.iProductInfo.bundleProductSummaries[0] : self.iProductInfo;

  var precioGeneralProducto = null;

  var posProductoCarrousel = 0;



  //Cabecera de la aplicaciÃ³n
  inditex.customDrawHeader(inditex.iUserJSON, product.name, true, true, false);

  // -- inicia el control del slider
  self._sliderPositionController();

  // inditex.trackJetloreProductView(self.iProductInfo.id);  NO EXISTE

  var productId = self.isBundleSpecial ? self.iProductInfo.bundleProductSummaries[0].id : self.iProductInfo.id;
  //console.log('NVP-log productId', productId);

  inditex.xRestGetMarketingSpot('Product_PriceLegal').done(function (aText) {
    self.bloquelegal = aText;

  });


  // -- se recupera el stock del producto
  inditex.xRestGetProductStock(productId).done(function (stock) {

    if (stock.length > 0) {

      var productsArray = new Array();
      productsArray.push(self.iProductInfo);

      $(".positionPrincipal:first").attr("id", "seccion_producto_" + self.iProductInfo.id);

      // Visibilidad del producto

      self.productoVisibleActivo = self.iProductInfo;

      self.iVisibilityMap = inditex.getProductVisibilityMap(productsArray, stock);
      //console.log('NVP-log self.iProductInfo.id - stock  - visibilityMap', self.iProductInfo.id, stock, self.iVisibilityMap);

      self.iVisibilityMapProducts[self.iProductInfo.id] = self.iVisibilityMap;

      // availabel del producto
      self.iAvailabilityMap = self._getProductAvailabilityMap(stock, self.iProductInfo);
      self.iAvailabilityMapProducts[self.iProductInfo.id] = self.iAvailabilityMap


      if (self.iVisibilityMap && (self.iVisibilityMap[self.iProductInfo.id] != "hidden" ||
          (self.iVisibilityMap[self.iProductInfo.id] == "hidden" && inditex.iStoreJSON.details.showProductCategorySkuNoStock != 'HIDDEN'))) {

        // -- carga del rango de precios y pintado del producto

        self.log && console.group('Drawing initial product', self.iProductInfo);
        if (self.iProductInfo.type == 'ProductBean') {
          //console.log('NVP-log ProductBean');
          $('#formProductPage_').attr('id', 'formProductPage_' + self.iProductInfo.id);
          //$('#formProductPage_' + self.iProductInfo.id).validate(formsValidate.formProductPage);

          // -- si se trata de un producto normal
          self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(self.iProductInfo);
          self._draw();
          self._loadBinding();

        } else if (self.isBundle) { //producto bundle normal
          // TODO pintado del bundle
          //console.log('NVP-log 1 - Bundle');
          //$('.container.product').remove();

          if (self.iProductInfo.bundleProductSummaries) {
            $('#formProductPage_').attr('id', 'formProductPage_' + self.iProductInfo.id);
            $('#formProductPage_' + product.id).validate(formsValidate.formProductPage);

            self.drawBundleSizeSelector(self.iProductInfo);
            self.rangeProductPrice = itxMobileRenderGrid.rangePriceBundleProduct(product);
            self._drawBundle();
            //self._loadBinding();
            // self.drawBundle();
            self._loadBundleBinding();
            // $.each(self.iProductInfo.bundleProductSummaries, function (index, product) {
            //   // -- si se trata de un bundle

            //   self.currentProduct = product;
            //   self._drawBundleContainer(product);
            //   self._drawBundle(product);


            // });
            // self._loadBinding();
          }
        } else if (self.isBundleSpecial) {

          //estamos en un producto bundle de tipo especial
          //console.log('NVP-log mocaco');
          $('#formProductPage_').attr('id', 'formProductPage_' + self.iProductInfo.id);
          $('#formProductPage_' + self.iProductInfo.id).validate(formsValidate.formProductPage);
          // -- si se trata de un producto normal
          self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(self.iProductInfo.bundleProductSummaries[0]);
          self._drawBundleSpecial();
          self._loadBinding();

        }
        self.log && console.groupEnd();

      }
      self.log && console.group('Drawing other products');
      self._productosCarrouselCategoria(); // carrousel de productos
      self.log && console.groupEnd();
      // Tag Manager
      $.event.trigger({
        type: 'productPage.load'
      });

      // Tag manager
      if (self.productoVisibleActivo.onSpecial || self.productoVisibleActivo.type === 'BundleBean') {

        $.event.trigger({
          type: 'productPage.setPageView',
          productInfo: self.productoVisibleActivo.bundleProductSummaries[0],
          list: (self.searchTerm) ? 'buscador' : (self.fromi && $.isNumeric(self.fromi)) ? 'productos_relacionados' : (self.from && $.isNumeric(self.from)) ? 'lookbook_' + self.productoVisibleActivo.id : 'parrilla_' + (window.sessionStorage.getItem('productActionFieldList') || '')
        });

      } else {
        $.event.trigger({
          type: 'productPage.setPageView',
          productInfo: self.productoVisibleActivo,
          list: (self.searchTerm) ? 'buscador' : (self.fromi && $.isNumeric(self.fromi)) ? 'productos_relacionados' : (self.from && $.isNumeric(self.from)) ? 'lookbook_' + self.productoVisibleActivo.id : 'parrilla_' + (window.sessionStorage.getItem('productActionFieldList') || '')
        });

      }



    }


  }).Catch(function (error) {

  });


  self._drawFPInfo();

};


/******************************************************
/      INICIO DEL CARROUSEL
/ consulta todos los productos  del array de categorias
****************************************************/
ItxMobileProductPageClass.prototype._productosCarrouselCategoria = function () {
  var self = this;
  //console.log('NVP-log _productosCarrouselCategoria producto aqui');
  var category = self.iCategoryInfo.id;

  //console.log('NVP-log _productosCarrouselCategoria');
  Inditex.xRestGetProductsByCategory(category, true).done(function (data) {

    inditex.iXProductList = {
      products: data
    };

    self.iProductList.products = ItxMobileCategoryPageClass.prototype.applyFiltersToProductList(data);


    self.posProductoCarrousel = _.findIndex(self.iProductList.products, {
      id: self.iProductInfo.id
    });

    self._drawCarrouselProductos(self.iProductList);



  });

}



ItxMobileProductPageClass.prototype._SearchNextProducts = function (idProducto, pProducto) {
  var self = this;


  //console.log('NVP-log _SearchNextProducts idProducto, pProducto, self.posProductoCarrousel', idProducto, pProducto, self.posProductoCarrousel);

  // por si ha quedado abierta una subscripcion a backsoon
  $(".activeProduct div[id^=buttonAddCart_]").removeClass("hide");
  $(".activeProduct div[id^=buttonWant_]").addClass("hide");

  self.posProductoCarrousel = _.findIndex(_.clone(self.iProductList.products), {
    id: parseInt(idProducto)
  });


  var ProductoPrincipal = self.iProductList.products[self.posProductoCarrousel];

  var anterior = self.posProductoCarrousel - 1;
  var siguiente = self.posProductoCarrousel + 1;

  if (pProducto) {

    ProductoPrincipal = pProducto.currentData.product;

    if ((ProductoPrincipal.type == "BundleBean" && ProductoPrincipal.onSpecial) || (ProductoPrincipal.onSpecial)) {
      $("#header .secctionName .title").html(ProductoPrincipal.bundleProductSummaries[0].name);
    } else {
      $("#header .secctionName .title").html(ProductoPrincipal.name);
    }

  }

  if (self.iProductList.products[anterior]) {

    self._drawProduct(self.iProductList.products[anterior], 1, ProductoPrincipal);
  }

  if (self.iProductList.products[siguiente]) {

    self._drawProduct(self.iProductList.products[siguiente], 3, ProductoPrincipal);
  }

  if (self.mSliderProductos) {
    var idActivo = $("#");
    self.mSliderProductos.update();
  }



}

// consulta todos los productos  del array de categorias
/**
 * [_drawCarrouselProductos description]
 * @param  {[type]} cProductos lista de productos
 */
ItxMobileProductPageClass.prototype._drawCarrouselProductos = function (cProductos) {
  var self = this;

  self.log && console.log('NVP-log _drawCarrouselProductos', cProductos);
  var posicionProducto = self.posProductoCarrousel;

  var anterior = posicionProducto - 1;
  var siguiente = posicionProducto + 1;

  var existeAnterior = 0;
  var existePosterior = 0;

  self.iProductList = cProductos;


  if (self.iProductList.products[posicionProducto]) {


    var idProducto = self.iProductList.products[posicionProducto].id;

  }



  if (self.iProductList.products[anterior]) {
    self._drawProduct(self.iProductList.products[anterior], 1, self.iProductInfo);
    existeAnterior = 1;
    self.ProductosCargados.push(self.iProductList.products[anterior]);

  }

  if (self.iProductList.products[siguiente]) {
    self._drawProduct(self.iProductList.products[siguiente], 3, self.iProductInfo);
    existePosterior = 1;
    self.ProductosCargados.push(self.iProductList.products[siguiente]);
  }

  // comprobacion que no es el primer producto del listado
  if (existeAnterior == 1 && existePosterior == 1) {
    posicionInicialSlider = 1;
  } else {
    if (existeAnterior == 0) {
      posicionInicialSlider = 0;

    }
    if (existePosterior == 0) {
      posicionInicialSlider = 1;
    }
  }

  self.mSliderProductos = new Swiper('.swiper-container-productos', {

    direction: 'horizontal',
    loopedSlides: 10,
    paginationHide: true,
    pagination: '.swiper-paginacion-productos',
    paginationClickable: false,
    nextButton: '.swiper-button-next',
    prevButton: '.swiper-button-prev',
    initialSlide: posicionInicialSlider,
    slideActiveClass: 'activeProduct',
    preventClicksPropagation: true,
    preventClicks: true,
    onInit: function () {


    },
    onSlideChangeEnd: function () {

      var idProducto = $("#contenedor-carrousel-productos").find(".activeProduct").attr("id");
      self.log && console.log('NVP-log changed slide', idProducto);
      idProducto = idProducto.replace("seccion_producto_", "");
      var buttonCart = $("#buttonAddCart_" + idProducto).length ? $("#buttonAddCart_" + idProducto) : $("#buttonBundleAddCart_" + idProducto)
      if (buttonCart.length > 0) {

        self._SearchNextProducts(idProducto, buttonCart.data());

        // se cargan los productos del relacionado cuando esta visible
        var productoCurrentVisible = buttonCart.data();
        var productoVisible = productoCurrentVisible.currentData.product;
        self.productoVisibleActivo = productoCurrentVisible.currentData.product;

        inditex.iXProductInfo = self.productoVisibleActivo;

        self._drawRelatedProductsCarrousel(productoVisible);
        // Tag manager
        if (self.productoVisibleActivo.onSpecial || self.productoVisibleActivo.type === 'BundleBean') {

          $.event.trigger({
            type: 'productPage.setPageView',
            productInfo: self.productoVisibleActivo.bundleProductSummaries[0],
            list: (self.searchTerm) ? 'buscador' : (self.fromi && $.isNumeric(self.fromi)) ? 'productos_relacionados' : (self.from && $.isNumeric(self.from)) ? 'lookbook_' + self.productoVisibleActivo.id : 'parrilla_' + (window.sessionStorage.getItem('productActionFieldList') || '')
          });

        } else {
          $.event.trigger({
            type: 'productPage.setPageView',
            productInfo: self.productoVisibleActivo,
            list: (self.searchTerm) ? 'buscador' : (self.fromi && $.isNumeric(self.fromi)) ? 'productos_relacionados' : (self.from && $.isNumeric(self.from)) ? 'lookbook_' + self.productoVisibleActivo.id : 'parrilla_' + (window.sessionStorage.getItem('productActionFieldList') || '')
          });

        }


      }

    }
  });
  $('.producInfo.swiper-slide.positionPrincipal.activeProduct').css('height', $(document).height() - $("#header").height() + 'px'); //NVPO

};


/**
 * [_ShowLoaderProduct muestra un velo mientras se carga la info del producto]
 * @param  {[type]} producto [object]
 * @param  {[type]} visible  [1=visible , 0=oculto ]
 */
ItxMobileProductPageClass.prototype._ShowLoaderProduct = function (producto, visible) {
  var self = this;
  //console.log('NVP-log _ShowLoaderProduct', producto, visible);
  if (visible == 1) {
    var precarga = $("<div></div>").attr("class", "loader").attr("id", "preloader_" + producto.id).css("opacity", 1);
    var imagen_loader = $("<p></p>").attr("class", "img-loader");
    var urlImg = Inditex.getCommonStaticResourceUrl("/itxwebmobile/images/loading.gif");
    var imagen = $("<img></img>").attr("src", urlImg);

    imagen_loader.append(imagen);
    precarga.append(imagen_loader);
    $("#formProductPage_" + producto.id).prepend(precarga);

  }
  if (visible == 0) {
    $("#preloader_" + producto.id).remove();
  }

}

/**
 * [_drawProduct dibuja el producto en una posicion del carrousel]
 * @param  {[object]} product  [description]
 * @param  {[int]} posicion [0,1,2]
 */
ItxMobileProductPageClass.prototype._drawProduct = function (product, posicion, productoPrincipal) {

  var self = this;
  self.log && console.log('NVP-log _drawProduct', product);
  var productId = product.id;

  // console.log('NVP-log _drawProduct', product);
  // console.group();
  if ($("#seccion_producto_" + product.id).length == 0) {


    var capaProductoPrincipal = $("#seccion_producto_" + productoPrincipal.id);


    /********************************************
    creacion de la capa contenedora del producto
     **********************************************/
    var mSection = "";


    var mSection = $(inditex.xGetTemplate('productInCarousel', {
      product: {
        id: product.id
      }
    }));
    // console.log('NVP-log mSection', mSection);

    if (self.mSliderProductos) {

      if (posicion == 1) {
        self.mSliderProductos.prependSlide(mSection);
      }

      if (posicion == 3) {
        self.mSliderProductos.appendSlide(mSection);
      }

    } else {

      if (posicion == 1) {
        mSection.insertBefore(capaProductoPrincipal);
      }

      if (posicion == 3) {
        mSection.insertAfter(capaProductoPrincipal);
      }

    }


    $("#seccion_producto_" + product.id + " .productDetailsExtended p.legal").remove();
    $("#seccion_producto_" + product.id + " .productDetailsExtended").append(self.bloquelegal);


    if ((product.type == 'BundleBean') && product.onSpecial) { //si es un producto bundle de tipo especial

      self._ShowLoaderProduct(product.bundleProductSummaries[0], 1);

      var target = $('#CarrouselContainer_' + product.id);
      //  self._drawProductDetails(product,posicion,$('.productDetails'));

      target.addClass('swiper-container-producto');

      var ul = $('<div></div>').attr({
        'class': 'CarrouselImages bxslider swiper-wrapper',
        'id': 'carrousel_' + product.id
      });

      var pager = $('<div></div>').addClass('swiper-pagination');
      target.append(pager);

      if (product.bundleProductSummaries[0].detail.colors[0].image.style && product.bundleProductSummaries[0].detail.colors[0].image.style.length > 0) {
        var style = product.bundleProductSummaries[0].detail.colors[0].image.style[0];

        var img = inditex.getProductImageUrls(_.clone(product.bundleProductSummaries[0].detail.colors[0].image), 1, 3, null, style);
        var imgZoom = inditex.getProductImageUrls(_.clone(product.bundleProductSummaries[0].detail.colors[0].image), 1, 1, null, style);


      } else {

        var img = inditex.getProductImageUrls(product.bundleProductSummaries[0].detail.colors[0].image, 1, 3);
        var imgZoom = inditex.getProductImageUrls(product.bundleProductSummaries[0].detail.colors[0].image, 1, 1);


      }
      style = null;


      // Imagen principal


      ul.append(self._drawImageProductCarrousel(img, imgZoom));

      if (product.bundleProductSummaries[0].detail.colors[0].image.style && product.bundleProductSummaries[0].detail.colors[0].image.style.length > 0) {

        var style = product.bundleProductSummaries[0].detail.colors[0].image.style[0];

        var auxImages = inditex.getProductImageUrls(_.clone(product.bundleProductSummaries[0].detail.colors[0].image), 2, 3, null, style);
        var auxImagesZoom = inditex.getProductImageUrls(_.clone(product.bundleProductSummaries[0].detail.colors[0].image), 2, 1, null, style);

      } else {
        var auxImages = inditex.getProductImageUrls(product.bundleProductSummaries[0].detail.colors[0].image, 2, 3);
        var auxImagesZoom = inditex.getProductImageUrls(product.bundleProductSummaries[0].detail.colors[0].image, 2, 1);
      }
      style = null;

      // Imagenes auxiliares

      $.each(auxImages, function (index, auxImg) {
        ul.append(self._drawImageProductCarrousel(auxImg, auxImagesZoom[index]));
        // Si no exite la imagen (404) eliminamos la slide
        ul.find('img').eq(index + 1).attr('src', auxImg).error(function () {
          ul.find('img').eq(index + 1).closest('.swiper-slide').remove();
        });
      });

    } else if ((product.type === 'BundleBean') && !product.onSpecial) {
      self._ShowLoaderProduct(product, 1);

      var target = $('#CarrouselContainer_' + product.id);
      //  self._drawProductDetails(product,posicion,$('.productDetails'));

      target.addClass('swiper-container-producto');

      var ul = $('<div></div>').attr({
        'class': 'CarrouselImages bxslider swiper-wrapper',
        'id': 'carrousel_' + product.id
      });

      var pager = $('<div></div>').addClass('swiper-pagination');
      target.append(pager);

      if (product.bundleColors[0].image.style && product.bundleColors[0].image.style.length > 0) {
        var style = product.bundleColors[0].image.style[0];

        var img = inditex.getProductImageUrls(_.clone(product.bundleColors[0].image), 1, 3, null, style);
        var imgZoom = inditex.getProductImageUrls(_.clone(product.bundleColors[0].image), 1, 1, null, style);


      } else {

        var img = inditex.getProductImageUrls(product.bundleColors[0].image, 1, 3);
        var imgZoom = inditex.getProductImageUrls(product.bundleColors[0].image, 1, 1);


      }
      style = null;


      // Imagen principal


      ul.append(self._drawImageProductCarrousel(img, imgZoom));

      if (product.bundleColors[0].image.style && product.bundleColors[0].image.style.length > 0) {

        var style = product.bundleColors[0].image.style[0];

        var auxImages = inditex.getProductImageUrls(_.clone(product.bundleColors[0].image), 2, 3, null, style);
        var auxImagesZoom = inditex.getProductImageUrls(_.clone(product.bundleColors[0].image), 2, 1, null, style);

      } else {
        var auxImages = inditex.getProductImageUrls(product.bundleColors[0].image, 2, 3);
        var auxImagesZoom = inditex.getProductImageUrls(product.bundleColors[0].image, 2, 1);
      }
      style = null;

      // Imagenes auxiliares

      $.each(auxImages, function (index, auxImg) {
        ul.append(self._drawImageProductCarrousel(auxImg, auxImagesZoom[index]));
        // Si no exite la imagen (404) eliminamos la slide
        ul.find('img').eq(index + 1).attr('src', auxImg).error(function () {
          ul.find('img').eq(index + 1).closest('.swiper-slide').remove();
        });
      });


    } else { // ProductBean

      // capa de preloader
      self._ShowLoaderProduct(product, 1);


      var target = $('#CarrouselContainer_' + product.id);
      //  self._drawProductDetails(product,posicion,$('.productDetails'));

      target.addClass('swiper-container-producto');

      var ul = $('<div></div>').attr({
        'class': 'CarrouselImages bxslider swiper-wrapper',
        'id': 'carrousel_' + product.id
      });


      var pager = $('<div></div>').addClass('swiper-pagination');
      target.append(pager);

      // Imagen principal


      var img = inditex.getProductImageUrls(product.detail.colors[0].image, 1, 3);
      var imgZoom = inditex.getProductImageUrls(product.detail.colors[0].image, 1, 1);
      ul.append(self._drawImageProductCarrousel(img, imgZoom));

      // Imagenes auxiliare
      var auxImages = inditex.getProductImageUrls(product.detail.colors[0].image, 2, 3);
      var auxImagesZoom = inditex.getProductImageUrls(product.detail.colors[0].image, 2, 1);
      $.each(auxImages, function (index, auxImg) {

        ul.append(self._drawImageProductCarrousel(auxImg, auxImagesZoom[index]));

        // Si no exite la imagen (404) eliminamos la slide
        ul.find('img').eq(index + 1).attr('src', auxImg).error(function () {
          ul.find('img').eq(index + 1).closest('.swiper-slide').remove();
        });


      });


    }



    var textoRelacionados = '<span class="title-related">' + inditex.text('ItxMobileProductPage.completatulook') + '</span>';
    var bloqueRelacionados = $("<div></div>").addClass("swiper-slide imgCarrouselContainter relacionados-container").html('<div class="relatedList"></div>').prepend(textoRelacionados);
    ul.append(bloqueRelacionados);


    target.append(ul);


    var targetPaginacion = $('#CarrouselContainer_' + product.id + ' .swiper-pagination');

    $("#seccion_producto_" + product.id + " .productDetailsExtended").append(self.bloquelegal);
    //self._drawRelatedProductsCarrousel(product);

    setTimeout(function () {

      // carrousel de imagenes vertical de producto
      self.mSlidersImagenes[product.id] = new Swiper('#CarrouselContainer_' + product.id, {
        direction: 'vertical',
        onInit: function () {
          //auto ajuste de las alturas
          var altura = $("#seccion_producto_" + productoPrincipal.id).css("height");
          $("#seccion_producto_" + product.id).css("height", altura);

          var altu = $("#seccion_producto_" + productoPrincipal.id + " .CarrouselContainer").css("height");
          $("#seccion_producto_" + product.id + " .CarrouselContainer").css("height", altu);

          $("#seccion_producto_" + product.id + " .CarrouselContainer").data("height", altu);
        },
        onImagesReady: function () {
          self._drawSpecialBullet();
          self._ShowLoaderProduct(product, 0);
        },
        onSlideChangeEnd: function () {
          var IdProducto = $("#contenedor-carrousel-productos .activeProduct").attr("id");
          IdProducto = IdProducto.replace("seccion_producto_", "");
          self._sliderPositionController(IdProducto);
        },
        onTap: function () {


          $(".elemento-relacionado").hammer().off("tap");
          $(".elemento-relacionado").hammer().on("tap", function (e) {
            var imagen = $(this).find("img");
            var url = imagen.data("url-relacionado");
            // Tag manager

            var id = imagen.attr('id').split('_')[1];
            var relatedProducts = self.productoVisibleActivo.detail.relatedProducts,
              relatedProductIndex;
            for (var i = 0, l = relatedProducts.length; i < l; i++) {
              if (relatedProducts[i].id == id) {
                relatedProductIndex = i + 1
                break;
              }
            }
            window.sessionStorage.setItem('relatedProductIndex', relatedProductIndex);
            $.event.trigger({
              type: 'productPage.viewRelatedProduct',
              idRelatedProduct: id
            });

            window.location = url;
          });
        },
        pagination: targetPaginacion,
        preventClicks: true,
        preventClicksPropagation: true,
        paginationHide: false,
        paginationClickable: true,
        height: parseInt($(window).height())
      });

    }, 800);



    //Bind muestra y cierre de ayuda
    var timer = null;
    var inDouble = false;
    ul.hammer().on('tap', function (event) {
      var $this = $(this);
      clearTimeout(timer);
      if (!inDouble) {
        timer = setTimeout(function () {
          $this.parent().parent().parent().find('div.AdviceCarrousel').fadeToggle();
        }, 500);
      }
      inDouble = false;
    });

    //ul.hammer().on('doubletap', function(event) {
    ul.find("img").hammer().off('click');
    ul.find("img").hammer().on('click', function (event) {



      inDouble = true;
      clearTimeout(timer);

      $(this).parent().parent().parent().find('div.AdviceCarrousel').fadeOut();

      var zoomDiv = $('div.zoom');
      var zoomClose = zoomDiv.find('div.closeZoom');
      var zoomImg = zoomDiv.find('img');
      var imgSlide = $(this).find(".swiper-slide-active img");

      if (!imgSlide.data("url-relacionado")) {

        // Copiamos zoomSrc de imagen activa en el zoom
        zoomImg.attr('src', $(this).attr('zoomSrc'));

        inditex._setZoomDImensions(zoomDiv, zoomImg);

        zoomDiv.show();

        zoomImg.one('load', function () {
          // do stuff
          zoomDiv.scrollLeft((zoomImg.width() - zoomDiv.width()) / 2);
          //self._hammerIt(zoomImg);
        });

        $(window).off('orientationchange');
        $(window).on('orientationchange', function (event) {
          inditex._setZoomDImensions(zoomDiv, zoomImg);
        });

        // Mostrar icono de up al scrollar
        $(window).off('scroll');
        $(window).on('scroll', function () {
          inditex._setZoomDImensions(zoomDiv, zoomImg);
        });

        zoomImg.hammer().off("doubletap");
        zoomImg.hammer().on("doubletap", function (event) {
          event.preventDefault();
          var zoomDiv = $(this).parent();
          self._showItems();
          zoomDiv.hide();
        });

        zoomClose.hammer().off("tap");
        zoomClose.hammer().on("tap", function (event) {

          event.preventDefault();
          var zoomDiv = $(this).parent();
          if (zoomDiv.css("display") == "block") {

            setTimeout(function () {
              self._showItems();
            }, 100);

            zoomDiv.hide();
          }
          return false;
        });

        $('div.productMoreDetails').hide();
        $('div.productDetails').hide();
        $('div.menu_extraInformation').hide();
        $('.buttonsContainer').hide();
        $('div.footer.home').hide();
        $('div.headerContent').hide();
        $('div.bx-viewport').hide();


      } else {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    });

    self._drawButtonsProduct(product, 0);


    self._drawProductDetailsCarrousel(product);
    self._drawSocialShare(product);
    self._drawPlusInfo(product);


  } else {


    $(".loader").remove();
  } // fin de si existe la capa ya dibujada
  console.groupEnd();
};


/**
 * [_drawButtonsProduct dibuja la botonera para cada elemento del carrousel]
 * @param  {[type]} producto [object]
 */
ItxMobileProductPageClass.prototype._drawButtonsProduct = function (producto, estadoInicial) {

  var self = this;


  var target = $("#seccion_producto_" + producto.id);



  var productInfo = producto;
  colorInfo = producto.detail.colors[0];


  $('#buttonAddCart_' + productInfo.id).remove();
  $('#buttonVerCart_' + productInfo.id).remove();
  $('#buttonShowAvail_' + productInfo.id).remove();
  $('.button_center.button_available').remove();

  $('#buttonWant_' + productInfo.id).remove();


  if (self.iStore.isOpenForSale) {
    var divButtonAdd = $('<div></div>').attr({
      'id': 'buttonAddCart_' + productInfo.id,
      'class': 'button_primary Big Productpage'
    });

  } else {
    var divButtonAdd = $('<div></div>').attr({
      'id': 'buttonAddCart_' + productInfo.id,
      'class': 'button_primary Big Productpage oculto'
    });

  }

  divButtonAdd.data('currentData', {
    colorInfo: colorInfo,
    product: productInfo
  });

  var spanText = inditex.text('BUTTON_ADD_TO_CART');
  if (producto.type === "BundleBean" && !producto.onSpecial) {
    spanText = inditex.text('ItxProducPage.bundle.buy');
  }

  var isVisibleMoreDetails = $(".producInformation .productMoreDetails").is(':visible');

  //if there's no color selected we assign the new one by default (colorInfo)
  self.previousColor = self.previousColor || colorInfo;

  //if the size has not been selected or the color is changed
  //add buttons is disable in order to select a size
  if (isVisibleMoreDetails) {
    /*
        if(estadoInicial===0){
          if (!self.TallaSelected ||
              (self.previousColor != colorInfo)) {

            spanText = inditex.text('selectSizeError');
            divButtonAdd.addClass('inactive');
          }
        }
        */
  }

  self.log && console.log('NVP-log button 5');
  var spanButtonAdd = $('<span></span>').attr({
    'class': 'textButton'
  }).append(spanText);

  divButtonAdd.append(spanButtonAdd);


  var divButtonWant = $('<div></div>').attr({
    'id': 'buttonWant_' + productInfo.id,
    'class': 'button_primary Big Productpage'
  }).addClass("hide");
  divButtonWant.data('currentData', {
    colorInfo: colorInfo,
    product: productInfo
  });
  self.log && console.log('NVP-log button 6');
  var spanButtonSend = $('<span></span>').attr({
    'class': 'textButton'
  }).append(inditex.text('ItxMobileProductPage.enviar'));
  divButtonWant.append(spanButtonSend);

  $(target).find(".buttonsContainer").append(divButtonWant);


  if (self.iStore.isOpenForSale) {
    $(target).find(".buttonsContainer").append(divButtonAdd);
  } else {
    $(target).find(".buttonsContainer").append(divButtonAdd);
  }


  if (self.iStore.details.availabilityStockStore) {
    // Boton availability
    var divButtonCenter = $('<div></div>').attr({
      'class': 'button_center button_available'
    });
    var aButtonAvail = $('<a></a>').attr({
      'id': 'buttonShowAvail_' + productInfo.id,
      'class': 'buttonText Big Productpage',
      'href': 'javascript:;'
    });
    if (self.iStore.isOpenForSale == false) {
      aButtonAvail.removeClass('buttonText').addClass('button_primary');
    }
    aButtonAvail.data('currentData', {
      colorInfo: colorInfo,
      product: productInfo
    });
    self.log && console.log('NVP-log button 7');
    var spanButtonAvail = $('<span></span>').attr({
      'class': 'textButton'
    }).append(inditex.text('BUTTON_AVAILABILITY'));

    aButtonAvail.append(spanButtonAvail);
    divButtonCenter.append(aButtonAvail);

    //$(".buttonsContainer").append(divButtonCenter);

    $("#menuDisponi_").append(aButtonAvail);

  }
  self._buttonsBinding();

};

/************************************************************
 ** checkea si el producto tiene atributo new y pone la imagen
 **************************************************************/
ItxMobileProductPageClass.prototype._checkNew = function () {

  var self = this;
  var Producto = self.iProductInfo;

}



ItxMobileProductPageClass.prototype._draw = function () {

  var self = this;

  self._selectColor();

  var target = $('.container.product .producInformation');

  // -- tï¿½tulo y precios del producto


  self._drawProductDetails($('.productDetails'));


  // -- imï¿½genes
  self._drawProductCarrousel(target.children('.CarrouselContainer'));

  // -- referencia, colores y tallas
  self._drawProductMoreDetails(target.children('.productMoreDetails'));

  // -- descripciï¿½n, composiciï¿½n y cuidados
  //self._drawProductInfo(); se cargara por peticion

  // -- botones
  self._drawButtons(target, self.iProductInfo, self.iColorinfo);

};

ItxMobileProductPageClass.prototype._selectColor = function (product) {

  var self = this;
  //console.group('NVP-log _selectColor', product, self.currentProduct);
  if (!product) {
    product = self.currentProduct;
  }

  var colors = self.currentProduct.detail.colors;
  var isBundle = (product.type === 'BundleBean' && !product.onSpecial);
  var isBundleSpecial = (product.type === 'BundleBean' && product.onSpecial);


  if (product) {
    if (isBundle) {
      colors = product.bundleColors;
    } else if (isBundleSpecial) {
      colors = product.bundleProductSummaries[0].detail.colors;
      var specialBundleColors = product.bundleColors;
    } else {
      colors = product.detail.colors;
    }
  }

  //console.log('NVP-log colors', self.iColorId, colors);

  if (window.location.search) {
    var url_param = inditex.getUrlParameters(window.location.search);

    var color_id = url_param["colorId"] //id del color de que se le pasa al bundle product de tipo especial
  } else {

    color_id = colors[0].id;

  }
  var selectedColor = {};

  for (var ind in colors) {

    if (colors[parseInt(ind)].id == parseInt(color_id)) {
      selectedColor = colors[ind];
    }
  }


  if (self.iColorId == null || self.iColorId == '' || typeof self.iColorId == "undefined") {

    self.iColorInfo = selectedColor;
    self.iColorId = selectedColor.id;

  }


  // Se selecciona el color a mostrar
  if ((self.iColorId != null) && (self.iColorId != "")) {

    var defaultColorIfEmpty = undefined;
    // Se ha pasado un color como parÃ¡metro
    for (var i = 0; i < colors.length; i++) {

      if (!defaultColorIfEmpty) {
        if (colors[i].image)
          defaultColorIfEmpty = colors[i];
      }

      if (colors[i].id == self.iColorId) {
        self.iColorInfo = colors[i];
        break;
      }
    }

    // -- si no encuentra coincidencia pone el primero con imagen
    if (!self.iColorInfo) {
      self.iColorInfo = defaultColorIfEmpty;
    }
    self.iColorId = null;
  } else {

    if (colors && (colors.length > 0)) {
      $.each(colors, function (index, col) {
        if (col.image) {
          // -- se pinta el primer color con imagen
          self.iColorInfo = col;

          return false;
        }
      });
    }
  }
  //console.log('NVP-log self.iColorInfo', self.iColorInfo);
  //console.groupEnd();
};

ItxMobileProductPageClass.prototype._drawProductPriceDetailsCarrousel = function (product, element) {
  var self = this;

  var priceStr = '';
  var divPrices = $('<div></div>').attr({
    'class': 'prices'
  });
  var singlePrize = 0;



  if (product.type == 'BundleBean') {
    if (product.onSpecial) { //si es un producto bundle de tipo especial
      self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(product.bundleProductSummaries[0]);
    } else {
      self.rangeProductPrice = itxMobileRenderGrid.rangePriceBundleProduct(product);
    }
  } else {
    self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(product);
  }

  if (self.rangeProductPrice) {

    var oldPriceStr = '';
    var hasOldPrice = false;

    var capaFrom = $("<div></div>").addClass("fromprize");
    capaFrom.append(inditex.text("FROM"));

    var capaTo = $("<div></div>").addClass("fromprize");
    capaTo.append(inditex.text("TO"));

    var showMinRange = 0;


    if (self.rangeProductPrice.minPrice == undefined || self.rangeProductPrice.minPrice == null) {

      priceStr = inditex.text("product.no_price");
      singlePrize = 1;
    } else
    if (self.rangeProductPrice.minPrice == self.rangeProductPrice.maxPrice) {
      priceStr = inditex.formatPrice(self.rangeProductPrice.minPrice);
      singlePrize = 1;
    } else
      priceStr = inditex.text("FROM") + ' ' + inditex.formatPrice(self.rangeProductPrice.minPrice) + ' ' + inditex.formatPrice(self.rangeProductPrice.maxPrice);

    if (self.rangeProductPrice.minOldPrice) {
      hasOldPrice = true;
      // -- tiene precio antiguo
      if (self.rangeProductPrice.minOldPrice == self.rangeProductPrice.maxOldPrice)
        oldPriceStr = inditex.formatPrice(self.rangeProductPrice.minOldPrice);
      else
        oldPriceStr = inditex.text("FROM") + ' ' + inditex.formatPrice(self.rangeProductPrice.minOldPrice) + ' ' + inditex.formatPrice(self.rangeProductPrice.maxOldPrice) + '</br>';

    }

    //$(".prices").empty();
    element.find(".prices").empty();


    oldPriceStr = oldPriceStr.replace(new RegExp('&nbsp;', 'g'), '<span>');
    oldPriceStr = oldPriceStr.replace(new RegExp('&nbsp;', 'g'), '</span>');

    priceStr = priceStr.replace(new RegExp('&nbsp;', 'g'), '<span>');
    priceStr = priceStr.replace(new RegExp('&nbsp;', 'g'), '</span>');

    if (hasOldPrice) {
      var spanOldPrice = $('<span></span>').attr({
        'class': 'productOldPrice'
      }).append(oldPriceStr);
      divPrices.append(spanOldPrice);
      divPrices.addClass('oldPrice');
      var spanNewPrice = $('<span></span>').attr({
        'class': 'sale'
      }).append(priceStr);
      divPrices.append(spanNewPrice);
    } else {
      var spanPrice = $('<span></span>').attr({
        'class': 'actual'
      }).append(priceStr);
      self.precioGeneralProducto = priceStr;
      divPrices.append(spanPrice);
    }

  } else {

    var spanNoPrice = $('<span></span>').attr({
      'class': 'actual'
    }).append(inditex.text("product.no_price"));
    divPrices.append(spanNoPrice);
    self.precioGeneralProducto = priceStr;

  }

  return divPrices;
}

/**
 * [prototype_drawProductDetailsCarrousel colores y precios de un producto de carrousel]
 * @param  {[type]} producto [objeto]
 */
ItxMobileProductPageClass.prototype._drawProductDetailsCarrousel = function (producto) {

  var self = this;

  var element = $("#productInformation_" + producto.id + " .productDetails");


  /****************************
   *   precios
   *************************/

  var divPrices = self._drawProductPriceDetailsCarrousel(producto, element)
  element.append(divPrices);


  /****************************
   *   colores
   *************************/

  colors = producto.detail.colors;
  var url_color_id = "";

  if (producto.type == 'BundleBean') {
    if (producto.onSpecial) {
      colors = producto.bundleProductSummaries[0].detail.colors;
    } else {
      colors = producto.bundleColors;
    }
  }

  self.log && console.log('NVP-log _drawProductDetailsCarrousel', colors, producto.name, self.isBundleSpecial, self.isBundle);

  var divColors = $('<div></div>').attr({
    'class': 'color_palette'
  });

  $.each(colors, function (indexColor, color) {


    var enlace = $('<a></a>').attr({
      'href': 'javascript:;'
    });

    var activo = 0;

    if (!self.isBundleSpecial && url_color_id == "") {

      if (indexColor == 0) {
        enlace.addClass('active');
        activo = 1;
        self._drawAuxiliarTallas(color, producto);

      }
    } else { // si es un bundle de tipo especial el color se determina con el parametro que se pasa por url

      if (indexColor == 0) {
        enlace.addClass('active');
        activo = 1;
      }

      if (parseInt(color.id) == parseInt(url_color_id)) {
        enlace.addClass('active');
        activo = 1;

        self._drawAuxiliarTallas(color, producto);
      }

    }

    /***
    para cuando el color no se ha clickeado
    */
    var valores = $("#buttonAddCart_" + producto.id).data("currentData");


    valores.colorInfo = color;
    $("#buttonAddCart_" + producto.id).data("currentData", valores);

    enlace.data('currentData', {
      colorInfo: color,
      product: producto
    });


    enlace.data("producto", producto);

    var img = $('<img/>');


    if (color.image.style && color.image.style.length > 0) {
      var style = color.image.style[0];

      var imagenColorProducto = inditex.getProductImageUrls(_.clone(color.image), 3, 5, null, style)[0];
      img.attr('src', imagenColorProducto);


    } else {

      img.attr('src', inditex.getProductImageUrls(color.image, 3, 5)[0]);
    }

    styl = null;
    enlace.append(img);
    divColors.append(enlace);

    // bind para cambio de color
    enlace.hammer().on('tap', function (e) {

      e.preventDefault();

      var $this = $(this);
      $this.parent().find('a').removeClass('active');
      $this.addClass('active');

      var data = $this.data('currentData');

      if (data.product.onSpecial) {

        self.iColorInfo = data.colorInfo;
        self.iColorId = data.colorInfo.id;
        self.previousColor = self.iColorInfo;
        self._selectColor(data.product.bundleProductSummaries[0]);
        self.colorClickeado = true;

      } else {

        self.iColorId = data.colorInfo.id;
        self.iColorInfo = data.colorInfo;

        self.previousColor = self.iColorInfo;
        self._selectColor(data.product);
        self.colorClickeado = true;

      }


      var idproducto = data.product.id;

      if (self.isBundle) {

        var target = $('#formProductPage_' + data.product.id + ' div.producInformation');

        // -- imagenes
        self._drawProductCarrousel(target.children('.CarrouselContainer'), producto);

        // -- tallas
        self._drawSizes(target.find('.productMoreDetails'), data.colorInfo, data.product);

        // -- referencia, colores y tallas
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceBundleProduct(data.product);
        self._drawPrices(target.children('.productDetails'));
        self._selectSizeBinding();

        //TODO: Terminar

        self._drawButtons(target, data.product, data.colorInfo);

        self._buttonsBinding();

        // -- botones

      } else if (self.isBundleSpecial) {

        // Repintado de imagenes
        self._drawProductCarrousel($('#formProductPage_' + data.product.id + ' .producInformation .CarrouselContainer'), producto);

        // Repintado de tallas
        self._drawSizes($('.container.product .producInformation .productMoreDetails'));

        // Repintado de precios
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(self.iProductInfo.bundleProductSummaries[0]);

        self._drawPrices($('.container.product .producInformation .productDetails'));
        self._selectSizeBinding();

        // Repintado de botones
        self._drawButtons($('.container.product .producInformation'));

        self._buttonsBinding();

      } else {


        // Repintado de imagenes
        self._drawProductCarrousel($('#formProductPage_' + data.product.id + ' .producInformation').children('.CarrouselContainer'), producto);

        // Repintado de tallas
        self._drawSizes($('#formProductPage_' + data.product.id + ' .producInformation .productMoreDetails'), data.colorInfo, producto);

        // Repintado de precios
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(producto, null, data.colorInfo);

        self._drawPrices($('#formProductPage_' + data.product.id + ' .producInformation .productDetails'), null, producto, self.rangeProductPrice);
        self._selectSizeBinding();

        var currentData = {
          colorInfo: data.colorInfo,
          product: data.product
        };

        $("#buttonAddCart_" + idproducto).removeData();
        $("#buttonAddCart_" + idproducto).data("currentData", currentData);
        // Repintado de botones
        //self._drawButtons($('#formProductPage_' + data.product.id + ' .producInformation'),producto,data.colorInfo);

        self._buttonsBinding();
      }

      $("#productInformation_" + data.product.id + " .productMoreDetails").show("fast");

      // Tag manager
      $.event.trigger({
        type: 'productPage.selectColor',
        reference: self.iProductInfo.detail.reference,
        color: data.colorInfo.name
      });

    });
  });

  element.prepend(divColors);

  self._checkLegal();
};

ItxMobileProductPageClass.prototype._drawProductDetails = function (element) {
  var self = this;

  self._drawColors(element);
  self._drawPrices();
};

ItxMobileProductPageClass.prototype._drawPrices = function (element, value, producto, rangoPrecios) {

  var self = this;
  var priceStr = '';
  var divPrices = $('<div></div>').attr({
    'class': 'prices'
  });
  var singlePrize = 0;

  if (rangoPrecios) {
    self.rangeProductPrice = rangoPrecios;
  }
  if (self.rangeProductPrice) {

    if (producto) {

      if (producto.type === 'ProductBean' || producto.onSpecial) {
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(producto, null, producto.detail.colors[0]);
      } else {
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceBundleProduct(producto);
      }

      //self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(producto, null, self.iColorInfo);
    } else {
      if (self.currentProduct.type === 'ProductBean' || self.currentProduct.onSpecial) {
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(self.currentProduct, null, self.currentProduct.detail.colors[0]);
      } else {
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceBundleProduct(self.currentProduct);
      }
      //self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(self.currentProduct, null, self.iColorInfo);
    }



    var oldPriceStr = '';
    var hasOldPrice = false;

    var capaFrom = $("<div></div>").addClass("fromprize");
    capaFrom.append(inditex.text("FROM"));

    var capaTo = $("<div></div>").addClass("fromprize");
    capaTo.append(inditex.text("TO"));

    var showMinRange = 0;


    if (self.rangeProductPrice.minPrice == undefined || self.rangeProductPrice.minPrice == null) {

      priceStr = inditex.text("product.no_price");
      singlePrize = 1;
    } else
    if (self.rangeProductPrice.minPrice == self.rangeProductPrice.maxPrice) {
      priceStr = inditex.formatPrice(self.rangeProductPrice.minPrice);
      singlePrize = 1;
    } else
      priceStr = inditex.text("FROM") + ' ' + inditex.formatPrice(self.rangeProductPrice.minPrice) + ' ' + inditex.formatPrice(self.rangeProductPrice.maxPrice);

    if (self.rangeProductPrice.minOldPrice) {
      hasOldPrice = true;
      // -- tiene precio antiguo
      if (self.rangeProductPrice.minOldPrice == self.rangeProductPrice.maxOldPrice)
        oldPriceStr = inditex.formatPrice(self.rangeProductPrice.minOldPrice);
      else
        oldPriceStr = inditex.text("FROM") + ' ' + inditex.formatPrice(self.rangeProductPrice.minOldPrice) + ' ' + inditex.formatPrice(self.rangeProductPrice.maxOldPrice) + '</br>';

    }
    if (!value) {
      //if(singlePrize==1)
      //{
      if (producto) {
        $("#formProductPage_" + producto.id + " .prices").empty();
      } else {

      }
      //}
    }

    oldPriceStr = oldPriceStr.replace(new RegExp('&nbsp;', 'g'), '<span>');
    oldPriceStr = oldPriceStr.replace(new RegExp('&nbsp;', 'g'), '</span>');

    priceStr = priceStr.replace(new RegExp('&nbsp;', 'g'), '<span>');
    priceStr = priceStr.replace(new RegExp('&nbsp;', 'g'), '</span>');

    if (hasOldPrice) {
      var spanOldPrice = $('<span></span>').attr({
        'class': 'productOldPrice'
      }).append(oldPriceStr);
      divPrices.append(spanOldPrice);
      divPrices.addClass('oldPrice');
      var spanNewPrice = $('<span></span>').attr({
        'class': 'sale'
      }).append(priceStr);
      divPrices.append(spanNewPrice);
    } else {
      var spanPrice = $('<span></span>').attr({
        'class': 'actual'
      }).append(priceStr);
      self.precioGeneralProducto = priceStr;
      divPrices.append(spanPrice);
    }

  } else {

    var spanNoPrice = $('<span></span>').attr({
      'class': 'actual'
    }).append(inditex.text("product.no_price"));
    divPrices.append(spanNoPrice);
    self.precioGeneralProducto = priceStr;

  }
  if (value) {
    return divPrices;
  } else {
    if (producto) {
      $("#formProductPage_" + producto.id + " .productDetails").append(divPrices);
    } else {
      $("#formProductPage_" + self.iProductInfo.id + " .productDetails").append(divPrices);
    }

  }

  self._checkLegal();

};



ItxMobileProductPageClass.prototype._drawRelatedProductsCarrousel = function (productoCarrousel) {

  var self = this;

  if (productoCarrousel.type == "BundleBean" && productoCarrousel.onSpecial) {
    var idProducto = productoCarrousel.id;
    var idProductoPeticion = productoCarrousel.bundleProductSummaries[0].id;
    var colorSelectionado = self.iColorInfo.id;
    var relacionados = productoCarrousel.bundleProductSummaries[0];
    var aJson = productoCarrousel.bundleProductSummaries[0];

  } else {
    var idProducto = productoCarrousel.id;
    var idProductoPeticion = productoCarrousel.id
    var colorSelectionado = self.iColorInfo.id;
    var relacionados = productoCarrousel;
    var aJson = productoCarrousel;
  }


  Inditex.xRestGetProductDetail(idProductoPeticion, 0).done(function (aJson) {

    var InfoProducto = aJson;


    self.productoVisibleActivo = aJson;
    inditex.iXProductInfo = aJson;

    if (InfoProducto.detail.relatedProducts.length > 0) {


      $("#productInformation_" + idProducto + " .swiper-pagination-bullet").last().addClass("bx-pager-item-related");

      self.ProductosRelacionadosProducto[idProducto] = InfoProducto.detail.relatedProducts;

      $.each(InfoProducto.detail.relatedProducts, function (indexRelated, relacionado) {


        if (relacionado.type == 'BundleBean') { //si es un producto bundle de tipo especial
          relacionado = relacionado.bundleProductSummaries[0];

        }


        if (indexRelated < 4) { // como maximo 4 relacionados


          var bloque = $('<span></span>').addClass("elemento-relacionado");
          var contenido = "";
          var posiColor = 0;

          urlRelacionado = "";

          var urlOptions = {
            "storeId": Inditex.iStoreId,
            "langId": Inditex.iLangId,
            "catalogId": Inditex.iCatalogId,
            "productId": relacionado.id,
            "fromi": idProducto
          };
          urlOptions.categoryId = Inditex.iCategoryId;
          var urlRelacionado = Inditex.generateUrl("ItxProductPage", urlOptions);

          //var pEnlace = $("<a></a>").attr("href", urlRelacionado);
          var pEnlace = $("<span></span>");
          bloque.data("url-link", urlRelacionado);
          // -- imagen del producto

          $.each(relacionado.detail.colors, function (i, item) {
            if (item.id == colorSelectionado) {
              posiColor = i;
            }
          });

          var imagen_relacionado = relacionado.detail.colors[posiColor].image;

          var image1 = inditex.getProductImageUrls(imagen_relacionado, 1, 3);
          var imageZoom = inditex.getProductImageUrls(imagen_relacionado, 1, 1);

          $("<img/>").attr({
            "src": image1[0],
            'class': 'responsive img-relacionado',
            id: "prelated_" + relacionado.id
          }).data("url-relacionado", urlRelacionado).appendTo(pEnlace);

          pEnlace.appendTo(bloque);

          if ($("#formProductPage_" + idProducto + " #prelated_" + relacionado.id).length < 1) {

            $("#formProductPage_" + idProducto + " .relatedList").append(bloque);
          }

        }

      });


    } else {

      if (self.mSlidersImagenes[idProducto]) {
        var totalSlides = $("#productInformation_" + idProducto + " .swiper-pagination-bullet").length - 1;


        self.mSlidersImagenes[idProducto].removeSlide(totalSlides);
      }
      //$("#productInformation_" + idProducto + " .swiper-pagination-bullet").last().remove();
      //$("#productInformation_" + idProducto + " .relacionados-container").last().remove();


    }
    // oculta la capa de preloader
    // self._ShowLoaderProduct(productoCarrousel,0);





  });

}
ItxMobileProductPageClass.prototype._drawRelatedProducts = function (element, productoCarrousel) {

  var self = this;
  self.log && console.log('NVP-log _drawRelatedProducts element, productoCarrousel', element, productoCarrousel);
  var colorSelectionado = self.iColorInfo.id;

  if (productoCarrousel) {

  } else {

    // producto normal
    if (self.currentProduct.detail.relatedProducts.length > 0) {

      var idProducto = self.currentProduct.id;
      setTimeout(function () {
        $("#productInformation_" + idProducto + " .swiper-pagination-bullet").last().addClass("bx-pager-item-related");

      }, 1000);


      $.each(self.currentProduct.detail.relatedProducts, function (indexRelated, relacionado) {

        $("#productInformation_" + idProducto + " .swiper-pagination-bullet").last().addClass("bx-pager-item-related");


        if ((relacionado.type == 'BundleBean')) { //si es un producto bundle de tipo especial
          relacionado = relacionado.bundleProductSummaries[0];
        }


        // -- imagen del producto
        posiColor = -1;

        $.each(relacionado.detail.colors, function (i, item) {
          if (item.id == colorSelectionado) {
            posiColor = i;
          }
        });




        var bloque = $('<span></span>').addClass("elemento-relacionado");
        var contenido = "";
        var posiColor = 0;

        urlRelacionado = "";


        //Inditex.xRestGetProductDetail(relacionado.id, 0).done(function(aJson) {


        var urlOptions = {
          "storeId": Inditex.iStoreId,
          "langId": Inditex.iLangId,
          "catalogId": Inditex.iCatalogId,
          "productId": relacionado.id,
          "fromi": self.currentProduct.id
        };
        urlOptions.categoryId = Inditex.iCategoryId;
        var urlRelacionado = Inditex.generateUrl("ItxProductPage", urlOptions);


        //var pEnlace = $("<a></a>").attr("href", urlRelacionado);
        var pEnlace = $("<span></span>");
        bloque.data("url-link", urlRelacionado);

        var imagen_relacionado = relacionado.detail.colors[posiColor].image;

        var image1 = inditex.getProductImageUrls(imagen_relacionado, 1, 3);
        var imageZoom = inditex.getProductImageUrls(imagen_relacionado, 1, 1);


        $("<img/>").attr({
          "src": image1[0],
          'class': 'responsive img-relacionado',
          id: "prelated_" + relacionado.id
        }).data("url-relacionado", urlRelacionado).appendTo(pEnlace);

        pEnlace.appendTo(bloque);

        if ($("#formProductPage_" + self.currentProduct.id + " #prelated_" + relacionado.id).length < 1) {

          $("#formProductPage_" + self.currentProduct.id + " .relatedList").append(bloque);
        }

        // if( $("#formProductPage_"+self.currentProduct.id+" .relatedList").length<1){

        // $("#formProductPage_"+self.currentProduct.id+" .relatedList").append(bloque);
        //}


      });

    }

    if (productoCarrousel) {
      self._drawSocialShare(productoCarrousel);
      self._drawPlusInfo(productoCarrousel);
    } else {
      self._drawSocialShare(self.currentProduct);
      self._drawPlusInfo(self.currentProduct);
    }


  }


};

ItxMobileProductPageClass.prototype._drawSocialShare = function (product) {
  var self = this,
    tpl;


  tpl = inditex.xGetTemplate('socialSharingLinks');
  $("#formProductPage_" + product.id + " .CarrouselContainer").append(tpl);


  $('body').hammer().off('tap.show.social').on('tap.show.social', '.js-social', function (e) {
    $('.social_networks').slideToggle();
  });

  $(document).hammer().off('tap.social').on('tap.social', '.share_elements span', function () {
    var socialNetwork = $(this).attr('rel'),
      reference = product.detail.reference,
      size = $('#rel' + product.id + ' .product_sizes ul.sizes_list li.active').attr('id');
    if (socialNetwork !== 'email') {
      $.event.trigger({
        type: 'tagManager.setGenericAction',
        cf: 'social',
        category: 'ficha_producto',
        action: 'compartir_' + socialNetwork,
        label: reference,
        customData: {
          'dimension20': reference,
          'dimension96': undefined,
          'dimension97': size
        }
      });
    }
  });

  var itxSocial = new ItxMobileSocialNetworkController({
    "view": 0,
    "productId": self.iProductId,
    "isPopUp": false,
    "categoryId": self.iCategoryId

  });

};

/**
 * Dibuja el boton de moreinfo y aplica el evento
 * @param  {[type]}
 * @return {null}
 */
ItxMobileProductPageClass.prototype._drawPlusInfo = function (producto) {

  var self = this;
  var moreInfo = $("<p></p>").addClass("icon icon-ico-info InfoIcon").data("product", producto);
  var idProducto = producto.id;

  $("#formProductPage_" + idProducto + " .CarrouselContainer").append(moreInfo);
  self.log && console.log('NVP-log _drawPlusInfo', producto);

  moreInfo.hammer().off('tap');
  moreInfo.hammer().on('tap', function (event) {

    self.log && console.log('NVP-log clickado', producto);
    var producto = $(this).data("product");

    self._drawProductInfo(producto);

    $(".extrainfo").removeClass("hide");
    $(".extrainfo").addClass("top");

    //Inditex.openmodal();


    /**************************************************/
    //  comprobacion de si se permiten devoluciones
    ///************************************************/
    //inditex.iXconfVars = ["SHOW_RETURN_REQUEST", "SHOW_HOME_RETURN_REQUEST", "SHOW_FAVOURITE_STORES"];
    inditex.getXconfiguracionValue('SHOW_RETURN_REQUEST', function (data, value) {
      if (value == 0) {
        $("#menuDev_").remove();
      }
    });


  });

  $(".menu_extraInformation .close-info").hammer().off('tap');
  $(".menu_extraInformation .close-info").hammer().on('tap', function (e) {
    event.preventDefault();
    $(".extrainfo").removeClass("top");
    $(".extrainfo").addClass("hide");
  });

}


/**
 * [hammerIt pinch zoom de elementon]
 * @param  {[type]} elm [elemento al que aplicar los metodos]
 * @return {[type]}     [description]
 */
ItxMobileProductPageClass.prototype._hammerIt = function (elm) {


  var posX = 0,
    posY = 0,
    scale = 1,
    last_scale = 1,
    last_posX = 0,
    last_posY = 0,
    max_pos_x = 0,
    max_pos_y = 0,
    transform = "",
    el = elm;

  $(elm).css("position", "absolute");



  $(elm).hammer().on('doubletap pan pinch panend pinchend', function (ev) {


    $(elm).draggable();

    if (ev.type == "doubletap") {
      transform =
        "translate3d(0, 0, 0) " +
        "scale3d(2, 2, 1) ";
      scale = 2;
      last_scale = 2;
      try {
        if (window.getComputedStyle(el, null).getPropertyValue('-webkit-transform').toString() != "matrix(1, 0, 0, 1, 0, 0)") {
          transform =
            "translate3d(0, 0, 0) " +
            "scale3d(1, 1, 1) ";
          scale = 1;
          last_scale = 1;
        }
      } catch (err) {}
      this.style.webkitTransform = transform;
      transform = "";
    }

    //pan
    if (scale != 1) {
      posX = last_posX + ev.deltaX;
      posY = last_posY + ev.deltaY;
      max_pos_x = Math.ceil((scale - 1) * el.clientWidth / 2);
      max_pos_y = Math.ceil((scale - 1) * el.clientHeight / 2);
      if (posX > max_pos_x) {
        posX = max_pos_x;
      }
      if (posX < -max_pos_x) {
        posX = -max_pos_x;
      }
      if (posY > max_pos_y) {
        posY = max_pos_y;
      }
      if (posY < -max_pos_y) {
        posY = -max_pos_y;
      }
    }

    //pinch
    if (ev.type == "pinch") {
      scale = Math.max(.999, Math.min(last_scale * (ev.scale), 4));
    }
    if (ev.type == "pinchend") {
      last_scale = scale;
    }

    //panend
    if (ev.type == "panend") {
      last_posX = posX < max_pos_x ? posX : max_pos_x;
      last_posY = posY < max_pos_y ? posY : max_pos_y;
    }

    if (scale != 1) {
      transform =
        "translate3d(" + posX + "px," + posY + "px, 0) " +
        "scale3d(" + scale + ", " + scale + ", 1)";
    }

    if (transform) {
      this.style.webkitTransform = transform;
    }


  });

}

ItxMobileProductPageClass.prototype._drawProductCarrousel = function (element, producto) {
  var self = this;

  //if (self.mSlider) self.mSlider.destroy();
  element.empty();
  element.addClass('swiper-container');

  var ul = $('<div></div>').attr({
    'class': 'CarrouselImages bxslider swiper-wrapper',
    'id': 'carrousel_' + self.currentProduct.id
  });


  var pager = $('<div></div>').addClass('swiper-pagination');

  element.append(pager);


  if (self.iColorInfo.image && self.iColorInfo.image.style && self.iColorInfo.image.style.length > 0) {

    var style = self.iColorInfo.image.style[0];
    self.img = inditex.getProductImageUrls(_.clone(self.iColorInfo.image), 1, 3, null, style);
    var imgZoom = inditex.getProductImageUrls(_.clone(self.iColorInfo.image), 1, 1, null, style);
    ul.append(self._drawImageProductCarrousel(self.img, imgZoom));


    // Imagenes auxiliare
    var auxImages = inditex.getProductImageUrls(_.clone(self.iColorInfo.image), 2, 3, null, style);
    var auxImagesZoom = inditex.getProductImageUrls(_.clone(self.iColorInfo.image), 2, 1, null, style);


  } else {

    self.img = inditex.getProductImageUrls(self.iColorInfo.image, 1, 3);
    var imgZoom = inditex.getProductImageUrls(self.iColorInfo.image, 1, 1);
    ul.append(self._drawImageProductCarrousel(self.img, imgZoom));

    // Imagenes auxiliare
    var auxImages = inditex.getProductImageUrls(self.iColorInfo.image, 2, 3);
    var auxImagesZoom = inditex.getProductImageUrls(self.iColorInfo.image, 2, 1);


  }


  // Imagen principal
  $.each(auxImages, function (index, auxImg) {
    ul.append(self._drawImageProductCarrousel(auxImg, auxImagesZoom[index]));
    // Si no exite la imagen (404) eliminamos la slide
    ul.find('img').eq(index + 1).attr('src', auxImg).error(function () {
      ul.find('img').eq(index + 1).closest('.swiper-slide').remove();
    });
  });



  if (producto && producto.detail.relatedProducts.length || self.currentProduct.detail.relatedProducts.length) {

    var textoRelacionados = '<span class="title-related">' + inditex.text('ItxMobileProductPage.completatulook') + '</span>';
    var bloqueRelacionados = $("<div></div>").addClass("swiper-slide imgCarrouselContainter relacionados-container").html('<div class="relatedList"></div>').prepend(textoRelacionados);
    ul.append(bloqueRelacionados);

  }

  element.append(ul);

  idProducto = producto ? producto.id : self.iProductInfo.id;

  var targetPaginacion = $('#formProductPage_' + idProducto + ' .swiper-pagination');

  $("#productInformation_" + idProducto).find(".CarrouselContainer").removeClass("swiper-container-vertical");

  // se resetea el carrousel anterior, ya que se redibujan imagenes de distinto color
  //debugger;
  if (self.mSlidersImagenes[idProducto]) {

    self.mSlidersImagenes[idProducto].destroy(true, true);
    //self.mSlidersImagenes.splice(idProducto,1);
  }


  setTimeout(function () {

    self.mSlidersImagenes[idProducto] = new Swiper('#formProductPage_' + idProducto + ' .swiper-container', {
      direction: 'vertical',
      onInit: function () {


        if (producto) {
          self._drawRelatedProductsCarrousel(producto);


        } else {
          self._drawRelatedProducts();

        }

        if ($(".swiper-container-horizontal .activeProduct .relatedList .elemento-relacionado").length > 0) {
          var id = $(".swiper-container-horizontal .activeProduct").attr("id");
          id = id.replace("seccion_producto_", "");
          $("#formProductPage_" + id + " .swiper-pagination-bullet").last().addClass("bx-pager-item-related");
        }


        var altura = $("#seccion_producto_" + self.currentProduct.id).css("height");
        var altu = $("#seccion_producto_" + self.currentProduct.id + " .CarrouselContainer").css("height");

        $("#seccion_producto_" + self.currentProduct.id + " .CarrouselContainer").data("height", altu);

        if (producto) {
          $("#seccion_producto_" + producto.id).css("height", altura);
          $("#seccion_producto_" + producto.id).data("height", altura);
          $("#seccion_producto_" + producto.id + " .CarrouselContainer").css("height", altu);

          $("#seccion_producto_" + producto.id + " .CarrouselContainer").data("height", altu);
        }


      },
      onSlideChangeEnd: function () {
        var IdProducto = $("#contenedor-carrousel-productos .activeProduct").attr("id");
        IdProducto = IdProducto.replace("seccion_producto_", "");
        self._sliderPositionController(IdProducto);
      },
      onImagesReady: function () {

        if (producto) {
          self._drawSpecialBullet(producto);
        } else {
          self._drawSpecialBullet();
        }


      },
      onTap: function () {
        $(".elemento-relacionado").hammer().off("tap");
        $(".elemento-relacionado").hammer().on("tap", function (e) {
          var imagen = $(this).find("img");
          var url = imagen.data("url-relacionado");
          // Tag manager
          /* Se guarda el index del relacionado */
          var id = imagen.attr('id').split('_')[1];
          var relatedProducts = self.productoVisibleActivo.detail.relatedProducts,
            relatedProductIndex;
          for (var i = 0, l = relatedProducts.length; i < l; i++) {
            if (relatedProducts[i].id == id) {
              relatedProductIndex = i + 1
              break;
            }
          }
          window.sessionStorage.setItem('relatedProductIndex', relatedProductIndex);
          $.event.trigger({
            type: 'productPage.viewRelatedProduct',
            idRelatedProduct: id
          });
          window.location = url;
        });
      },
      pagination: targetPaginacion,
      preventClicks: true,
      paginationClickable: true

    });


  }, 400);


  // Anhadimos capa para zoom


  var capaZoom = $("<div></div>").addClass("zoom");
  capaZoom.append('<div class="closeZoom"><div class="icon icon-ico-close"></div></div><img class="zoomImage" src=""> </div>');
  //ul.parent().parent().append('<div class="zoom">');

  capaZoom.insertBefore($("#header"));

  //Bind muestra y cierre de ayuda
  var timer = null;
  var inDouble = false;
  ul.hammer().on('tap', function (event) {
    var $this = $(this);
    clearTimeout(timer);
    if (!inDouble) {
      timer = setTimeout(function () {
        $this.parent().parent().parent().find('div.AdviceCarrousel').fadeToggle();
      }, 500);
    }
    inDouble = false;
  });

  /*  adviceDiv.hammer().on('tap', function(event){
      $(this).fadeOut();
    });*/



  //ul.hammer().on('doubletap', function(event) {
  ul.find("img").hammer().off('click');
  ul.find("img").hammer().on('click', function (event) {


    inDouble = true;
    clearTimeout(timer);

    $(this).parent().parent().parent().find('div.AdviceCarrousel').fadeOut();

    var zoomDiv = $('div.zoom');
    var zoomClose = zoomDiv.find('div.closeZoom');
    var zoomImg = $(this).attr("zoomsrc");

    var zoomImg = zoomDiv.find('img');
    var imgSlide = $(this).find(".swiper-slide-active img");

    if (!imgSlide.data("url-relacionado")) {

      // Copiamos zoomSrc de imagen activa en el zoom
      zoomImg.attr('src', $(this).attr('zoomSrc'));

      inditex._setZoomDImensions(zoomDiv, zoomImg);

      zoomDiv.show();

      zoomImg.one('load', function () {
        // do stuff
        zoomDiv.scrollLeft((zoomImg.width() - zoomDiv.width()) / 2);
        //self._hammerIt(zoomImg);
      });

      $(window).off('orientationchange');
      $(window).on('orientationchange', function (event) {
        inditex._setZoomDImensions(zoomDiv, zoomImg);
      });

      // Mostrar icono de up al scrollar
      $(window).off('scroll');
      $(window).on('scroll', function () {
        inditex._setZoomDImensions(zoomDiv, zoomImg);
      });

      zoomImg.hammer().off("doubletap");
      zoomImg.hammer().on("doubletap", function (event) {
        event.preventDefault();
        var zoomDiv = $(this).parent();


        self._showItems();
        zoomDiv.hide();
      });

      zoomClose.hammer().off("tap");
      zoomClose.hammer().on("tap", function (event) {

        event.preventDefault();
        var zoomDiv = $(this).parent();
        if (zoomDiv.css("display") == "block") {

          setTimeout(function () {
            self._showItems();
          }, 100);

          zoomDiv.hide();
        }
        return false;
      });

      $('div.productMoreDetails').hide();
      $('div.productDetails').hide();
      $('div.menu_extraInformation').hide();
      $('.buttonsContainer').hide();
      $('div.footer.home').hide();
      $('div.headerContent').hide();
      $('div.bx-viewport').hide();


    } else {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });


  $("image[id^=prelated_]").hammer().on('click', function (event) {

    event.preventDefault();
    var urlRelatedProduct = $(this).data("url-relacionado");
    window.location = urlRelatedProduct;

  });

  self._carrouselSize();


  if (producto) {
    self._drawSocialShare(producto);
    self._drawPlusInfo(producto);
  }
};


ItxMobileProductPageClass.prototype._showItems = function () {

  $('div.productMoreDetails').show();
  $('div.productDetails').show();
  $('div.menu_extraInformation').show();
  $('.buttonsContainer').show();
  $('div.headerContent').show();
  $('div.bx-viewport').show();
};

ItxMobileProductPageClass.prototype._drawImageProductCarrousel = function (image, imageZoom, preload) {

  var self = this;

  var li = $('<div></div>').attr({
    'class': 'imgCarrouselContainter swiper-slide'
  });
  var div = $('<div></div>');

  $('<img/>').attr({
    'src': image,
    'zoomSrc': imageZoom
  }).appendTo(div);
  li.append(div);

  return li;

};

ItxMobileProductPageClass.prototype._drawProductMoreDetails = function (element) {

  var self = this;

  self._drawSizes(element);
  self._drawSizeGuide(element);

  // Pintamos el mspot de producto special
  element.append($('#mspotEspecial').html());

};



ItxMobileProductPageClass.prototype._drawColors = function (element) {

  var self = this;
  var colorsPrincipal = self.isBundleSpecial ? self.currentProduct.bundleProductSummaries[0].detail.colors : self.currentProduct.detail.colors;
  var style = null;

  var url_color_id = "";

  if (window.location.search) {
    var url_param = inditex.getUrlParameters(window.location.search);
    url_color_id = url_param["colorId"];
  }

  if (!url_color_id) {

    if (self.isBundleSpecial) {
      url_color_id = self.currentProduct.bundleProductSummaries[0].detail.colors[0].id;
      colorsPrincipal = self.currentProduct.bundleProductSummaries[0].detail.colors;
    } else if (self.isBundle) {
      url_color_id = self.currentProduct.bundleColors[0].id;
      colorsPrincipal = self.currentProduct.bundleColors;
    } else {
      url_color_id = self.currentProduct.detail.colors[0].id
    }
  }


  var divColors = $('<div></div>').attr({
    'class': 'color_palette'
  });

  $.each(colorsPrincipal, function (indexColor, color) {

    var enlace = $('<a></a>').attr({
      'href': 'javascript:;'
    });

    if (!self.isBundleSpecial && url_color_id == "") {
      if (indexColor == 0) {
        enlace.addClass('active');
        self._drawAuxiliarTallas(color, self.currentProduct);
      }
    } else { // si es un bundle de tipo especial el color se determina con el parametro que se pasa por url
      if (parseInt(color.id) == parseInt(url_color_id)) {
        enlace.addClass('active');
        self._drawAuxiliarTallas(color, self.currentProduct);
      }
    }

    enlace.data('currentData', {
      colorInfo: color,
      product: self.currentProduct
    });

    var img = $('<img/>');

    if (color.image.style && color.image.style.length > 0) {
      style = color.image.style[0];
      img.attr('src', inditex.getProductImageUrls(_.clone(color.image), 3, 5, null, style)[0]);

    } else {
      img.attr('src', inditex.getProductImageUrls(color.image, 3, 5)[0]);
    }
    style = null;


    enlace.append(img);
    divColors.append(enlace);


    // bind para cambio de color
    enlace.hammer().off('tap');
    enlace.hammer().on('tap', function (e) {
      e.preventDefault();



      var $this = $(this);
      $this.parent().find('a').removeClass('active');
      $this.addClass('active');

      var data = $this.data('currentData');

      if (data.product.onSpecial) {
        self.iColorInfo = data.colorInfo;
        self.iColorId = data.colorInfo.id;
        self.previousColor = self.iColorInfo;
        self._selectColor(data.product.bundleProductSummaries[0]);
        self.colorClickeado = true;

      } else {

        self.iColorId = data.colorInfo.id;
        self.iColorInfo = data.colorInfo;

        self.previousColor = self.iColorInfo;
        self._selectColor(data.product);
        self.colorClickeado = true;

      }



      var producto = data.product;

      var idproducto = data.product.id;



      if (self.isBundle) {

        var target = $('#formProductPage_' + data.product.id + ' div.producInformation');

        // -- imagenes
        self._drawProductCarrousel(target.children('.CarrouselContainer'), producto);

        // -- tallas
        self._drawSizes(target.find('.productMoreDetails'), data.colorInfo, data.product);

        // -- referencia, colores y tallas
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(data.product);
        self._drawPrices(target.children('.productDetails'));
        self._selectSizeBinding();

        //TODO: Terminar

        self._drawButtons(target, data.product, data.colorInfo);

        self._buttonsBinding();

        // -- botones

      } else if (self.isBundleSpecial) {

        // Repintado de imagenes
        self._drawProductCarrousel($('#formProductPage_' + data.product.id + ' .producInformation .CarrouselContainer'), producto);

        // Repintado de tallas
        self._drawSizes($('.container.product .producInformation .productMoreDetails'));

        // Repintado de precios
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(self.iProductInfo.bundleProductSummaries[0]);

        self._drawPrices($('.container.product .producInformation .productDetails'));
        self._selectSizeBinding();

        // Repintado de botones
        self._drawButtons($('.container.product .producInformation'));

        self._buttonsBinding();

      } else {

        // Repintado de imagenes
        self._drawProductCarrousel($('#formProductPage_' + data.product.id + ' .producInformation').children('.CarrouselContainer'), producto);

        // Repintado de tallas
        self._drawSizes($('#formProductPage_' + data.product.id + ' .producInformation .productMoreDetails'), data.colorInfo, producto);

        // Repintado de precios
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(producto, null, self.iColorinfo);
        //self._drawPrices($('#formProductPage_' + data.product.id + ' .producInformation .productDetails'),producto);
        self._drawPrices($('#formProductPage_' + data.product.id + ' .producInformation .productDetails'), null, producto, self.rangeProductPrice);


        self._selectSizeBinding();

        var currentData = {
          colorInfo: data.colorInfo,
          product: data.product
        };

        $("#buttonAddCart_" + idproducto).removeData();
        $("#buttonAddCart_" + idproducto).data("currentData", currentData);
        // Repintado de botones
        //self._drawButtons($('#formProductPage_' + data.product.id + ' .producInformation'),producto,data.colorInfo);

        self._buttonsBinding();
      }

      $("#productInformation_" + data.product.id + " .productMoreDetails").show("fast");

      // Tag manager
      $.event.trigger({
        type: 'productPage.selectColor',
        reference: self.iProductInfo.detail.reference,
        color: data.colorInfo.name
      });

    });
  });

  //element.prepend(divColors);

  $("#formProductPage_" + self.currentProduct.id + " .productDetails").prepend(divColors);

};



ItxMobileProductPageClass.prototype._checkAvailable = function (skuInfo, backSoon, stock) {
  var self = this;

  var estado = {};

  switch (skuInfo) {
    // Creado
  case "unknown":
    if (backSoon == 1) {
      estado.label = "coming_soon";
      estado.disable = 1;
    } else {
      estado.label = "sold_out";
      estado.disable = 1;
    }
    break;
    // no tiene stock
  case "out_of_stock":
    if (backSoon == 1) {
      estado.label = "back_soon";
      estado.disable = 1;
    } else {
      estado.label = "sold_out";
      estado.disable = 1;
    }
    break;


  }

}

ItxMobileProductPageClass.prototype._getProductAvailabilityMap = function (stocks, product) {
  var self = this;
  var map = {};
  var productColors = product.isBundleSpecial ? product.bundleProductSummaries[0].detail.colors : product.detail.colors;

  productColors.forEach(function (color) {
    color.sizes.forEach(function (size) {
      if (stocks) {
        var skuStock = stocks[0].stocks.filter(function (item) {
          return item.id == size.sku;
        });
      }

      map[size.sku] = {};
      if (skuStock[0].availability == "unknown") {
        if (size.backSoon == 1) {
          map[size.sku].label = "coming_soon";
          map[size.sku].disable = 1;
        } else {
          map[size.sku].label = "sold_out";
          map[size.sku].disable = 1;
        }
      } else if (skuStock[0].availability == "out_of_stock") {
        if (size.backSoon == 1) {
          map[size.sku].label = "back_soon";
          map[size.sku].disable = 1;
        } else {
          map[size.sku].label = "sold_out";
          map[size.sku].disable = 1;
        }
      } else if (skuStock[0].availability == "in_stock" && skuStock[0].typeThreshold == "OYSHO_UMBRAL_BAJO") {
        map[size.sku].label = "few_units";
        map[size.sku].disable = 0;
      } else {
        map[size.sku].label = "in_stock";
        map[size.sku].disable = 0;
      }

    });
  });
  return map;
};

ItxMobileProductPageClass.prototype._drawSizes = function (element, colorInfo, product) {

  var self = this;
  //console.group('NVP-log _drawSizes, element, colorInfo, product', element, colorInfo, product);


  var todosIgual = 1;
  var iColorInfo = colorInfo ? colorInfo : self.iColorInfo;
  var iProductInfo = product ? product : self.currentProduct;
  var totalTallasValidas = 0;

  var consultaStock = 0;


  if (product) {

    element = $("#formProductPage_" + product.id + " .productMoreDetails");
    var productId = product.id;
    if (!self.iVisibilityMapProducts[productId]) {
      self.iVisibilityMapProducts[productId] = {};
      self.iAvailabilityMapProducts[productId] = {};
      // -- se recupera el stock del producto
      inditex.xRestGetProductStock(productId).done(function (stock) {
        if (stock.length > 0) {
          var productsArray = new Array();
          productsArray.push(self.iProductInfo);
          self.iVisibilityMap = inditex.getProductVisibilityMap(productsArray, stock);
          self.iVisibilityMapProducts[productId] = self.iVisibilityMap;
          self.iAvailabilityMap = self._getProductAvailabilityMap(stock, product);
          self.iAvailabilityMapProducts[productId] = self.iAvailabilityMap;
          self._displaySizes(element, colorInfo, product);
        }
      });
    } else {
      self._displaySizes(element, colorInfo, product);
    }
  } else {
    element = $("#formProductPage_" + iProductInfo.id + " .productMoreDetails");
    if (iProductInfo.onSpecial == true) {
      iProductInfo = iProductInfo.bundleProductSummaries[0];
    }
    var productId = iProductInfo.id;
    if (!self.iVisibilityMapProducts[productId]) {
      self.iVisibilityMapProducts[productId] = {};
      self.iAvailabilityMapProducts[productId] = {};

      // -- se recupera el stock del producto
      inditex.xRestGetProductStock(productId).done(function (stock) {
        if (stock.length > 0) {
          var productsArray = new Array();
          productsArray.push(self.iProductInfo);
          self.iVisibilityMap = inditex.getProductVisibilityMap(productsArray, stock);
          self.iVisibilityMapProducts[productId] = self.iVisibilityMap;
          self.iAvailabilityMap = self._getProductAvailabilityMap(stock, iProductInfo);
          self.iAvailabilityMapProducts[productId] = self.iAvailabilityMap;
          self._displaySizes(element, colorInfo, product);
        }
      });
    } else {
      self._displaySizes(element, colorInfo, product);
    }
  }

  //console.groupEnd();

};



ItxMobileProductPageClass.prototype._displaySizes = function (element, colorInfo, product) {
  var self = this;

  var todosIgual = 1;
  var iColorInfo = colorInfo ? colorInfo : self.iColorInfo;
  var iProductInfo = product ? product : self.currentProduct;
  var totalTallasValidas = 0;

  if (iProductInfo.onSpecial == true) {


    iProductInfo = iProductInfo.bundleProductSummaries[0];
    productId = iProductInfo.id;

    if (!self.iVisibilityMapProducts[iProductInfo.id]) {

      inditex.xRestGetProductStock(productId).done(function (stock) {

        if (stock.length > 0) {

          var productsArray = new Array();
          productsArray.push(self.iProductInfo);

          self.iVisibilityMap = inditex.getProductVisibilityMap(productsArray, stock);
          self.iVisibilityMapProducts[productId] = self.iVisibilityMap;

          self.iAvailabilityMap = self._getProductAvailabilityMap(stock, product);
          self.iAvailabilityMapProducts[productId] = self.iAvailabilityMap;

        }

      });
    }

  }
  var divContainer = $('<div></div>').attr({
    'class': 'sizeSelectorContainer'
  });
  var newDiv = true;

  if (element.children('.sizeSelectorContainer').length > 0) {
    divContainer = element.children('.sizeSelectorContainer');
    divContainer.children().remove();
    newDiv = false;
  }

  var ContenedorTallajes = $("<div></div>").addClass("containerSizes");
  var tallajes = $('<ul></ul>').attr({
    'id': 'sizeSelect_' + iProductInfo.id,
    'name': 'size'
  });

  //console.log('NVP-log antes del error', iColorInfo.sizes, self.iVisibilityMap);

  if (iColorInfo && iColorInfo.sizes && (iColorInfo.sizes.length > 0)) {

    var uniqueSizes = inditex.ixGetUniqueSizes(iColorInfo.sizes, self.iVisibilityMap);
    var firstSizePrize = null;
    var aPrimero = 0;

    $.each(uniqueSizes, function (indexSizes, size) {

      if (indexSizes == 0) {
        aPrimero = size.price;
      }
      if (size.price !== aPrimero) {
        todosIgual = 0;
      }
    });


    $.each(uniqueSizes, function (indexSizes, size) {

      var value = '';
      var showPrecio = 0;
      var estadoLabel = "";
      if (size.description) {
        value += size.description + "/";
      }

      value += size.name;


      sizePrize = inditex.formatPrice(size.price);

      if (firstSizePrize != sizePrize) {
        firstSizePrize = sizePrize;
        showPrecio = 1;
      }

      sizePrize = sizePrize.replace(new RegExp('&nbsp;', 'g'), '<span>');
      sizePrize = sizePrize.replace(new RegExp('&nbsp;', 'g'), '</span>');


      sizeOldPrize = inditex.formatPrice(size.oldPrice);
      sizeOldPrize = sizeOldPrize.replace(new RegExp('&nbsp;', 'g'), '<span>');
      sizeOldPrize = sizeOldPrize.replace(new RegExp('&nbsp;', 'g'), '</span>');

      var option = '';
      var disabled = 0;


      if ((self.iVisibilityMapProducts[iProductInfo.id][size.sku] == "sold_out") ||
        (self.iVisibilityMapProducts[iProductInfo.id][size.sku] == "back_soon") ||
        (self.iVisibilityMapProducts[iProductInfo.id][size.sku] == "coming_soon") ||
        (self.iVisibilityMapProducts[iProductInfo.id][size.sku] == "hidden")) {
        estadoLabel = self.iVisibilityMapProducts[iProductInfo.id][size.sku];
        disabled = 1;
      }


      // comprobacion de availa
      var sizeAvailable = self.iAvailabilityMapProducts[iProductInfo.id][size.sku];
      if (sizeAvailable.disable == 1) {
        disabled = 1;
      }



      if (disabled == 0) {

        capaTalla = $("<li></li>").addClass("medida").attr({
          'data-value': iProductInfo.id + '_' + iColorInfo.id + '_' + size.sku
        });
        capaTalla.data('size', size);
        capaTalla.data('product', iProductInfo);
        capaTalla.data('color', iColorInfo);

        capaMedida = $("<div></div>").addClass("infoTalla").attr({
          'data-value': iProductInfo.id + '_' + iColorInfo.id + '_' + size.sku
        });
        capaMedida.data('product', iProductInfo);
        capaMedida.data('color', iColorInfo);

        if (sizeAvailable.label == "few_units") {
          capaMedida.append('<span>' + value + ' ' + inditex.text(sizeAvailable.label) + ' </span>');
        } else {
          capaMedida.append('<span>' + value + ' </span>');
        }


      } else {
        capaTalla = $("<li></li>").addClass("medida sold_out").attr({
          'data-value': iProductInfo.id + '_' + iColorInfo.id + '_' + size.sku
        });
        capaTalla.data('size', size);
        capaTalla.data('product', iProductInfo);
        capaTalla.data('color', iColorInfo);

        capaMedida = $("<div></div>").addClass("infoTalla");
        capaMedida.data('product', iProductInfo);
        capaMedida.data('color', iColorInfo);


        if (estadoLabel == "coming_soon" || estadoLabel == "back_soon") {
          var capaReserva = $("<span></span>");
          var valorTalla = $("<span></span>").html(value);

          var capaReservaInterior = $("<span></span>").addClass("reserva");
          var icono = $("<span></span>").addClass("icon icon-ico-news");

          var texto = $("<span></span>").addClass("reservaText").html(inditex.text("ItxMobileProductPage.loquiero"));
          texto.data("size", size);
          texto.data("product", iProductInfo);
          texto.data("color", iColorInfo);

          capaReservaInterior.append(icono);
          capaReservaInterior.append(texto);

          capaReserva.append(valorTalla);
          capaReserva.append(capaReservaInterior);


          capaMedida.append(capaReserva);
          //capaMedida.append('<span>' + value + '<span><span class="reserva"><span class="icon icon-ico-news"></span><span class="reservaText">' + + '</span></span></span>');
        } else {
          capaMedida.append('<span>' + value + ' ' + inditex.text(sizeAvailable.label) + ' ' + estadoLabel + '</span>');
        }

      }

      totalTallasValidas++;

      capaPrecio = $("<div><div>").addClass("prizeTalla");

      if (showPrecio == 0) {
        capaPrecio.addClass("oculto");
      }
      if (todosIgual == 1) {

        sizePrize = "";

      } else {

        if (self.colorClickeado == true) {
          $(".actual").html('');
        }

      }

      capaPrecio.append(sizePrize);

      capaTalla.append(capaMedida);
      capaTalla.append(capaPrecio);

      tallajes.append(capaTalla);
    });



    if (totalTallasValidas > 5) {
      var flechaup = $("<span></span>").addClass("flechaup");
      var flechadown = $("<span></span>").addClass("flechadown");
    }
  }

  // Contenedor para mensaje de error
  var divError = $('<div></div>').attr({
    'class': 'formMessage'
  });

  var divSelector = $('<div></div>').attr({
    'class': 'sizeSelector'
  });

  if (flechaup) {
    divSelector.append(flechaup);
  }

  ContenedorTallajes.append(tallajes);
  divSelector.append(ContenedorTallajes);

  if (flechadown) {
    divSelector.append(flechadown);
  }

  divContainer.append(divSelector);
  divContainer.append(divError);

  if (newDiv)
    element.prepend(divContainer);

  self._bindingsTallas();

  if (todosIgual == 0) {
    if (product) {


      if ($(element).css("display") == "block") {
        $(element).find(".productDetails .actual").empty();
        setTimeout(function () {

        }, 300);
      }

    } else {

      if ($(".productMoreDetails").css("display") == "block") {
        $(".productDetails .actual").empty();
        setTimeout(function () {

        }, 300);
      }

    }


  }

}



ItxMobileProductPageClass.prototype._sawButtonLoquiero = function () {
  var self = this;

  $("div[id^=buttonAddCart_]").addClass("hide");
  $("div[id^=buttonWant_]").removeClass("hide");
}

ItxMobileProductPageClass.prototype._hideButtonLoquiero = function () {
  var self = this;

  //$("div[id^=buttonWant_]").addClass("hide");
  //$("div[id^=buttonAddCart_]").removeClass("hide");
}

/**
 * [_desactivarReserva vuelve a activar las tallas y muestra el boton de comprara]
 * @return {[type]} [description]
 */
ItxMobileProductPageClass.prototype._desactivarReserva = function () {
  var self = this;

  $(".activeProduct .containerSizes .tallaInactiva").removeClass("tallaInactiva");
  $(".activeProduct .reservaCorrecta").fadeOut();

  $(".activeProduct div[id^=buttonWant_]").addClass("hide");
  $(".activeProduct div[id^=buttonAddCart_]").removeClass("hide");


}


/**
 * [_abrirReservaProducto Abre la capa para reservar cuando es coming soon o backsoon]
 * @param  {[type]} producto
 * @param  {[type]} color
 * @param  {[type]} talla
 */
ItxMobileProductPageClass.prototype._abrirReservaProducto = function (producto, color, talla) {

  var self = this;
  /*console.log("producto", producto);
  console.log("color", color);
  console.log("talla", talla);*/

  $(".activeProduct div[id^=buttonAddCart_]").addClass("hide");
  $(".activeProduct div[id^=buttonWant_]").removeClass("hide").addClass("disable");

  $(".activeProduct div[id^=buttonWant_]").data("producto", producto);
  $(".activeProduct div[id^=buttonWant_]").data("color", color);
  $(".activeProduct div[id^=buttonWant_]").data("talla", talla);


  // se desactivan el resto de tallas
  $(".activeProduct .containerSizes li:not(.sold_out)").addClass("tallaInactiva");



  $(".activeProduct .divWant").remove();
  var FormLoquiero = $("<div></div>").addClass("divWant");
  var FrmLogquiero = $("<form></form>").attr("name", "FrmLoquiero");

  var Mensaje = $("<span></span>").addClass("mensaje").html(inditex.text("ItxMobileProductPage.titleReserva"));

  var InputNombre = $("<input></input>").addClass("validate[required] boxSize nombreReserva").attr({
    "name": "nombreReserva",
    "placeholder": "Nombre",
    "id": "nombreReserva",
    "tabindex": 1
  });
  if (inditex.iUserJSON && inditex.iUserJSON.userType == "R") {
    InputNombre.val(inditex.iUserJSON.firstName);
    InputNombre.addClass("oculto");
  }


  var Input = $("<input></input>").addClass("validate[required,custom[email]] boxSize emailReserva").attr({
    "name": "emailReserva",
    "placeholder": "Email",
    "id": "emailReserva",
    "tabindex": 2

  });

  $(".activeProduct div[id^=buttonWant_]").attr("tabindex", 3);

  FrmLogquiero.append(Mensaje);
  FrmLogquiero.append(InputNombre);
  FrmLogquiero.append(Input);

  FormLoquiero.append(FrmLogquiero);


  $("li[data-value=" + producto.id + "_" + color.id + "_" + talla.sku + "]").append(FormLoquiero);

  $('form[name="FrmLoquiero"]').validationEngine({
    addFailureCssClassToField: "error",
    validationEventTrigger: "keyup"
  });


  $(".emailReserva").hammer().off("keyup");
  $(".emailReserva").hammer().on("keyup", function (event) {


    if ($('form[name="FrmLoquiero"]').validationEngine("validate")) {

      $(".activeProduct div[id^=buttonWant_]").removeClass("disable");

      $(".activeProduct div[id^=buttonWant_]").hammer().off("tap");
      $(".activeProduct div[id^=buttonWant_]").hammer().on("tap", function (event) {


        var producto = $(this).data("producto");
        var color = $(this).data("color");
        var talla = $(this).data("talla");

        var categoryId = inditex.iCategoryId;
        var productId = producto.id;
        skuId = talla.sku;

        var emailReserva = $("#emailReserva").val();
        var nombreReserva = $("#nombreReserva").val();

        inditex.xRestRequestStockNotification(categoryId, productId, skuId, emailReserva, 1, nombreReserva).done(function () {

          $(".activeProduct .divWant").empty();
          var capaResultado = $("<div></div>").addClass("reservaCorrecta");

          var mensaje = $("<span></span>").html(inditex.text("ItxMobileProductPage.reservaRealizada"));
          var icono = $("<span></span>").addClass("addedOk-img");
          capaResultado.append(icono);
          capaResultado.append(mensaje);

          $(".activeProduct .divWant").html(capaResultado);

          setTimeout(function () {

            self._desactivarReserva();

          }, 2000);

          $(".activeProduct .divWant").hammer().off("tap");
          $(".activeProduct .divWant").hammer().on("tap", function (evet) {
            self._desactivarReserva();
          });
        });
      });
    } else {

      $(".activeProduct div[id^=buttonWant_]").hammer().off("tap");
      $(".activeProduct div[id^=buttonWant_]").addClass("disable");

    }

  });

}

ItxMobileProductPageClass.prototype._bindingsTallas = function () {

  var self = this;

  var iColorInfo = self.iColorInfo;
  var iProductInfo = self.currentProduct;

  colorInfo = iColorInfo;


  // apertura del formulario de reservar
  $(".reservaText").hammer().off("tap");
  $(".reservaText").hammer().on("tap", function (event) {

    var Producto = $(this).data("product");
    var Color = $(this).data("color");
    var Talla = $(this).data("size");
    self._abrirReservaProducto(Producto, Color, Talla);

  });

  $("[id^=sizeSelect_] li.medida").hammer().off("tap");
  $("[id^=sizeSelect_] li.medida").hammer().on("tap", function (e) {

    var idpadre = $(this).parent().attr("id");;


    // si la talla no esta inactiva por que se abrio la reserva
    if (!$(this).hasClass("tallaInactiva")) {

      idpadre = idpadre.replace("sizeSelect_", "");
      $(".loquiero").remove();


      $("#sizeSelect_" + idpadre + " li.medida").removeClass("selected");
      if (!$(this).hasClass("sold_out")) {

        self._hideButtonLoquiero();
        $(this).find('.infoTalla').append('<span class="msg">' + inditex.text('ItxMobileProductPage.adding.to.cart') + '</span>');
        var valor = $(this).attr("data-value");
        $(this).addClass("selected");

        //console.log('NVP-log valor - idpadre', valor, idpadre);
        self.TallaSelected = valor;
        self.log && console.log('NVP-log button 8');
        var spanButtonBuy = $('<span></span>').attr({
          'class': 'textButton'
        }).append(inditex.text('BUTTON_ADD_TO_CART'));


        if ($("#buttonAddCart_" + idpadre).length > 0) {


          $("#buttonAddCart_" + idpadre).empty().removeClass('inactive');
          $("#buttonAddCart_" + idpadre).append(spanButtonBuy);
          $("#buttonAddCart_" + idpadre).data("TallaSelected", valor);
          $("[id=ishop_product]").addClass("active");

          $("#buttonAddCart_" + idpadre).trigger("tap"); // add producto to basket auto

        } else {

          var botton = $(".activeProduct").find($("[id^=buttonAddCart_]")).attr("id");
          var idpadre = botton.replace("buttonAddCart_", "");


          $("#buttonAddCart_" + idpadre).empty().removeClass('inactive');
          $("#buttonAddCart_" + idpadre).append(spanButtonBuy);
          $("#buttonAddCart_" + idpadre).data("TallaSelected", valor);
          $("[id=ishop_product]").addClass("active");

          $("#buttonAddCart_" + idpadre).trigger("tap"); // add producto to basket auto

        }

        // Tag manager
        $.event.trigger({
          type: 'productPage.selectSize',
          reference: iProductInfo.detail.reference,
          label: iProductInfo.detail.reference + '_' + $(this).find('span').text(),
          size: $(this).find('span').text()
        });

      }

    }

  });

  $(".flechaup").hammer().on('tap', function (e) {

    $('.flechadown').css('visibility', 'visible');

    var ntop = ($('.containerSizes').scrollTop()) - 40;

    if (ntop <= 0) {
      $('.flechaup').css('visibility', 'hidden');
    };

    $('.containerSizes').animate({
      scrollTop: ntop
    }, 200);

  });

  $(".flechadown").hammer().on('tap', function (e) {

    $('.flechaup').css('visibility', 'visible');

    var ntop = ($('.containerSizes').scrollTop()) + 40;
    var sizeContainerHeight = $('ul[id^=sizeSelect_]').height();

    if ((160 + ntop) >= sizeContainerHeight) {
      $('.flechadown').css('visibility', 'hidden');
    };

    $('.containerSizes').animate({
      scrollTop: ntop
    }, 200);

  });

  jQuery(
    function ($) {
      $('.containerSizes').bind('scroll', function (e) {
        e.preventDefault();
        if ($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
          $('.flechadown').css('visibility', 'hidden');
        } else {
          $('.flechadown').css('visibility', 'visible');
        }

        var ntop = $('.containerSizes').scrollTop();
        if (ntop === 0) {
          $('.flechaup').css('visibility', 'hidden');
        } else {
          $('.flechaup').css('visibility', 'visible');
        };
      })
    }
  );
}


ItxMobileProductPageClass.prototype._drawSizeGuide = function (element) {

  var self = this;

  var html = "<a id='sizeGuideLink'><span>" + inditex.text('SIZE_GUIDE').toUpperCase() + "</span></a>";

  $("#menuGuide_").html(html);
  element.append(html);

  $('#sizeGuideLink').hammer().off('tap').on('tap', function () {

    var url = inditex.generateUrl("ItxMobileSizeGuidePage", {
      "storeId": inditex.iStoreId,
      "langId": inditex.iLangId,
      "catalogId": inditex.iCatalogId,
      "categoryId": inditex.iCategoryId
    });

    inditex.popupUrlAnimated(url, function () {
      new ItxMobileSizeGuidePageClass();

      $(".SizeGuide").css("background", "#fff");
      var capaTallas = $(".content").eq(-1);
      capaTallas.css("width", "100%");


      $(".SizeGuide").parent().css("width", "100%");
      var pFirstContent = $("#title-tallas").prev();
      pFirstContent.css("width", "100%");

      var $contentWrapper = $('.content');
      $contentWrapper = $contentWrapper.eq($contentWrapper.length - 1);
      $contentWrapper.css("width", "100%");

      $contentWrapper.parent().parent().css("width", "100%");

      $(window).on('orientationchange', function () {
        var ancho = screen.width;
        $("#iContent").css("left", "-" + ancho + "px");
      });

    }, undefined);

  })

  $(".SizeGuide").off('orientationchange').on('orientationchange', function () {
    console.log('se ha girado');

  });

};


ItxMobileProductPageClass.prototype._drawProductRefeference = function (product, index) {
  var self = this;
  if (!index) {
    index = 0;
  }

  if (product.detail.displayReference) {
    referencia = product.detail.displayReference;
    if ($('#menuInfo_' + index).find("span:first").find(".reference").length > 0) {
      var refere = $('#menuInfo_' + index).find("span:first").find(".reference");
      refere.empty().html("REF. " + referencia);
    } else {
      $('#menuInfo_' + index + ' span:first').append(" <span class='reference'>REF. " + referencia + "</span");
    }

  }

}

ItxMobileProductPageClass.prototype._drawLongDescription = function (product, index) {
  var self = this;
  if (!index) {
    index = 0;
  }

  var container = $('#menuInfo_' + index + ' #descInfo .descInfo_content');
  var descripcion_larga = product.detail.longDescription ? product.detail.longDescription : product.name;
  var desc = $('<p></p>').append(descripcion_larga);
  container.empty().append(desc);

}


ItxMobileProductPageClass.prototype._bindProductAvailability = function () {
  var self = this;
  if (self.iStore.details.availabilityStockStore) {
    // Enlace ver disponibilidad
    $('a[id^="buttonShowAvail_"]').hammer().off('tap');
    $('a[id^="buttonShowAvail_"]').hammer().on('tap', function (event) {
      event.preventDefault();

      var url = inditex.generateUrl("ItxMobileStoreStockPage", {
        "storeId": inditex.iStoreId,
        "langId": inditex.iLangId,
        "catalogId": inditex.iCatalogId
      });

      var data = $(this).data('currentData'),
        size = ($('#sizeSelect_' + data.product.id + ' li.selected').find('span').text() != '') ?
        $('#sizeSelect_' + data.product.id + ' li.selected').find('span').text().trim() : undefined;

      inditex.popupUrlAnimated(url, function () {
        // NVPODEL data.colorInfo.id = "327";
        new ItxMobileStoreStockPageClass(data.product, data.colorInfo.id);

        $(".content-store-stock-product").css("width", "100%");
        $(".producInformation").css("padding-top", "1em");



        $(".producInformation").css("padding-top", "1em");
        $(".SizeGuide").css("background", "#fff");
        var capaTallas = $(".content").eq(-1);
        capaTallas.css("width", "100%");

        $(".SizeGuide").parent().css("width", "100%");
        var pFirstContent = $("#title-tallas").prev();
        pFirstContent.css("width", "100%");


        var $contentWrapper = $('.content');
        $contentWrapper = $contentWrapper.eq($contentWrapper.length - 1);
        $contentWrapper.css("width", "100%");


        $contentWrapper.parent().parent().css("width", "100%");


      }, undefined);

      $(window).on('orientationchange', function () {
        var ancho = screen.width;
        $("#iContent").css("left", "-" + ancho + "px");
      });

      // Tag manager
      $.event.trigger({
        type: 'productPage.viewAvailability',
        size: size,
        color: data.colorInfo.name
      });

    });
  }

}


ItxMobileProductPageClass.prototype._drawShopAvailability = function (product, index, isBundle) {
  var self = this;

  // Boton availability
  var divButtonCenter = $('<div></div>').attr({
    'class': 'button_center button_available'
  });
  var colorActivo = $(".activeProduct .color_palette .active");

  var colorInfo = colorActivo.data("currentData");
  colorInfo = colorInfo.colorInfo;

  if (isBundle) {
    var color = _.find(product.detail.colors, function (color) {
      return color.id === colorInfo.id;
    });
    if (!color) {
      colorInfo = product.detail.colors[0];
    }
  }



  var aButtonAvail = $('<a></a>').attr({
    'id': 'buttonShowAvail_' + product.id,
    'class': 'buttonText Big Productpage',
    'href': 'javascript:;'
  });
  if (self.iStore.isOpenForSale == false) {
    aButtonAvail.removeClass('buttonText').addClass('button_primary');
  }
  aButtonAvail.data('currentData', {
    colorInfo: colorInfo,
    product: product
  });
  self.log && console.log('NVP-log button 9');
  var spanButtonAvail = $('<span></span>').attr({
    'class': 'textButton'
  }).append(inditex.text('BUTTON_AVAILABILITY'));

  var spanButtonAvailName = $('<span></span>').addClass('name').append(product.name);
  spanButtonAvail.append(spanButtonAvailName);
  aButtonAvail.append(spanButtonAvail);

  divButtonCenter.append(aButtonAvail);

  //$(".buttonsContainer").append(divButtonCenter);


  $('#menuDisponi_' + index).html(aButtonAvail);
}


ItxMobileProductPageClass.prototype._drawProductInfo = function (product) {

  var self = this;
  var isBundleSpecial = false;
  var isBundle = false;
  var products = [];
  var descripcion_larga;
  self.log && console.log('NVP-log drawing product extra info', product);
  if (product) {
    isBundleSpecial = product.type === "BundleBean" && product.onSpecial;
    isBundle = product.type === "BundleBean" && !product.onSpecial;

    if (isBundleSpecial) {
      products.push(product.bundleProductSummaries[0]);
      $('#menuInfo_1').remove();
    } else if (isBundle) {
      $('#menuInfo_1').remove();
      products = product.bundleProductSummaries;
      var additionalInfoElement = $('#menuInfo_0').clone(true).attr('id', 'menuInfo_1');
      additionalInfoElement.insertAfter($('#menuInfo_0'));

      //additionalInfoElement.attr('id', 'menuInfo_1');
    } else {
      products.push(product);
      $('#menuInfo_1').remove();
    }

    _.each(products, function (product, index) {

      self.log && console.log('NVP-log drawing info', product);
      self._drawProductRefeference(product, index);
      self._drawLongDescription(product, index);
      self._drawComposition(product, index)
      self._drawCompositionByZone(product, index);
      self._drawCare(product, index);
    })


    // Adjuntamos contenido de mspot de envio
    $('#menuEnvio_ ul.left_submenu').html($('#mspotShipping').html());
    // Adjuntamos contenido de mspot de devolucion
    $('#menuDev_ ul.left_submenu').html($('#mspotReturn').html());


    if (self.iStore.details.availabilityStockStore) {

      if (isBundleSpecial) {
        $('#menuDisponi_1').remove();
      } else if (isBundle) {
        $('#menuDisponi_1').remove();
        $('#menuDisponi_0').clone(true).attr('id', 'menuDisponi_1').insertAfter($('#menuDisponi_0'));
      } else {
        $('#menuDisponi_1').remove();
      }

      _.each(products, function (product, index) {
        self._drawShopAvailability(product, index, isBundle);
      })

      self._bindProductAvailability();


    }


  }
};

ItxMobileProductPageClass.prototype._drawComposition = function (product, index) {
  var self, compositionText, orderedArray, part;

  self = this;
  compositionText = "";
  //var product = self.isBundleSpecial ? self.iProductInfo.bundleProductSummaries[0] : self.currentProduct;
  // Se hace una copia del array y se ordena por "part".
  orderedArray = product.detail.composition;
  orderedArray.sort(function (a, b) {
    return a.part - b.part;
  });

  // Se da por hecho que los compuestos vienen ordenados por partes.
  for (var i = 0; i < orderedArray.length; i++) {
    if (i == 0) {
      part = orderedArray[i].part;
      compositionText = inditex.text("compositionPart_" + product.productType + "_" + part) + ": ";
    } else {
      if (part != orderedArray[i].part) {
        // La parte ha cambiado (salto de lï¿½nea)
        part = orderedArray[i].part;
        compositionText += "<br />" + inditex.text("compositionPart_" + product.productType + "_" + part) + ": ";
      } else {
        // La parte sigue siendo la misma
        compositionText += ", ";
      }
    }

    compositionText +=
      (product.detail.composition[i].composition[0].percentage + "%" + " " + product.detail.composition[i].composition[0].name);
  }
  var comp = $('<p></p>').append(compositionText);
  $('#menuInfo_' + index + ' #compInfo .compInfo_content').html(comp);
};


ItxMobileProductPageClass.prototype._drawCompositionByZone = function (product, index) {
  var self = this;
  var compositionText = "";
  var compositionByZone = product.detail.compositionByZone

  if (compositionByZone ==! undefined || compositionByZone ==! null) {
  // Accedemos a cada subnivel del objeto
   _.each(compositionByZone, function (composition) {
    compositionByZoneText = Inditex.text("compositionPart_" + product.productType + "_" + composition.part.split('part')[1]) + ": " + "<br />";
    _.each(composition.zones, function (zone) {
      compositionByZoneText += zone.zoneName + "<br />";
      _.each(zone.composition, function (zoneComposition) {
        compositionByZoneText += zoneComposition.percentage + " " + "%" + " " + zoneComposition.name + "<br />";
      });
    });
  });

  var comp = $('<p></p>').append(compositionByZoneText);
  $('#menuInfo_' + index + ' #compInfo .compInfo_content').html(comp);
 }
}

ItxMobileProductPageClass.prototype._drawCare = function (product, index) {
  var self = this;
  $('#menuInfo_' + index + ' #careInfo .careInfo_content').empty();
  for (var i = 0; i < product.detail.care.length; i++) {
    careImg = $("<img />");
    careImg.attr("src", inditex.generateCareImageUrl(product.detail.care[i].name, "png"));
    $('#menuInfo_' + index + ' #careInfo .careInfo_content').append(careImg);
  }

};


ItxMobileProductPageClass.prototype._drawButtons = function (element, product, color) {
  var self = this;

  var productInfo = self.currentProduct;

  if (product) {
    productInfo = product;
  }

  var colorInfo = self.iColorInfo;
  if (color) {
    colorInfo = color;
  }

  productInfoTemp = productInfo;

  if (productInfo.onSpecial == true) {
    productInfoTemp = productInfo.bundleProductSummaries[0];

  }

  $('[id^=buttonAddCart_' + productInfoTemp.id + ']').remove();
  $('[id^=buttonVerCart_' + productInfoTemp.id + ']').remove();
  $('[id^=buttonShowAvail_' + productInfoTemp.id + ']').remove();
  $('.button_center.button_available').remove();

  $('[id^=buttonWant_' + productInfoTemp.id + ']').remove();
  $('[id^=buttonAddCart' + productInfoTemp.id + ']').remove();

  var divButtonAdd = $('<div></div>').attr({
    'id': 'buttonAddCart_' + productInfo.id,
    'class': 'button_primary Big Productpage'
  });


  divButtonAdd.data('currentData', {
    colorInfo: colorInfo,
    product: productInfo
  });




  var spanText = inditex.text('BUTTON_ADD_TO_CART');
  var isVisibleMoreDetails = $("#formProductPage_ " + productInfo.id + " .producInformation .productMoreDetails").is(':visible');

  //if there's no color selected we assign the new one by default (colorInfo)
  self.previousColor = self.previousColor || colorInfo;

  //if the size has not been selected or the color is changed
  //add buttons is disable in order to select a size
  if (isVisibleMoreDetails) {

    if (!self.TallaSelected || (self.previousColor != colorInfo)) {
      spanText = inditex.text('selectSizeError');
      divButtonAdd.addClass('inactive');
    }
  }
  self.log && console.log('NVP-log button 10');
  var spanButtonAdd = $('<span></span>').attr({
    'class': 'textButton'
  }).append(spanText);

  divButtonAdd.append(spanButtonAdd);

  var divButtonWant = $('<div></div>').attr({
    'id': 'buttonWant_' + productInfo.id,
    'class': 'button_primary Big Productpage'
  }).addClass("hide");
  divButtonWant.data('currentData', {
    colorInfo: colorInfo,
    product: productInfo
  });
  self.log && console.log('NVP-log button 11');
  var spanButtonSend = $('<span></span>').attr({
    'class': 'textButton'
  }).append(inditex.text('ItxMobileProductPage.enviar'));
  divButtonWant.append(spanButtonSend);

  $("#seccion_producto_" + productInfo.id + " .buttonsContainer").append(divButtonWant);

  if (self.iStore.isOpenForSale) {
    //$(".buttonsContainer").append(divButtonAdd);
    $("#seccion_producto_" + productInfo.id + ":first .buttonsContainer").append(divButtonAdd);
  }


  if (self.iStore.details.availabilityStockStore) {
    // Boton availability
    var divButtonCenter = $('<div></div>').attr({
      'class': 'button_center button_available'
    });
    var aButtonAvail = $('<a></a>').attr({
      'id': 'buttonShowAvail_' + productInfo.id,
      'class': 'buttonText Big Productpage',
      'href': 'javascript:;'
    });
    if (self.iStore.isOpenForSale == false) {
      aButtonAvail.removeClass('buttonText').addClass('button_primary');
    }
    aButtonAvail.data('currentData', {
      colorInfo: colorInfo,
      product: productInfo
    });
    self.log && console.log('NVP-log button 1');
    var spanButtonAvail = $('<span></span>').attr({
      'class': 'textButton'
    }).append(inditex.text('BUTTON_AVAILABILITY'));

    aButtonAvail.append(spanButtonAvail);
    divButtonCenter.append(aButtonAvail);

    //$(".buttonsContainer").append(divButtonCenter);
    $("#menuDisponi_").append(aButtonAvail);

  }


};


ItxMobileProductPageClass.prototype._loadBackBinding = function () {
  var self = this;

  $('div.btnBack a').hammer().off().on('tap', function (event) {

    event.preventDefault();

    if (inditex._getURLParameter("origenId")) {


      var optionsUrl = {
        "storeId": inditex.iStoreId,
        "langId": inditex.iLangId,
        "catalogId": inditex.iCatalogId,
        "categoryId": inditex.iCategoryId,
        "productId": self.iProductInfo.id
      };

    } else {

      var optionsUrl = {
        "storeId": inditex.iStoreId,
        "langId": inditex.iLangId,
        "catalogId": inditex.iCatalogId,
        "categoryId": inditex.iCategoryId

      };

    }



    if (self.searchTerm) {

      if (inditex._getURLParameter("origenId")) {


        window.location.href = inditex.generateUrl("ItxMobileSearchPage", {
          "storeId": inditex.iStoreId,
          "langId": inditex.iLangId,
          "catalogId": inditex.iCatalogId,
          "search-term": self.searchTerm,
          "productId": self.iProductInfo.id
        });

      } else {


        window.location.href = window.history.go(-1);


      }


    } else if (self.fromi && $.isNumeric(self.fromi)) { // veniamos desde relacionados

      history.back();

    } else {
      if (self.from && $.isNumeric(self.from)) { // veniamos desde un lookbook
        optionsUrl["categoryId"] = self.from;
      }


      window.location.href = inditex.generateUrl("ItxCategoryPage", optionsUrl);
    }

  });
}


ItxMobileProductPageClass.prototype._loadExtraInfoShowBinding = function () {
  var self = this;

  $('li[id^="menuInfo_"] a').hammer().off('tap').on('tap', function (event) {
    event.preventDefault();

    var $list = $(this);

    $list.parent().find('.left_submenu').slideToggle();

    var arrow = $list.find('span.menuArrow');

    if (arrow.hasClass('toDown')) {
      arrow.removeClass('toDown icon-arrow-down');
      arrow.addClass('toUp icon-arrow-up');
      setTimeout(function () {
        $('.menu_extraInformation').animate({
          scrollTop: $list.offset().top - 50
        }, 'slow');
      }, 700);
    } else {
      arrow.addClass('toDown icon-arrow-down');
      arrow.removeClass('toUp icon-arrow-up');
    }
  });

  if (self.iStore.isOpenForSale == true) {
    // Despliegue de la sección de envío
    $('li[id^="menuEnvio_"] a').hammer().on('tap', function (event) {
      event.preventDefault();

      var $list = $(this);

      $list.parent().find('.left_submenu').slideToggle();

      var arrow = $list.find('span.menuArrow');

      if (arrow.hasClass('toDown')) {
        arrow.removeClass('toDown icon-arrow-down');
        arrow.addClass('toUp icon-arrow-up');
        setTimeout(function () {
          $('.menu_extraInformation').animate({
            scrollTop: $list.offset().top - 50
          }, 'slow');
        }, 700);
      } else {
        arrow.addClass('toDown icon-arrow-down');
        arrow.removeClass('toUp icon-arrow-up');
      }

    });

    // Despliegue de la sección de devolución
    $('li[id^="menuDev_"] a').hammer().on('tap', function (event) {
      event.preventDefault();

      var $list = $(this);

      $list.parent().find('.left_submenu').slideToggle();

      var arrow = $list.find('span.menuArrow');

      if (arrow.hasClass('toDown')) {
        arrow.removeClass('toDown icon-arrow-down');
        arrow.addClass('toUp icon-arrow-up');
        setTimeout(function () {
          $('.menu_extraInformation').animate({
            scrollTop: $list.offset().top - 50
          }, 'slow');
        }, 700);
      } else {
        arrow.addClass('toDown icon-arrow-down');
        arrow.removeClass('toUp icon-arrow-up');
      }
    });

  } else {
    $('li[id^="menuEnvio_"]').remove();
    $('li[id^="menuDev_"]').remove();

  }

};

ItxMobileProductPageClass.prototype._loadBinding = function () {

  var self = this;

  if (!self.isBundle) {
    // Select de tallas
    self._selectSizeBinding();
  }

  // Botón volver
  self._loadBackBinding();

  // Despliegue de las secciones de información extra
  self._loadExtraInfoShowBinding();

  self._buttonsBinding();

};


ItxMobileProductPageClass.prototype._AddProductToBasket = function (aItem, origin, idProduct) {

  var self = this;

  //inditex.addItem('shopCart', aItem, origin);
  var item = arguments[1];
  inditex.jetloreTrackShoppingEvents(aItem, aItem.quantity);

  inditex.xRestAddToCart([aItem]).done(function (response) {


    var htmlCesta = '<span  class="icon icon-ico-shop shopCartCountIco"></span><span class="shopCartCount">' + inditex.xReturnTotalItems(inditex.iUserJSON.shopCart.items) + '</span>';
    //$('.shopCartCount').text(inditex.xReturnTotalItems(inditex.iUserJSON.shopCart.items));
    $('#shopCartHeader').html(htmlCesta);


    self._LoadRelatedinConfirmation(aItem, idProduct);

    $('#shopCartHeader').hammer().off().on('tap', function (event) {

      // Generamos url para la cesta de la compra
      event.preventDefault();

      window.location = inditex.generateUrl("ItxShopCartPage", {

        "storeId": Inditex.iStoreId,

        "langId": Inditex.iLangId,

        "catalogId": Inditex.iCatalogId

      });
    });


  });

}

ItxMobileProductPageClass.prototype._AddBundleToBasket = function (aItems, origin, idProduct) {

  var self = this;

  //inditex.addItem('shopCart', aItem, origin);
  //var item = arguments[1];

  _.each(aItems, function (aItem) {
    inditex.jetloreTrackShoppingEvents(aItem, aItem.quantity);
  })

  inditex.xRestAddToCart(aItems).done(function (response) {


    var htmlCesta = '<span  class="icon icon-ico-shop shopCartCountIco"></span><span class="shopCartCount">' + inditex.xReturnTotalItems(inditex.iUserJSON.shopCart.items) + '</span>';
    //$('.shopCartCount').text(inditex.xReturnTotalItems(inditex.iUserJSON.shopCart.items));
    $('#shopCartHeader').html(htmlCesta);


    self._LoadRelatedinConfirmation(aItem, idProduct);

    $('#shopCartHeader').hammer().off().on('tap', function (event) {

      // Generamos url para la cesta de la compra
      event.preventDefault();

      window.location = inditex.generateUrl("ItxShopCartPage", {

        "storeId": Inditex.iStoreId,

        "langId": Inditex.iLangId,

        "catalogId": Inditex.iCatalogId

      });
    });

    $('div.btnBack a').hammer().off('tap').on('tap', function () {
      self._loadBackBinding();
    });

    self._AddProductToBasketConfirmation(aItems, null, idProduct);

  });

}


ItxMobileProductPageClass.prototype._LoadRelatedinConfirmation = function (aItem, idProduct) {
  var self = this;
  var colorSelectionado = self.iColorInfo.id;
  //console.group('_LoadRelatedinConfirmation');
  //console.log('self.iColorInfo.id aItem, idProduct ', self.iColorInfo.id, aItem, idProduct);
  $(".titulo").css("padding-bottom", "0px");
  $(".aRelacionadosSeguirCompra").css("padding-top", "0px");


  inditex.xRestGetProductDetail(idProduct).done(function (aText) {



    var currentProductoRelated = aText;
    //console.log('NVP-log currentProductoRelated', currentProductoRelated);
    //if (currentProductoRelated.onSpecial == true) {
    //currentProductoRelated = currentProductoRelated.bundleProductSummaries[0];
    //}

    if (currentProductoRelated.detail.relatedProducts.length > 0) {

      // uno aleatorio de los relacionados
      var Posi = Math.floor(Math.random() * currentProductoRelated.detail.relatedProducts.length) + 0;
      var Posi = 0;
      $(".interiorContent .iconClose.confirmation").css("top", "0em");
      $(".modalInfo #modal-content .contenido-confirmacion").css("margin-top", "3em");


      var relacionado = currentProductoRelated.detail.relatedProducts[Posi];

      if (relacionado.type == 'BundleBean') { //si es un producto bundle
        relacionado = relacionado.bundleProductSummaries[0];
      }

      var bloque = $('<span></span>').addClass("elemento-relacionado");
      var contenido = "";
      var posiColor = 0;

      var CapaRelacionado = $("<div></div>").addClass("capaRelacionado");

      Inditex.xRestGetProductDetail(relacionado.id, 0).done(function (aJson) {


        //console.log('NVP-log producto relacionado a pintar ', aJson);
        //self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(aJson);

        self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(aJson, null, null);

        var precio = $('<span></span>').addClass('relatedPrice');

        precio.append(self._drawPricesRelated(null, true, aJson, self.rangeProductPrice));

        //       CapaRelacionado.append(precio);

        // si tiene el color del producto principal se setea ese color
        var capaColores = $("<p></p>").addClass("colors");

        var capaTallajes = $("<p></p>").addClass("sizes");
        $.each(aJson.detail.colors, function (i, item) {

          if (item.id == colorSelectionado) {
            posiColor = i;
          }
        });


        //imagen del color
        var colorUrl = Inditex.getProductImageUrls(aJson.detail.colors[posiColor].image, 3, 5);
        var colorImg = $("<img />").attr("src", colorUrl[0]).addClass("responsive color-relacionado");
        capaColores.append(colorImg);

        //tallas relacionado
        var uniqueSizes = inditex.ixGetUniqueSizes(aJson.detail.colors[posiColor].sizes, self.iVisibilityMap);
        //console.log('NVP-log uniquesizes', uniqueSizes);
        $.each(uniqueSizes, function (indexSizes, size) {
          var msize = $("<span></span>").addClass("size").attr({
            'data-value': relacionado.id + '_' + colorSelectionado + '_' + size.sku
          });
          msize.append(size.name);
          capaMedida.data('product', relacionado);
          capaMedida.data('color', colorSelectionado);
          capaTallajes.append(msize);
        });

        // imagen del relacionado
        var imagen_relacionado = aJson.detail.colors[posiColor].image;
        var image1 = inditex.getProductImageUrls(imagen_relacionado, 1, 3);




        var capaImagen = $("<p></p>").addClass("image");
        var anchoVentana = $(window).width();
        if (anchoVentana < 375) {
          //capaImagen.css("width", "40%");
          //$(".ItxMobileProductPage .relacionadoCruzado .elemento-relacionado .capaRelacionado .relatedPrice").css("right", "-150%");


        }
        var imagenRelacionado = $("<img/>").attr({
          "src": image1[0],
          'class': 'responsive'
        });

        capaImagen.append(imagenRelacionado);

        // titulo del relacionado
        var capaTitulo = $("<p></p>").addClass("title");
        capaTitulo.append(relacionado.name);


        CapaRelacionado.append(capaImagen);

        var CapaInfo = $("<p></p>").addClass("info");
        CapaInfo.append(capaTitulo);
        CapaInfo.append(capaColores);
        CapaInfo.append(capaTallajes);


        capaImagen.append(precio);

        CapaRelacionado.append(CapaInfo);


        bloque.append(CapaRelacionado);

        $(".relacionadoCruzado").html(bloque);
        $("div[id^=buttonAddCart]").addClass("hide");

        // boton de compra del relacionado
        var botonCompraRelacionado = $("<div></div>").addClass("button_primary inactive").attr({
          id: 'btnAddRelated'
        }).css("display", "none");

        botonCompraRelacionado.append(inditex.text("selectSizeError"));
        botonCompraRelacionado.data('currentData', {
          colorInfo: aJson.detail.colors[posiColor],
          product: relacionado
        });


        /**
         * botones de ver cesta y seguir comprando
         */

        var lVerCesta = inditex.text('BUTTON_VER_COMPRA');
        var lSeguirCompra = inditex.text('BUTTON_SEGUIR_COMPRANDO');
        var lAddedOk = inditex.text("ItxMobileProductPage.productaddOk");

        var btnaCesta = $("<div></div>").attr("id", "btnVerCestaRelacionados").addClass("button_primary btnVerCestaRelacionados").html(lVerCesta);
        var btnSeguirCompra = $("<div></div>").attr("id", "aRelacionadosSeguirCompra").addClass("button_primary RelacionadosSeguirCompra").html(lSeguirCompra);

        $("#formProductPage_" + idProduct + " .capaRelacionado").append(botonCompraRelacionado);
        $("#formProductPage_" + idProduct + " .capaRelacionado").append(btnSeguirCompra);
        $("#formProductPage_" + idProduct + " .capaRelacionado").append(btnaCesta);

        //CapaRelacionado.append(botonCompraRelacionado);

        self._bindingRelacionados();


        setTimeout(function () {
          self._AddProductToBasketConfirmation(aItem, null, idProduct);
        }, 500)



      }).Catch(function (error) {

      });



    } else {

      self._AddProductToBasketConfirmation(aItem, null, idProduct);
    }



  });
  //console.groupEnd('NVP-log NVP-log _LoadRelatedinConfirmation');
}

ItxMobileProductPageClass.prototype._drawPricesRelated = function (element, value, producto, rangoPrecios) {


  var self = this;
  var priceStr = '';
  var divPrices = $('<div></div>').attr({
    'class': 'prices'
  });
  var singlePrize = 0;

  self.rangeProductPrice = rangoPrecios;
  if (self.rangeProductPrice) {



    self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(producto, null, producto.detail.colors[0]);


    var oldPriceStr = '';
    var hasOldPrice = false;

    var capaFrom = $("<div></div>").addClass("fromprize");
    capaFrom.append(inditex.text("FROM"));

    var capaTo = $("<div></div>").addClass("fromprize");
    capaTo.append(inditex.text("TO"));

    var showMinRange = 0;


    if (self.rangeProductPrice.minPrice == undefined || self.rangeProductPrice.minPrice == null) {

      priceStr = inditex.text("product.no_price");
      singlePrize = 1;
    } else
    if (self.rangeProductPrice.minPrice == self.rangeProductPrice.maxPrice) {
      priceStr = inditex.formatPrice(self.rangeProductPrice.minPrice);
      singlePrize = 1;
    } else
      priceStr = inditex.text("FROM") + ' ' + inditex.formatPrice(self.rangeProductPrice.minPrice) + ' ' + inditex.formatPrice(self.rangeProductPrice.maxPrice);

    if (self.rangeProductPrice.minOldPrice) {
      hasOldPrice = true;
      // -- tiene precio antiguo
      if (self.rangeProductPrice.minOldPrice == self.rangeProductPrice.maxOldPrice)
        oldPriceStr = inditex.formatPrice(self.rangeProductPrice.minOldPrice);
      else
        oldPriceStr = inditex.text("FROM") + ' ' + inditex.formatPrice(self.rangeProductPrice.minOldPrice) + ' ' + inditex.formatPrice(self.rangeProductPrice.maxOldPrice) + '</br>';

    }
    if (!value) {
      //if(singlePrize==1)
      //{
      if (producto) {
        $("#formProductPage_" + producto.id + " .prices").empty();
      } else {

      }
      //}
    }

    oldPriceStr = oldPriceStr.replace(new RegExp('&nbsp;', 'g'), '<span>');
    oldPriceStr = oldPriceStr.replace(new RegExp('&nbsp;', 'g'), '</span>');

    priceStr = priceStr.replace(new RegExp('&nbsp;', 'g'), '<span>');
    priceStr = priceStr.replace(new RegExp('&nbsp;', 'g'), '</span>');

    if (hasOldPrice) {
      var spanOldPrice = $('<span></span>').attr({
        'class': 'productOldPrice'
      }).append(oldPriceStr);
      divPrices.append(spanOldPrice);
      divPrices.addClass('oldPrice');
      var spanNewPrice = $('<span></span>').attr({
        'class': 'sale'
      }).append(priceStr);
      divPrices.append(spanNewPrice);
    } else {
      var spanPrice = $('<span></span>').attr({
        'class': 'actual'
      }).append(priceStr);
      self.precioGeneralProducto = priceStr;
      divPrices.append(spanPrice);
    }

  } else {

    var spanNoPrice = $('<span></span>').attr({
      'class': 'actual'
    }).append(inditex.text("product.no_price"));
    divPrices.append(spanNoPrice);
    self.precioGeneralProducto = priceStr;

  }
  if (value) {
    return divPrices;
  } else {
    if (producto) {
      $("#formProductPage_" + producto.id + " .productDetails").append(divPrices);
    } else {
      $("#formProductPage_" + self.iProductInfo.id + " .productDetails").append(divPrices);
    }

  }



}

ItxMobileProductPageClass.prototype._bindingRelacionados = function () {

  var self = this;
  //console.group('_bindingRelacionados');
  $(".capaRelacionado span.size").hammer().off("tap").on("tap", function (event) {

    event.preventDefault();
    $(".capaRelacionado span.size").removeClass("active");
    $(this).addClass("active");

    clearTimeout(self.IntervaloCierre);
    var value = $(this).data("value");
    $("#btnAddRelated").removeClass("inactive").text(inditex.text('BUTTON_ADD_TO_CART'));
    $("#btnAddRelated").data("size-value", value);

    $("#btnAddRelated").text(inditex.text("BUTTON_ADD_TO_CART"));

    self.SeleccionadoSelected = value;




    //bindeo del boton con los datos de la talla selecionada
    self._bindindBuyRelacionado();


    $("#btnAddRelated").trigger("tap");

  });
  //console.groupEnd('_bindingRelacionados');
}

/**************************************************
 * evento del boton de la compra del relacionado
 * param1=valor del la talla
 */


ItxMobileProductPageClass.prototype._bindindBuyRelacionado = function () {

  var self = this;

  $("#btnAddRelated").hammer().off('tap').on('tap', function (event) {

    event.preventDefault();

    clearTimeout(self.IntervaloCierre);

    var tallaSeleccionadaRelacionado = $(this).data("size-value");

    var composeId = tallaSeleccionadaRelacionado.split('_');
    var currentDataButton = $(this).data("currentData");
    var dataProduct = currentDataButton["product"];
    var dataColor = currentDataButton["colorInfo"];

    var productId = parseInt(composeId[0]);
    var colorId = parseInt(composeId[1]);
    var skuId = parseInt(composeId[2]);

    var size = inditex.xFindSku(dataColor, skuId);

    if (size.price != undefined && size.price != null && size.price != '' && size.price != 0) {
      var productId = dataProduct.id;
      if (dataProduct.type == 'BundleBean') {
        var parentProduct = inditex.xFindParentProductSku(dataProduct, skuId);
        if (parentProduct != null) {
          productId = parentProduct.id;
        }
      }
      var origin = {
        categoryType: null,
        categoryData: null,
        parentId: inditex.iXProductInfo.id,
        productId: productId
      };
      var item = {
        sku: skuId,
        parentId: dataProduct.id,
        categoryId: inditex.iCategoryId,
        name: dataProduct.name,
        color: dataColor.name,
        quantity: 1,
        unitPrice: size.price,
        image: dataColor.image,
        reference: dataProduct.detail.reference,
        productType: dataProduct.productType,
        size: size.name
      };

      self._AddRelatedToBasket(item, origin);

    }


  });

}


ItxMobileProductPageClass.prototype._AddRelatedToBasket = function (aItem) {

  var self = this;

  //inditex.addItem('shopCart', aItem, origin);
  var item = arguments[1];
  inditex.jetloreTrackShoppingEvents(aItem, aItem.quantity);

  inditex.xRestAddToCart([aItem]).done(function () {
    $('.shopCartCount').text(inditex.xReturnTotalItems(inditex.iUserJSON.shopCart.items));

    self._CloseConfirmation();

  });


}



ItxMobileProductPageClass.prototype._AddProductToBasketConfirmation = function (aItem, origin, idProduct) {

  var self = this;
  var lAddedOk = "";
  var TieneRelacionados = 1;
  origen = $(".producInformation");

  var contenedor = $("<div></div>").addClass("contenedor");

  var lVerCesta = inditex.text('ItxMobileProductPage.verCompra');
  var lSeguirCompra = inditex.text('BUTTON_SEGUIR_COMPRANDO');
  if (aItem.constructor === Array && aItem.length > 1) {
    lAddedOk = inditex.text("ItxProducPage.bundle.added");
  } else {
    lAddedOk = inditex.text("ItxMobileProductPage.productoAgregadoCesta");
  }

  var acesta = '<button type="button" id="btnVerCestaRelacionados" class="button_primary btnVerCestaRelacionados">' + lVerCesta + '</button>';
  var seguircompra = '<a id="aRelacionadosSeguirCompra" class="aRelacionadosSeguirCompra">' + lSeguirCompra + '</a>';

  var btnaCesta = $("<div></div>").attr("id", "btnVerCestaRelacionados").addClass("button_primary btnVerCestaRelacionados").html(lVerCesta);
  var btnseguircompra = $("<div></div>").attr("id", "aRelacionadosSeguirCompra").addClass("button_primary aRelacionadosSeguirCompra").html(lSeguirCompra);

  var content = '<div class="title-related-modal"><span class="addedOk-img-relacionados"></span><span class="addedOk-related-modal">' + lAddedOk + '</span></div>';
  //content += seguircompra;
  //content += acesta;
  content += '<div class="separador-modal-relacionados"></div>';

  $("#formProductPage_" + idProduct + " .contenido-confirmacion").html(content);

  self.TallaSelected = null;


  if ($("#formProductPage_" + idProduct + " .relatedList .elemento-relacionado").length < 1) {

    //if(self.currentProduct.detail.relatedProducts.length < 1) {
    $("#formProductPage_" + idProduct + " .relacionadosPedido").addClass("hide");


    var divNoRelaciondos = $("<div></div>").attr("id", "norelatedproducts_" + idProduct).addClass("norelatedbuttons");

    divNoRelaciondos.append(btnseguircompra);
    divNoRelaciondos.append(btnaCesta);

    divNoRelaciondos.insertBefore($("#formProductPage_" + idProduct + " .relacionadosPedido "));

    //btnseguircompra.insertAfter($("#formProductPage_" + idProduct + " .relacionadosPedido .relacionadoCruzado"));

  }


  $('#formProductPage_' + idProduct + ' .producInformation .modalInfo #modal-content').css("top", $(window).height());
  $("#formProductPage_" + idProduct + " .producInformation .modalInfo").removeClass("hide");



  if (self.productoVisibleActivo.type == "BundleBean") {
    var pVisible = self.productoVisibleActivo.bundleProductSummaries[0];

  } else {

    var pVisible = self.productoVisibleActivo;

  }



  if (pVisible.detail.relatedProducts.product < 1) {
    $("#formProductPage_" + idProduct + " .relacionadosPedido").addClass("hide");
    $("#formProductPage_" + idProduct + " .separador-modal-relacionados").addClass("hide");
    TieneRelacionados = 0;
  }




  // se agregan los botones de ver compra y seguir comprando
  //tiene relacionado


  var alturaRelacionado = $("#formProductPage_" + idProduct + " .elemento-relacionado").height();
  var alturaMensaje = $("#formProductPage_" + idProduct + " .interiorConfirmation").height();

  //var alturaNoRelacionados = $("#norelatedproducts_" + idProduct).height();

  if (self.productoVisibleActivo.detail.relatedProducts.length > 0) {


    //$("#formProductPage_" + idProduct + " .relacionadosPedido #btnAddRelated").append(seguircompra);

    //btnaCesta.insertBefore($("#formProductPage_" + idProduct + " .relacionadosPedido"));

  }

  var alturaNoRelacionados = 0;

  if ($("#norelatedproducts_" + idProduct).length > 0) {
    alturaNoRelacionados = $("#norelatedproducts_" + idProduct).height();

  }


  var sumaAlturas = alturaMensaje + alturaRelacionado + alturaNoRelacionados;

  var alturaVentana = $(window).height();
  var TopVentana = alturaVentana - (sumaAlturas + 45);


  if (TieneRelacionados == 0) {
    self.topAperturaCapa = TopVentana + alturaRelacionado - 100; // el 100 para que quede a la altura de las tallas
  } else {
    self.topAperturaCapa = TopVentana;
  }
  $("#formProductPage_" + idProduct + " .modalInfo #modal-content .contenido-confirmacion").css("margin-top", "1.6em");
  //}


  /**
   * posiciona la altura de la modal abajo de la pantalla
   */
  $("#formProductPage_" + idProduct + " #aRelacionadosSeguirCompra").css({
    "padding-top": "0px",
    "padding-bottom": "0.5em"
  });
  $("#formProductPage_" + idProduct + " .separador-modal-relacionados").css({
    "margin-bottom": "0px",
    "margin-top": "0em"
  });


  $(".relacionadosPedido .titulo").css("margin-bottom", "0px");

  $('#formProductPage_' + idProduct + ' .producInformation .modalInfo #modal-content').animate({
    top: self.topAperturaCapa + "px"
  }, {
    complete: function () {

      // se cierra a los 5 seg si no tiene relaciondos
      if (alturaNoRelacionados > 0) {

        setTimeout(function () {
          self._CloseConfirmation();

        }, 5000);

      }


    }
  });

  /*$('#formProductPage_'+idProduct+' .producInformation .modalInfo #modal-content.easy').fadeIn(10, function() {
   $('#formProductPage_'+idProduct+' .producInformation .modalInfo #modal-content.easy').addClass("top");
  }); */

  $(".modal-background").css("z-index", "10");
  $(".modal-content").css("z-index", "100");

  $("[id=modal-background]").hammer().off("tap");
  $("[id=modal-background]").hammer().on("tap", function (event) {
    event.preventDefault();
    $(".confirmation").trigger("tap");
    $("[id=modal-background]").hammer().off("tap");
  });

  $(".interiorContent .iconClose").hammer().on('tap', function (event) {
    event.preventDefault();
    self._CloseConfirmation();
  });

  $(".capaRelacionado #btnVerCestaRelacionados, .norelatedbuttons #btnVerCestaRelacionados").hammer().off('tap');
  $(".capaRelacionado #btnVerCestaRelacionados, .norelatedbuttons #btnVerCestaRelacionados").hammer().on('tap', function (event) {
    event.preventDefault();
    window.location = inditex.generateUrl("ItxShopCartPage", {
      "storeId": Inditex.iStoreId,
      "langId": Inditex.iLangId,
      "catalogId": Inditex.iCatalogId
    });
    // Tag manager
    $.event.trigger({
      type: 'header.viewMiniCart'
    });
  });


  $(".capaRelacionado [id=aRelacionadosSeguirCompra], .norelatedbuttons [id=aRelacionadosSeguirCompra]").hammer().off('tap');
  $(".capaRelacionado [id=aRelacionadosSeguirCompra], .norelatedbuttons [id=aRelacionadosSeguirCompra]").hammer().on('tap', function (event) {

    event.preventDefault();
    $('.producInformation .modalInfo #modal-content').animate({
      top: $(window).height()
    }, {
      duration: 300,
      complete: function () {
        setTimeout(function () {
          $(".producInformation .modalInfo").addClass("hide");
        }, 800)
      }
    });

    $(".producInformation .productMoreDetails").hide();
    $(".productDetailsExtended").removeClass("transparente");
    $(".producInformation .productMoreDetails").addClass("hide");

    $("div[id^=buttonAddCart_]").removeClass("hide");
    $("div[id^=buttonAddCart_] span").text(inditex.text('BUTTON_ADD_TO_CART'));

  });


  $("#buttonAddCart_" + idProduct).data("TallaSelected", null);


}



ItxMobileProductPageClass.prototype._CloseConfirmation = function () {


  $('.producInformation .modalInfo #modal-content').animate({
    top: $(window).height()
  }, {
    duration: 300,
    complete: function () {
      setTimeout(function () {
        $(".producInformation .modalInfo").addClass("hide");
      }, 800)
    }

  });

  $(".producInformation .productMoreDetails").hide();
  $(".productDetailsExtended").removeClass("transparente");
  $(".producInformation .productMoreDetails").addClass("hide");

  $("div[id^=buttonAddCart_]").removeClass("hide");
  $("div[id^=buttonAddCart_] span").text(inditex.text('BUTTON_ADD_TO_CART'));


}

ItxMobileProductPageClass.prototype._buttonsBinding = function (product) {

  var self = this;


  if (self.iStore.isOpenForSale == true) {
    // Botï¿½n add to cart
    $('div[id^="buttonAddCart_"]').hammer().off('tap');
    $('div[id^="buttonAddCart_"]').hammer().on('tap', function (event) {
      var idProduct = $(this).attr('id').split('_')[1];


      if ($(this).hasClass('inactive')) {
        return false;
      };

      $('#formProductPage_' + idProduct + ' .sizeSelector > .containerSizes').css('max-height', '130px');

      var liselecteds = $("#sizeSelect_" + idProduct).find("li.selected");

      if ($(this).data("TallaSelected") == null) {

        var datasColor = $(".activeProduct .color_palette a.active").data();
        if (!datasColor) {
          var datasColor = $("#formProductPage_" + idProduct + " .color_palette").find("a.active").data();
        }

        var valores = $("#buttonAddCart_" + idProduct).data("currentData");

        valores.colorInfo = datasColor.currentData.colorInfo;
        //$("#buttonAddCart_" + idProduct).data("currentData", valores);


        var currentDataButton = $(this).data("currentData");
        var dataProduct = currentDataButton["product"];
        var dataColor = currentDataButton["colorInfo"];

        // -- tallas
        self._drawSizes($('#formProductPage_' + idProduct + ' .productMoreDetails'), dataColor, dataProduct);

        $("#formProductPage_" + idProduct + " .productDetailsExtended").addClass("transparente");
        $("#formProductPage_" + idProduct + " .productMoreDetails").removeClass("hide");
        $("#formProductPage_" + idProduct + " .productMoreDetails").show();

        //$("#productInformation_" + idProduct + " .color_palette").find("a.active").trigger("tap");

        // -- cambia estado del boton

        $(this).children().text(inditex.text('selectSizeError'));
        $(this).addClass('inactive');


        $(".CarrouselContainer").hammer().off("tap");
        $(".CarrouselContainer").hammer().on("tap", function (event) {

          $(".productMoreDetails").addClass("hide");

          $("#formProductPage_" + idProduct + " .productDetailsExtended").removeClass("transparente");
          $("#formProductPage_" + idProduct + " .productMoreDetails").addClass("hide");
          $("#formProductPage_" + idProduct + " .productMoreDetails").hide();
          $("[id^=buttonAddCart_]").removeClass("inactive");
          $("[id^=buttonAddCart_]").find("span").html(inditex.text('BUTTON_ADD_TO_CART'));

          $(".CarrouselContainer").hammer().off("tap");
        });


      } else {
        //console.log('NVP-log self.TallaSelected', self.TallaSelected);

        //console.log('NVP-log $(this).data("currentData")', $(this).data("currentData"));
        //if (idProduct && $("#formProductPage_" + idProduct).valid()) {
        var tallaSeleccionada = self.TallaSelected;
        var composeId = tallaSeleccionada.split('_');
        var currentDataButton = $(this).data("currentData");
        var dataProduct = currentDataButton["product"];
        var dataColor = currentDataButton["colorInfo"];

        // si no ha clickado en el cambio de color se pilla el que este marcado por defecto
        /* if ($("#productInformation_" + idProduct + " .color_palette").find("a.active").data("currentData")) {
             datosColorSelected = $("#productInformation_" + idProduct + " .color_palette").find("a.active").data("currentData");
            dataColor = datosColorSelected.colorInfo;
          }
        */

        var productId = parseInt(composeId[0]);
        var colorId = parseInt(composeId[1]);
        var skuId = parseInt(composeId[2]);


        var size = inditex.xFindSku(dataColor, skuId);

        if (size.price != undefined && size.price != null && size.price != '' && size.price != 0) {
          var productId = dataProduct.id;


          if (dataProduct.type == 'BundleBean') {
            var parentProduct = inditex.xFindParentProductSku(dataProduct, skuId);
            if (parentProduct != null) {
              productId = parentProduct.id;
            }
          }

          var origin = {
            categoryType: null,
            categoryData: null,
            parentId: inditex.iXProductInfo.id,
            productId: productId
          };

          var item = {
            sku: skuId,
            parentId: productId,
            categoryId: inditex.iCategoryId,
            name: dataProduct.name,
            color: dataColor.name,
            quantity: 1,
            unitPrice: size.price,
            image: dataColor.image,
            reference: dataProduct.detail.reference,
            productType: dataProduct.productType,
            size: size.name,
            productId: inditex.iXProductInfo.id,
            categoryType: self.iCategoryInfo.type
          };

          var selectedSizeIndex = $('#sizeSelect_' + productId + ' li.selected').index();

          //console.log('NVP-log selectedSizeIndex', $('#sizeSelect_' + dataProduct.id + ' li.selected').index(), $('#sizeSelect_' + dataProduct.id + ' li.selected'));
          self._AddProductToBasket(item, origin, idProduct);

          $('#buttonWant_' + idProduct).addClass("hide");
          $('#buttonVerCart_' + idProduct).show();

          self._checkTrackConversions(dataProduct);

          $.event.trigger({
            type: 'productPage.addToCart',
            cf: 'checkout',
            category: 'ficha_producto',
            selectedSizeIndex: selectedSizeIndex,
            selectedSize: size.name,
            selectedColorId: dataColor.id,
            selectedColor: dataColor.name,
            price: inditex.formatNumber(size.price),
            productId: productId,
            productCategory: dataProduct.family + '/' + dataProduct.subFamily,
            list: (self.searchTerm) ? 'buscador' : (self.fromi && $.isNumeric(self.fromi)) ? 'productos_relacionados' : (self.from && $.isNumeric(self.from)) ? 'lookbook_' + productId : 'parrilla_' + (window.sessionStorage.getItem('productActionFieldList') || ''),
            productIndex: (self.fromi && $.isNumeric(self.fromi)) ? window.sessionStorage.getItem('relatedProductIndex') : window.sessionStorage.getItem('productIndex')
          });

        }
        //}
      }
    });

    // Botï¿½n ver compra
    $('div[id^="buttonVerCart_"]').hammer().off('tap');
    $('div[id^="buttonVerCart_"]').hammer().on('tap', function (event) {
      // Generamos url para la cesta de la compra



      window.location = inditex.generateUrl("ItxShopCartPage", {
        "storeId": Inditex.iStoreId,
        "langId": Inditex.iLangId,
        "catalogId": Inditex.iCatalogId
      });

    });
  }

};

ItxMobileProductPageClass.prototype._checkTrackConversions = function (product) {

  var self = this;

  if (inditex._getURLParameter('search-term') !== null) {

    inditex.getXconfiguracionValue('COLBENSON_SEARCHBROKER_URL_JS', function (data, urlColbenson) {
      $.getScript(urlColbenson, function (data, textStatus, jqxhr) {
        inditex.initColbenson(false);


        terms = inditex._getURLParameter('search-term'),
          page = 1,
          title = inditex.iXProductInfo.name,
          url = window.location.href.split('?')[0],
          scope = inditex.iSearchEngine.colbensonConfiguration.colbensonScope,
          options = {
            lang: inditex.iSearchEngine.colbensonConfiguration.colbensonLang,
            store: inditex.iSearchEngine.colbensonConfiguration.colbensonStore
          };

        if (typeof inditex.iSearchEngine.searchBroker.track.trackConversion === 'function') {
          inditex.iSearchEngine.searchBroker.track.trackConversion(terms, page, title, url, scope, options);
        }

      });


    });
  }

};

ItxMobileProductPageClass.prototype._selectSizeBinding = function (product) {

  var self = this;

  var productInfo = self.currentProduct;

  if (product) {
    productInfo = product;
  }


  $('#sizeSelect_' + productInfo.id).on('change', function () {

    if (this.value && this.value != null) {
      var product = $(this).data('product');
      if (this.value != -1) {
        // -- esta compuesto por el identificador del producto + color + sku
        var composeId = this.value.split('_');

        var productId = parseInt(composeId[0]);
        var colorId = parseInt(composeId[1]);
        var skuId = parseInt(composeId[2]);

        self._refreshRangePrice(product, colorId, skuId);
      } else {
        self.rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(product);
        if (self.isBundle) {
          self._drawPrices($('#formProductPage_' + product.id + ' div.producInformation .productDetails'));
        } else {
          self._drawPrices($('.container.product .producInformation .productDetails'));
        }
      }
    }

  });

};

ItxMobileProductPageClass.prototype._refreshRangePrice = function (product, colorId, skuId) {

  var self = this;

  if (product && product.detail && product.detail.colors && (product.detail.colors.length > 0)) {
    $.each(product.detail.colors, function (indexColor, color) {
      if (color && color.sizes && (color.sizes.length > 0) && (parseInt(color.id) == colorId)) {
        $.each(color.sizes, function (indexSizes, size) {
          if (size.sku == skuId) {

            if (size.price != undefined && size.price != null && size.price != '' && size.price != 0) {
              self.rangeProductPrice.maxPrice = size.price;
              self.rangeProductPrice.minPrice = size.price;
              self.rangeProductPrice.maxOldPrice = size.oldPrice;
              self.rangeProductPrice.minOldPrice = size.oldPrice;
            } else {
              self.rangeProductPrice.maxPrice = null;
              self.rangeProductPrice.minPrice = null;
              self.rangeProductPrice.maxOldPrice = null;
              self.rangeProductPrice.minOldPrice = null;
            }

            if (self.isBundle) {
              self._drawPrices($('#formProductPage_' + product.id + ' div.producInformation .productDetails'));
            } else {
              self._drawPrices($('.container.product .producInformation .productDetails'));
            }

          }
        });
      }
    });
  }

};

/**
 * Metodo que busca en la url el parametro colorId para
 */
ItxMobileProductPageClass.prototype._getColorIdFromUrl = function () {
  var colorId = decodeURI(
    (RegExp('colorId=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]
  );

  return colorId == "null" ? null : colorId;
};

/**
 * Metodo que pinta cada producto de un bundle
 * @param {Object} product
 */
ItxMobileProductPageClass.prototype._drawBundleContainer = function (product) {

  var self = this;


  if (product && product != null && self.iVisibilityMap && (self.iVisibilityMap[product.id] != "hidden" ||
      (self.iVisibilityMap[product.id] == "hidden" && inditex.iStoreJSON.detail.showProductCategorySkuNoStock != 'HIDDEN'))) {

    var article = $('<article></article>').attr({
      'class': 'container product separadorBundle',
      'id': 'container_' + product.id
    });
    var form = $('<form></form>').attr({
      'id': 'formProductPage_' + product.id
    });

    var productInfo = $('<div></div>').attr({
      'class': 'producInformation'
    });
    var productDetails = $('<div></div>').attr({
      'class': 'productDetails'
    });
    var carrouselContainer = $('<div></div>').attr({
      'class': 'CarrouselContainer swiper-container'
    });
    var productMoreDetails = $('<div></div>').attr({
      'class': 'productMoreDetails'
    });
    var menuExtraInformation = $('<div></div>').attr({
      'class': 'menu_extraInformation'
    });

    var menuList = $('<ul></ul>').attr({
      'id': 'menuList_' + product.id
    });

    var menuInfo = $('<li></li>').attr({
      'id': 'menuInfo_' + product.id
    });
    var menuInfoHtml = '<a href="javascript:;">' +
      '<span>' + inditex.text("info") + '</span>' +
      '<span class="menuArrow toDown iconSprite"></span>' +
      '</a>' +
      '<ul class="left_submenu">' +
      '<li id="descInfo_' + product.id + '"><h4>' + inditex.text("description") + '</h4></li>' +
      '<li id="compInfo_' + product.id + '"><h4>' + inditex.text("composition") + '</h4></li>' +
      '<li id="careInfo_' + product.id + '"><h4>' + inditex.text("care") + '</h4></li>' +
      '</ul>';
    menuInfo.html(menuInfoHtml);

    var menuInfoHtml = '<a href="javascript:;">' +
      '<span>' + inditex.text("info") + '</span>' +
      '<span class="menuArrow toDown iconSprite"></span>' +
      '</a>' +
      '<ul class="left_submenu">' +
      '<li id="descInfo_' + product.id + '"><h4>' + inditex.text("description") + '</h4></li>' +
      '<li id="compInfo_' + product.id + '"><h4>' + inditex.text("composition") + '</h4></li>' +
      '<li id="careInfo_' + product.id + '"><h4>' + inditex.text("care") + '</h4></li>' +
      '</ul>';
    menuInfo.html(menuInfoHtml);

    var menuEnvio = $('<li></li>').attr({
      'id': 'menuEnvio_' + product.id
    });
    var menuEnvioHtml = '<a href="javascript:;">' +
      '<span>' + inditex.text("envio") + '</span>' +
      '<span class="menuArrow toDown"></span>' +
      '</a>' +
      '<ul class="left_submenu"></ul>';
    menuEnvio.html(menuEnvioHtml);

    var menuDev = $('<li></li>').attr({
      'id': 'menuDev_' + product.id
    });
    var menuDevHtml = '<a href="javascript:;">' +
      '<span>' + inditex.text("devolucion") + '</span>' +
      '<span class="menuArrow toDown"></span>' +
      '</a>' +
      '<ul class="left_submenu"></ul>';
    menuDev.html(menuDevHtml);


    menuList.append(menuInfo);
    menuList.append(menuEnvio);
    menuList.append(menuDev);

    menuExtraInformation.append(menuList);

    productInfo.append(productDetails);
    productInfo.append(carrouselContainer);
    productInfo.append(productMoreDetails);
    productInfo.append(menuExtraInformation);

    form.append(productInfo);
    article.append(form);

    $('.producInfo').append(article);

  }

};


/**
 * Pinta los datos del producto de un bundle special
 * @param {Object} product
 */
ItxMobileProductPageClass.prototype._drawBundleSpecial = function (product) {

  var self = this;
  //console.log('NVP-log _drawBundleSpecial', product);
  self._selectColor();

  var target = $('.container.product .producInformation');


  // -- tï¿½tulo y precios del producto
  self._drawProductDetails(target.children('.productDetails'));

  // -- imï¿½genes
  self._drawProductCarrousel(target.children('.CarrouselContainer'));

  // -- referencia, colores y tallas
  self._drawProductMoreDetails(target.children('.productMoreDetails'));

  // -- descripciï¿½n, composiciï¿½n y cuidados
  //self._drawProductInfo(); se cargara por ajax

  // -- botones
  self._drawButtons(target);

  // -- Binds para selects
  self._selectSizeBinding();
}

/**
 * Pinta los datos del producto de un bundle special
 * @param {Object} product
 */
ItxMobileProductPageClass.prototype._drawBundle = function (product) {

  var self = this;

  self._selectColor();

  var target = $('.container.product .producInformation');


  // -- tï¿½tulo y precios del producto
  self._drawProductDetails(target.children('.productDetails'));

  // -- imï¿½genes
  self._drawProductCarrousel(target.children('.CarrouselContainer'));

  // -- referencia, colores y tallas
  //self._drawProductMoreDetails(target.children('.productMoreDetails'));
  self._drawSizeGuide(target.children('.productMoreDetails'));
  // -- descripciï¿½n, composiciï¿½n y cuidados
  //self._drawProductInfo(); se cargara por ajax

  // -- botones
  self._drawBundleButtons(target);

  // -- Binds para selects
  //self._selectSizeBinding();
}

ItxMobileProductPageClass.prototype._carrouselSize = function () {

  var self = this;
  if (navigator.userAgent.match(/FBAV/i) || navigator.userAgent.match(/Twitter/i) || document.referrer.match(/t.co/i) || document.referrer.match(/bit.ly/i)) {

    var $carrouselContainerSize = ($(window).height()) - 100;
    var $infoProductoDiv = ($(window).height()) - 141;
    var $sizeSelectorArea = $carrouselContainerSize - 130;

    $('.producInfo').height($infoProductoDiv);
    $('.CarrouselContainer').height($sizeSelectorArea);
    $('.imgCarrouselContainter').height($sizeSelectorArea);
    $('.relatedList').height($sizeSelectorArea - 45);


  } else {

    var $carrouselContainerSize = ($(window).height()) - 60;
    var $sizeSelectorArea = $carrouselContainerSize - 90;

    $('.producInfo').height($carrouselContainerSize);
    $('.CarrouselContainer').height($sizeSelectorArea);
    $('.imgCarrouselContainter').height($sizeSelectorArea);
    $('.relatedList').height($sizeSelectorArea - 45);

  }

  if (navigator.userAgent.match(/FBAV/i)) {

    $(window).bind("scroll", function (e) {

      $('html, body').animate({
        scrollTop: "0px"
      }, 0);


      $('html, body').bind('scroll', function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });


    });

  }


}

ItxMobileProductPageClass.prototype._sliderPositionController = function (idProducto) {
  var status;
  var self = this;
  status = $("#formProductPage_" + idProducto + " .relacionados-container").hasClass('swiper-slide-active');

  self._showOrHideProductDrawer(status, idProducto);
}


/**
 * [_showOrHideProductDrawer show or hide the price product drawer, used mainly
 * when related products are shown]
 * @param  {[type]} status [if the drawer is deactivated o activated]
 */
ItxMobileProductPageClass.prototype._showOrHideProductDrawer = function (status, idProducto) {

  var self = this;
  var $capaRelacionados = $("#formProductPage_" + idProducto + " .relatedList");
  var $carrouselContainer = $("#formProductPage_" + idProducto + " .CarrouselContainer");
  var $seccionProducto = $("#seccion_producto_" + idProducto).height();


  var alturatotal = $(document).height();
  alturatotal = alturatotal - $("#header").height();
  alturatotal = alturatotal - $("#formProductPage_" + idProducto + " .CarrouselContainer .title-related").innerHeight() + 10;


  var $productDetailsExtended = $("#formProductPage_" + idProducto + " .productDetailsExtended"),
    $buttonsContainer = $("#seccion_producto_" + idProducto + " .buttonsContainer"),
    $infoIcon = $("#formProductPage_" + idProducto + " .InfoIcon"),
    $share = $('.share_content');


  if (!status) {

    $productDetailsExtended.show();
    $buttonsContainer.show();
    $infoIcon.show();
    $share.show();
    $carrouselContainer.css("overflow-y", "hidden");
    $carrouselContainer.height($carrouselContainer.data("height"));

  } else {

    $productDetailsExtended.hide();
    $buttonsContainer.hide();
    $infoIcon.hide();
    $share.hide();
    $("#formProductPage_" + idProducto + " .elemento-relacionado").css("height", "auto");
    $carrouselContainer.css("overflow-y", "hidden");
    $carrouselContainer.height($seccionProducto);
    $capaRelacionados.height(alturatotal);


  }
}

ItxMobileProductPageClass.prototype._checkLegal = function () {

  if ($('.productDetailsExtended p.legal').length) {

    $('.prices').addClass('legal');

  }

};

ItxMobileProductPageClass.prototype._drawSpecialBullet = function (element) {

  var self = this;


  if (element) {

    if (self.ProductosRelacionadosProducto[element.id] && self.ProductosRelacionadosProducto[element.id].length > 0) {
      var idProducto = element.id;
      $("#productInformation_" + idProducto + " .swiper-pagination-bullet").last().addClass("bx-pager-item-related");
    };

  } else {

    if (self.currentProduct.detail.relatedProducts.length > 0) {
      $(".swiper-pagination-bullet").last().addClass("bx-pager-item-related");
    };

  }



}

/**
 * [_drawAuxiliarTallas dibuja una capa auxiliar con un <a> con las tallas]
 * @param  {[type]} color    [el color seleccionado]
 * @param  {[type]} producto [el producto seleccionado]
 */
ItxMobileProductPageClass.prototype._drawAuxiliarTallas = function (color, producto) {

  var self = this;

  var divClassTallasImagen = $("<div></div>").attr("id", "classTallas_" + producto.id).addClass("auxTallas");;
  var classTallaImagen = $("<a></a>");

  if (color && color.sizes && (color.sizes.length > 0)) {
    $.each(color.sizes, function (indexSizes, size) {
      classTallaImagen.addClass("s" + size.name);
    });
  }
  divClassTallasImagen.append(classTallaImagen);

  $("#classTallas_" + producto.id).remove();
  $("#formProductPage_" + producto.id).prepend(divClassTallasImagen);

}
ItxMobileProductPageClass.prototype._drawFPInfo = function () {
  var self = this,
    isInFamily,
    isIncluded,
    isExcluded,
    fp,
    img;
  inditex.xRestGetMarketingSpot('ProductDetailByFamilyConf').done(function (mspot) {
    var data;
    if (mspot) {
      var cleanMSpot = mspot.replace(/<!--.*?-->/g, "").replace(/\r?\n|\r/g, " ").trim();

      if (cleanMSpot) {
        try {
          data = JSON.parse(cleanMSpot);
          isInFamily = _.contains(data.includeFamilies, self.iProductInfo.family);
          isIncluded = _.contains(data.includeProducts, self.iProductInfo.detail.reference);
          isExcluded = _.contains(data.excludeProducts, self.iProductInfo.detail.reference);
          img = '<img src="' + Inditex.getCommonStaticResourceUrl(data.image) + '">';
          if ((isInFamily || isIncluded) && !isExcluded) {
            fp = $('<li>').addClass('fp_notice');
            fp.append(img, data.text);
            $('ul.left_submenu').append(fp);
          }
        } catch (e) {
          console.log(e); //error in the above string(in this case,yes)!
        }
      }
    }
  });

};

ItxMobileProductPageClass.prototype._drawBundleButtons = function (element) {

  var self = this;

  var productInfo = self.currentProduct;

  var colorInfo = self.iColorInfo;

  productInfoTemp = productInfo;



  $('[id^=buttonBundleAddCart_' + productInfoTemp.id + ']').remove();
  $('[id^=buttonVerCart_' + productInfoTemp.id + ']').remove();
  $('[id^=buttonShowAvail_' + productInfoTemp.id + ']').remove();
  $('.button_center.button_available').remove();

  $('[id^=buttonWant_' + productInfoTemp.id + ']').remove();
  $('[id^=buttonBundleAddCart' + productInfoTemp.id + ']').remove();

  var divButtonAdd = $('<div></div>').attr({
    'id': 'buttonBundleAddCart_' + productInfo.id,
    'class': 'button_primary Big Productpage'
  });


  divButtonAdd.data('currentData', {
    colorInfo: colorInfo,
    product: productInfo
  });




  var spanText = inditex.text('ItxProducPage.bundle.buy');
  var isVisibleMoreDetails = $("#formProductPage_ " + productInfo.id + " .producInformation .productMoreDetails").is(':visible');

  //if there's no color selected we assign the new one by default (colorInfo)
  self.previousColor = self.previousColor || colorInfo;

  //if the size has not been selected or the color is changed
  //add buttons is disable in order to select a size
  // if (isVisibleMoreDetails) {

  //   if (!self.TallaSelected || (self.previousColor != colorInfo)) {
  //     //spanText = inditex.text('selectSizeError');
  //     divButtonAdd.addClass('inactive');
  //   }
  // }
  self.log && console.log('NVP-log button 2');

  var spanButtonAdd = $('<span></span>').attr({
    'class': 'textButton'
  }).append(spanText);

  divButtonAdd.append(spanButtonAdd);

  var divButtonWant = $('<div></div>').attr({
    'id': 'buttonWant_' + productInfo.id,
    'class': 'button_primary Big Productpage'
  }).addClass("hide");
  divButtonWant.data('currentData', {
    colorInfo: colorInfo,
    product: productInfo
  });

  self.log && console.log('NVP-log button 3');
  var spanButtonSend = $('<span></span>').attr({
    'class': 'textButton'
  }).append(inditex.text('ItxMobileProductPage.enviar'));
  divButtonWant.append(spanButtonSend);

  $("#seccion_producto_" + productInfo.id + " .buttonsContainer").append(divButtonWant);

  if (self.iStore.isOpenForSale) {
    //$(".buttonsContainer").append(divButtonAdd);
    $("#seccion_producto_" + productInfo.id + ":first .buttonsContainer").append(divButtonAdd);
  }


  if (self.iStore.details.availabilityStockStore) {
    // Boton availability
    var divButtonCenter = $('<div></div>').attr({
      'class': 'button_center button_available'
    });
    var aButtonAvail = $('<a></a>').attr({
      'id': 'buttonShowAvail_' + productInfo.id,
      'class': 'buttonText Big Productpage',
      'href': 'javascript:;'
    });
    if (self.iStore.isOpenForSale == false) {
      aButtonAvail.removeClass('buttonText').addClass('button_primary');
    }
    aButtonAvail.data('currentData', {
      colorInfo: colorInfo,
      product: productInfo
    });

    self.log && console.log('NVP-log button 4');
    var spanButtonAvail = $('<span></span>').attr({
      'class': 'textButton'
    }).append(inditex.text('BUTTON_AVAILABILITY'));

    aButtonAvail.append(spanButtonAvail);
    divButtonCenter.append(aButtonAvail);

    //$(".buttonsContainer").append(divButtonCenter);
    $("#menuDisponi_").append(aButtonAvail);

  }

};


ItxMobileProductPageClass.prototype._loadBundleBinding = function () {
  var self = this;

  self._loadBackBinding();

  // Binding
  self._loadExtraInfoShowBinding();

  if (self.iStore.isOpenForSale == true) {
    // Botón add to cart
    $('div[id^="buttonBundleAddCart_"]').hammer().off('tap');
    $('div[id^="buttonBundleAddCart_"]').hammer().on('tap', function (event) {
      var idProduct = $(this).attr('id').split('_')[1];

      if ($(this).hasClass('inactive')) {
        return false;
      };

      //$('#formProductPage_' + idProduct + ' .sizeSelector > .containerSizes').css('max-height', '130px');

      var liselecteds = $("#sizeSelect_" + idProduct).find("li.selected");
      if ($("#formProductPage_" + idProduct + " .productMoreDetails").hasClass('hide')) {

        $('.swiper-container-productos').addClass('swiper-no-swiping');


        var datasColor = $(".activeProduct .color_palette a.active").data();
        if (!datasColor) {
          var datasColor = $("#formProductPage_" + idProduct + " .color_palette").find("a.active").data();
        }

        var valores = $("#buttonBundleAddCart_" + idProduct).data("currentData");

        valores.colorInfo = datasColor.currentData.colorInfo;
        //$("#buttonAddCart_" + idProduct).data("currentData", valores);


        var currentDataButton = $(this).data("currentData");
        var dataProduct = currentDataButton["product"];
        var dataColor = currentDataButton["colorInfo"];

        // -- tallas
        //self._drawSizes($('#formProductPage_' + idProduct + ' .productMoreDetails'), dataColor, dataProduct);
        var alturatotal = $(document).height();
        alturatotal = alturatotal - $("#header").height() - 78;

        //alturatotal = alturatotal - $("#formProductPage_" + idProducto + " .CarrouselContainer .title-related").innerHeight() + 10;


        $("#formProductPage_" + idProduct + " .productDetailsExtended").addClass("bundle-buy");
        $("#formProductPage_" + idProduct + " .productMoreDetails").removeClass("hide");
        $("#formProductPage_" + idProduct + " .productDetails").hide();
        $("#formProductPage_" + idProduct + " .productMoreDetails").show();
        $("#formProductPage_" + idProduct + " .productDetails").hide();

        // if (alturatotal < $('ul.sizesSelectorContainer').height()) {
        //   alturatotal = $('ul.sizesSelectorContainer').height();
        // }
        // $("#formProductPage_" + idProduct + " .productMoreDetails").css('height', alturatotal + 'px');
        $('div.btnBack a').hammer().off().on('tap', function () {
          $('.swiper-container-productos').removeClass('swiper-no-swiping');
          $("#formProductPage_" + idProduct + " .productDetailsExtended").removeClass("bundle-buy");
          $("#formProductPage_" + idProduct + " .productMoreDetails").addClass("hide");
          $("#formProductPage_" + idProduct + " .productMoreDetails").hide();
          $("#formProductPage_" + idProduct + " .productDetails").show();
          $("#formProductPage_" + idProduct + " .productMoreDetails .size.active").trigger('tap');
          $('div.btnBack a').hammer().off('tap').on('tap', function () {
            self._loadBackBinding();
          });


        })


        $(".CarrouselContainer").hammer().off("tap");
        $(".CarrouselContainer").hammer().on("tap", function (event) {

          $(".productMoreDetails").addClass("hide");

          $("#formProductPage_" + idProduct + " .productDetailsExtended").removeClass("transparente");
          $("#formProductPage_" + idProduct + " .productMoreDetails").addClass("hide");
          $("#formProductPage_" + idProduct + " .productMoreDetails").hide();
          $("[id^=buttonBundleAddCart_]").removeClass("inactive");
          //$("[id^=buttonBundleAddCart_]").find("span").html(inditex.text('BUTTON_ADD_TO_CART'));

          $(".CarrouselContainer").hammer().off("tap");
        });

      } else {
        var sizes = [];
        var activeSize;
        var items = [];
        var index = 0;
        var product;
        var elements = $("#formProductPage_" + idProduct + " .productMoreDetails .bundleProduct:not(.off)");
        var selectedSizes = elements.find('.size.active');
        if (elements.length && selectedSizes.length && elements.length === selectedSizes.length) {
          elements.each(function () {
            index = $(this).hasClass('top') ? 0 : 1;
            activeSize = $(this).find('.size.active');
            product = inditex.iXProductInfo.bundleProductSummaries[index];

            if (activeSize.length) {
              $(this).find('.sizes').removeClass('sizes-error-arrow');
              $(this).find('.size-error').removeClass('on');
              sizes.push({
                size: activeSize.text(),
                price: activeSize.data('price'),
                sku: activeSize.attr('ref')
              });


              items.push({
                sku: activeSize.attr('ref'),
                parentId: idProduct,
                categoryId: inditex.iCategoryId,
                name: product.name,
                color: product.detail.colors[0].name,
                quantity: 1,
                unitPrice: activeSize.data('price'),
                image: product.detail.colors[0].image,
                reference: product.reference,
                productType: product.productType,
                size: activeSize.text(),
                productId: idProduct,
                categoryType: self.iCategoryInfo.type
              });

            }
          })

          var origin = {
            categoryType: null,
            categoryData: null,
            parentId: inditex.iXProductInfo.id,
            productId: idProduct
          };


          //   var selectedSizeIndex = $('#sizeSelect_' + dataProduct.id + ' li.selected').index();

          $('.swiper-container-productos').removeClass('swiper-no-swiping');
          self._AddBundleToBasket(items, origin, idProduct);

          selectedSizes.trigger('tap');
        } else {

          elements.each(function () {
            index = $(this).hasClass('top') ? 0 : 1;
            activeSize = $(this).find('.size.active');
            if (!activeSize.length) {
              $(this).find('.sizes').addClass('sizes-error-arrow');
              $(this).find('.size-error').addClass('on');

            }
          });

        }

        //   $('#buttonWant_' + idProduct).addClass("hide");
        //   $('#buttonVerCart_' + idProduct).show();

        //   self._checkTrackConversions(dataProduct);

        //   $.event.trigger({
        //     type: 'productPage.addToCart',
        //     cf: 'checkout',
        //     category: 'ficha_producto',
        //     selectedSizeIndex: selectedSizeIndex,
        //     selectedSize: size.name,
        //     selectedColorId: dataColor.id,
        //     selectedColor: dataColor.name,
        //     price: inditex.formatNumber(size.price),
        //     productId: productId,
        //     productCategory: dataProduct.family + '/' + dataProduct.subFamily,
        //     list: (self.searchTerm) ? 'buscador' : (self.fromi && $.isNumeric(self.fromi)) ? 'productos_relacionados' : (self.from && $.isNumeric(self.from)) ? 'lookbook_' + productId : 'parrilla_' + (window.sessionStorage.getItem('productActionFieldList') || ''),
        //     productIndex: (self.fromi && $.isNumeric(self.fromi)) ? window.sessionStorage.getItem('relatedProductIndex') : window.sessionStorage.getItem('productIndex')
        //   });
        //}
        //}
      }
    });

  }
}

ItxMobileProductPageClass.prototype._drawBundleProduct = function (subProduct, index, stock) {

  var self = this;

  var rangeProductPrice = itxMobileRenderGrid.rangePriceProduct(subProduct, null, null);
  var colorSelectionado = self.iColorInfo.id;

  var image = subProduct.detail.colors[0].image;
  var imageUrl = inditex.getProductImageUrls(image, 1, 3);

  var priceRange = itxMobileRenderGrid.rangePriceProduct(subProduct);
  var priceElement = self._drawPricesRelated(null, true, subProduct, priceRange);

  var sizes = subProduct.detail.colors[0].sizes.map(function (size) {
    return {
      size: size.name,
      sku: size.sku,
      price: size.price
    }
  });

  var data = {
    prod: {
      id: subProduct.parentId,
      type: index === 0 ? 'top' : 'bottom',
      name: subProduct.name,
      sizes: sizes,
      price: priceElement.html(),
      colorUrl: Inditex.getProductImageUrls(subProduct.detail.colors[0].image, 3, 5),
      image: imageUrl
    }
  };
  //console.log('NVP-log data', data);

  var bundleProduct = inditex.xGetTemplate('bundleProduct', data);

  return bundleProduct;

}

ItxMobileProductPageClass.prototype._addBundleSizeSelectorBindings = function (element) {
  var self = this;
  // $(element + ' input.cmn-toggle').off('change').on('change', function (e) {
  //   var id = $(this).attr('id');
  //   var product = $(element).find('.bundleProduct.' + id).toggleClass();
  //   $('.status').toggleClass('off', !$(this).prop('checked'));
  // })

}

ItxMobileProductPageClass.prototype._recalculateTotal = function (product, size) {
  var self = this;
  var total = 0;
  var selectedSizes = product.parent().find('.bundleProduct .size.active');

  if (selectedSizes.length) {
    selectedSizes.each(function () {
      total += parseInt($(this).data('price'));
    }, 0);
    var title = selectedSizes.length === 1 ?
      inditex.text('ItxProducPage.bundle.add.one') :
      inditex.text('ItxProducPage.bundle.add.n', 2);

    $('.secctionName .numeroProductosParrilla').html(inditex.formatPrice(total));
    $('.secctionName .title').html(title);
  } else {
    $('.secctionName .numeroProductosParrilla').html('');
    $('.secctionName .title').html(inditex.iXProductInfo.name);
  }
}

ItxMobileProductPageClass.prototype._addSizesBindings = function (element) {
  var self = this;
  element.find('.size').hammer().off('tap').on('tap', function () {
    $(this).toggleClass('active');
    if ($(this).hasClass('active')) {
      $(this).siblings().removeClass('active');
      element.find('.size-error').removeClass('on');
      element.find('ul.sizes').removeClass('sizes-error-arrow');
    }
    self._recalculateTotal(element);

  });

};

ItxMobileProductPageClass.prototype.drawBundleSizeSelector = function (product) {
  var self = this;
  var itemStock, itemElement;
  var prodIds = product.bundleProductSummaries.map(function (subProd) {
    return subProd.id;
  });
  var container = $("#formProductPage_" + product.id + " .productMoreDetails");
  container.empty();
  var sizesSelectorContainer = $('<ul>').addClass('sizesSelectorContainer');
  inditex.xRestGetProductStock(prodIds).done(function (stocks) {

    _.each(product.bundleProductSummaries, function (subProd, index) {
      itemStock = _.find(stocks, function (item) {
        return item.productId === subProd.id;
      });
      itemElement = $(self._drawBundleProduct(subProd, index, itemStock));

      itemElement.find('input.cmn-toggle').off('change').on('change', function (e) {
        var id = $(this).attr('id');
        var product = container.find('.bundleProduct.' + id).toggleClass('off', !$(this).prop('checked'));
        if (!$(this).prop('checked')) {
          var selectedSize = container.find('.bundleProduct.' + id + ' .size.active');
          if (selectedSize.length) {
            selectedSize.trigger('tap');
          }
          $('.bundleProduct.' + id + ' .size-error').removeClass('on');
          $('.bundleProduct.' + id + ' ul.sizes').removeClass('sizes-error-arrow');
        }
      });

      self._addSizesBindings(itemElement);
      sizesSelectorContainer.append(itemElement);
    });


  })
  container.append(sizesSelectorContainer);
  self._addBundleSizeSelectorBindings("#formProductPage_" + product.id + " .productMoreDetails");

};