function measureDocumentScrollSize ( $html, $body, $content, reachableAreaOnly ) {

    var rightWindowContentEdge, bottomWindowContentEdge,
        htmlRect, bodyRect, contentRect,

        html = $html[0],
        body = $body[0],
        content = $content[0],

        _document = html.ownerDocument,
        _window = _document.defaultView || _document.parentWindow,
        $window = $( _window ),

        htmlMarginBottom = parseInt( $html.css( "marginBottom" ) ),
        bodyMarginBottom = parseInt( $body.css( "marginBottom" ) ),
        contentMarginBottom = parseInt( $content.css( "marginBottom" ) ),

        bodyPosition = $body.css( "position" ),
        contentPosition = $content.css( "position" ),

        appliedOverflows = getAppliedViewportOverflows(
            $html.css( [ "overflow", "overflowX", "overflowY" ] ),
            $body.css( [ "overflow", "overflowX", "overflowY" ] )
        );

    // Make sure everything is scrolled to the top before taking measurements
    html.scrollTop = body.scrollTop = content.scrollTop = 0;

    // Because we have control of the scroll, we can establish the absolute right and bottom boundaries with
    // getBoundingClientRect, saving us from fussy calculations based on position and offsets.
    htmlRect = getBoundingClientRectCompat( document.documentElement );
    bodyRect = getBoundingClientRectCompat( body );
    contentRect = getBoundingClientRectCompat( content );

    // Horizontal dimension
    if ( appliedOverflows.window.overflowHiddenX && reachableAreaOnly ) {

        // Nothing is shown beyond the edge of the window. The style `html { overflow: hidden; }` is applied to the
        // window, not the html element. That matters if the html element is larger than the window, e.g. with
        // `html { width: 120%; }`. Content is unreachable beyond the window edge (and not just beyond the html
        // edge).
        //
        // This limit does **not** affect the scrollWidth of the document because scrollWidth captures the size of the
        // content even if it is hidden. Only relevant if we want to know the size of the "reachable area".
        rightWindowContentEdge = $window.width();

    } else {

        if ( appliedOverflows.body.overflowVisibleX || bodyPosition === "static" && contentPosition === "absolute" ) {

            // Overflowing content is not constrained by the limits of the body
            rightWindowContentEdge = Math.max(
                // Right body content edge
                contentRect.right,
                // Right edge of body element
                bodyRect.right,
                // Right edge of the html element (document element)
                htmlRect.right
            );

        } else {

            // Overflowing content is hidden outside the limits of the body, or tucked away in a scrollable area - ignore
            rightWindowContentEdge = Math.max(
                // Right body edge
                bodyRect.right,
                // Right edge of the html element (document element)
                htmlRect.right
            );

        }
    }

    // Vertical dimension
    if ( appliedOverflows.window.overflowHiddenY && reachableAreaOnly ) {

        // Nothing is shown beyond the edge of the window. The style `html { overflow: hidden; }` is applied to the
        // window, not the html element. That matters if the html element is larger than the window, e.g. with
        // `html { width: 120%; }`. Content is unreachable beyond the window edge (and not just beyond the html
        // edge).
        //
        // This limit does **not** affect the scrollHeight of the document because scrollHeight captures the size of the
        // content even if it is hidden. Only relevant if we want to know the size of the "reachable area".
        bottomWindowContentEdge = $window.width();

    } else {

        if ( appliedOverflows.body.overflowVisibleY || bodyPosition === "static" && contentPosition === "absolute" ) {

            // Overflowing content is not constrained by the limits of the body
            bottomWindowContentEdge = Math.max(
                // Bottom body content edge
                contentRect.bottom + contentMarginBottom,
                // Bottom edge of body element
                bodyRect.bottom + bodyMarginBottom,
                // Bottom edge of the html element (document element)
                htmlRect.bottom + htmlMarginBottom
            );

        } else {

            // Overflowing content is hidden outside the limits of the body, or tucked away in a scrollable area - ignore
            bottomWindowContentEdge = Math.max(
                // Bottom body edge
                bodyRect.bottom + bodyMarginBottom,
                // Bottom edge of the html element (document element)
                htmlRect.bottom + htmlMarginBottom
            );

        }
    }

    return {

        width: Math.max(
            rightWindowContentEdge,
            // Right window edge, in case the document is smaller than the window
            $window.width()
        ),

        height: Math.max(
            bottomWindowContentEdge,
            // Bottom window edge, in case the document is smaller than the window
            $window.height()
        )

    };
}

/**
 * Returns the bounding client rect, including width and height properties. For compatibility with IE8, which
 * supports getBoundingClientRect but doesn't calculate width and height.
 *
 * Use only when width and height are actually needed.
 *
 * Will be removed when IE8 support is dropped entirely.
 *
 * @param   {HTMLElement} elem
 * @returns {ClientRect}
 */
function getBoundingClientRectCompat ( elem ) {
    var elemRect = elem.getBoundingClientRect();

    if ( elemRect.width === undefined || elemRect.height === undefined ) {
        // Fix for IE8
        elemRect = {
            top: elemRect.top,
            left: elemRect.left,
            bottom: elemRect.bottom,
            right: elemRect.right,
            width:  elemRect.right - elemRect.left,
            height: elemRect.bottom - elemRect.top
        };
    }

    return elemRect;
}

/**
 * Determines the effective overflow setting of an element, separately for each axis, based on the `overflow`,
 * `overflowX` and `overflowY` properties of the element which must be passed in as a hash.
 *
 * Returns a hash of the computed results for overflowX, overflowY. Also adds boolean status properties to the hash
 * if the createBooleans flag is set. These are properties for mere convenience. They signal if a particular
 * overflow type applies (e.g. overflowHiddenX = true/false).
 *
 * ATTN The method does not take the special relation of body and documentElement into account. That is handled by
 * the more specific getAppliedViewportOverflows() function.
 *
 * The effective overflow setting is established as follows:
 *
 * - If a computed value for `overflow(X/Y)` exists, it gets applied to the axis.
 * - If not, the computed value of the general `overflow` setting gets applied to the axis.
 * - If there is no computed value at all, the overflow default gets applied to the axis. The default is
 *   "visible" in seemingly every browser out there. Falling back to the default should never be necessary,
 *   though, because there always is a computed value.
 *
 * @param {Object}        props            hash of element properties (computed values)
 * @param {string}        props.overflow
 * @param {string}        props.overflowX
 * @param {string}        props.overflowY
 * @param {boolean=false} createBooleans   if true, create the full set of boolean status properties, e.g.
 *                                         overflowVisibleX (true/false), overflowHiddenY (true/false) etc
 * @returns {AppliedOverflow}              hash of the computed results: overflowX, overflowY, optional boolean
 *                                         status properties
 */
function getAppliedOverflows ( props, createBooleans ) {
    var status = {};

    // Establish the applied overflow (e.g. overflowX: "scroll")
    status.overflowX = props.overflowX || props.overflow || "visible";
    status.overflowY = props.overflowY || props.overflow || "visible";

    // Create the derived boolean status properties (e.g overflowScrollX: true)
    if ( createBooleans ) {
        $.each( [ "Visible", "Auto", "Scroll", "Hidden" ], function ( index, type ) {
            var lcType = type.toLowerCase();
            status["overflow" + type + "X"] = status.overflowX === lcType;
            status["overflow" + type + "Y"] = status.overflowY === lcType;
        } );
    }

    return status;
}

/**
 * Determines the effective overflow setting of the viewport and body, separately for each axis, based on the
 * `overflow`, `overflowX` and `overflowY` properties of the documentElement and body which must be passed in as a
 * hash.
 *
 * Returns the results for viewport and body in an aggregated `{ window: ..., body: ...}` hash.
 *
 * For the basic resolution mechanism, see getAppliedOverflows(). When determining the effective overflow, the
 * peculiarities of viewport and body are taken into account:
 *
 * - Viewport and body overflows are interdependent. If the nominal viewport overflow for a given axis is "visible",
 *   the viewport inherits the body overflow for that axis, and the body overflow is set to "visible". Curiously,
 *   that transfer is _not_ reflected in the computed values, it just manifests in behaviour.
 *
 * - Once that is done, if the viewport overflow is still "visible" for an axis, it is effectively turned into
 *   "auto". Scroll bars appear when the content overflows the viewport (ie, "auto" behaviour). Hence, this function
 *   will indeed report "auto". Again, the transformation is only manifest in behaviour, not in the computed values.
 *
 * - In iOS, if the effective overflow setting of the viewport is "hidden", it is ignored and treated as "auto".
 *   Content can still overflow the viewport, and scroll bars appear as needed.
 *
 *   Now, the catch. This behaviour is impossible to feature-detect. The computed values are not at all affected by
 *   it, and the results reported eg. for clientHeight, offsetHeight, scrollHeight of body and documentElement do
 *   not differ between Safari on iOS and, say, Chrome. The numbers don't give the behaviour away.
 *
 *   So we have to resort to browser sniffing here. It sucks, but there is literally no other option.
 *
 * NB Additional status properties (see getAppliedOverflows) are always generated here.
 *
 * @param {Object} documentElementProps            hash of documentElement properties (computed values)
 * @param {string} documentElementProps.overflow
 * @param {string} documentElementProps.overflowX
 * @param {string} documentElementProps.overflowY
 *
 * @param {Object} bodyProps                       hash of body properties (computed values)
 * @param {string} bodyProps.overflow
 * @param {string} bodyProps.overflowX
 * @param {string} bodyProps.overflowY
 *
 * @returns {{window: AppliedOverflow, body: AppliedOverflow}}
 */
function getAppliedViewportOverflows ( documentElementProps, bodyProps ) {
    var _window = getAppliedOverflows( documentElementProps, false ),
        body = getAppliedOverflows( bodyProps, false ),
        consolidated = { window: {}, body: {} };

    // Handle the interdependent relation between body and window (documentElement) overflow
    if ( _window.overflowX === "visible" ) {
        // If the window overflow is set to "visible", body props get transferred to the window, body changes to
        // "visible". (Nothing really changes if both are set to "visible".)
        consolidated.body.overflowX = "visible";
        consolidated.window.overflowX = body.overflowX;
    } else {
        // No transfer of properties.
        // - If body overflow is "visible", it remains that way, and the window stays as it is.
        // - If body and window are set to properties other than "visible", they keep their divergent settings.
        consolidated.body.overflowX = body.overflowX;
        consolidated.window.overflowX = _window.overflowX;
    }

    // Repeat for overflowY
    if ( _window.overflowY === "visible" ) {
        consolidated.body.overflowY = "visible";
        consolidated.window.overflowY = body.overflowY;
    } else {
        consolidated.body.overflowY = body.overflowY;
        consolidated.window.overflowY = _window.overflowY;
    }

    // window.overflow(X/Y): "visible" actually means "auto" because scroll bars appear as needed; transform
    if ( consolidated.window.overflowX === "visible" ) consolidated.window.overflowX = "auto";
    if ( consolidated.window.overflowY === "visible" ) consolidated.window.overflowY = "auto";

    // In iOS, window.overflow(X/Y): "hidden" actually means "auto"; transform
    if ( isIOS() ) {
        if ( consolidated.window.overflowX === "hidden" ) consolidated.window.overflowX = "auto";
        if ( consolidated.window.overflowY === "hidden" ) consolidated.window.overflowY = "auto";
    }

    // Add the boolean status properties to the result
    consolidated.window = getAppliedOverflows( consolidated.window, true );
    consolidated.body = getAppliedOverflows( consolidated.body, true );

    return consolidated;
}

/**
 * @name  AppliedOverflow
 * @type  {Object}
 *
 * @property {string}  overflowX
 * @property {string}  overflowY
 * @property {boolean} overflowVisibleX
 * @property {boolean} overflowVisibleY
 * @property {boolean} overflowAutoX
 * @property {boolean} overflowAutoY
 * @property {boolean} overflowScrollX
 * @property {boolean} overflowScrollY
 * @property {boolean} overflowHiddenX
 * @property {boolean} overflowHiddenY
 */