<?php
/**
 * Plugin Name: Scoover – Store API kosár-kiterjesztés
 * Description: Fogadja a Scoover roller-fólia híd szerver (server/) által a
 *              WooCommerce Store API add-item hívásába csomagolt egyedi
 *              konfigurációt (modell, szint, minta, feltöltött kép,
 *              felirat, taposó-extra, hitelesített egységár), megjeleníti
 *              kosár- és rendelés-tételként, alkalmazza a szerver által már
 *              kiszámolt árat, és a CUSTOM (egyedi kép) tételt tartalmazó
 *              rendeléseket kézi jóváhagyásra váró státuszba teszi fizetés
 *              után.
 * Version:     0.1.0
 *
 * TELEPÍTÉS: másold a wp-content/mu-plugins/ mappába (nincs szükség
 * aktiválásra – a mu-plugins automatikusan fut), vagy alakítsd normál
 * pluginná. NEM lett éles WooCommerce-en tesztelve (a fejlesztési kör
 * ehhez nem tartalmazott telepített WordPress/WooCommerce-t) – a "MEGERŐSÍTVE"
 * jelölésű részek a hivatalos WooCommerce forráskód/dokumentáció alapján
 * ellenőrzöttek, az "ELLENŐRIZENDŐ" jelölésű rész a konkrét élő
 * WooCommerce-verzión tesztelendő, mielőtt élesbe megy.
 */

defined( 'ABSPATH' ) || exit;

const SCOOVER_NS = 'scoover';

/**
 * 1) A híd szerver a Store API add-item kérés törzsében egy nem szabványos
 * "scoover" mezőben küldi a tétel egyedi adatait. A CartAddItem route nem
 * korlátozza a request törzsét csak az id/quantity/variation mezőkre, ezért
 * ez a mező eljut ide, a `woocommerce_store_api_add_to_cart_data` szűrőbe
 * (MEGERŐSÍTVE: WooCommerce core, plugins/woocommerce/src/StoreApi/Routes/V1/
 * CartAddItem.php – ez a szűrő $add_to_cart_data = ['id','quantity',
 * 'variation','cart_item_data'] tömböt és a $request objektumot kapja).
 */
add_filter( 'woocommerce_store_api_add_to_cart_data', function ( $add_to_cart_data, WP_REST_Request $request ) {
	$scoover = $request->get_param( 'scoover' );
	if ( is_array( $scoover ) ) {
		$add_to_cart_data['cart_item_data'][ SCOOVER_NS ] = scoover_sanitize_payload( $scoover );
	}
	return $add_to_cart_data;
}, 10, 2 );

function scoover_sanitize_payload( array $s ) {
	return [
		'model'             => sanitize_text_field( $s['model'] ?? '' ),
		'tier'              => sanitize_text_field( $s['tier'] ?? '' ),
		'category'          => isset( $s['category'] ) ? sanitize_text_field( $s['category'] ) : null,
		'colorway'          => isset( $s['colorway'] ) ? sanitize_text_field( $s['colorway'] ) : null,
		'density'           => isset( $s['density'] ) ? sanitize_text_field( $s['density'] ) : null,
		'uploadedImageUrl'  => isset( $s['uploadedImageUrl'] ) ? esc_url_raw( $s['uploadedImageUrl'] ) : null,
		'imageTransform'    => is_array( $s['imageTransform'] ?? null ) ? $s['imageTransform'] : null,
		'labels'            => is_array( $s['labels'] ?? null ) ? $s['labels'] : [],
		'includeFootboard'  => ! empty( $s['includeFootboard'] ),
		// a taposófelület SAJÁT, a fő mintától független terve (minta/kép/
		// felirat) – lásd src/components/FootboardEditor.jsx. Csak akkor
		// nem üres, ha az extra ténylegesen be van kapcsolva.
		'footboard'         => is_array( $s['footboard'] ?? null ) ? [
			'category'         => isset( $s['footboard']['category'] ) ? sanitize_text_field( $s['footboard']['category'] ) : null,
			'colorway'         => isset( $s['footboard']['colorway'] ) ? sanitize_text_field( $s['footboard']['colorway'] ) : null,
			'density'          => isset( $s['footboard']['density'] ) ? sanitize_text_field( $s['footboard']['density'] ) : null,
			'uploadedImageUrl' => isset( $s['footboard']['uploadedImageUrl'] ) ? esc_url_raw( $s['footboard']['uploadedImageUrl'] ) : null,
			'imageTransform'   => is_array( $s['footboard']['imageTransform'] ?? null ) ? $s['footboard']['imageTransform'] : null,
			'label'            => is_array( $s['footboard']['label'] ?? null ) ? $s['footboard']['label'] : null,
		] : null,
		'installation'      => sanitize_text_field( $s['installation'] ?? 'none' ),
		// null/hiányzó = teljes kit (minden darabcsoport); egyébként a
		// ténylegesen kiválasztott (à la carte) darabcsoport-id-k listája.
		'selectedGroupIds'  => is_array( $s['selectedGroupIds'] ?? null )
			? array_map( 'sanitize_text_field', $s['selectedGroupIds'] )
			: null,
		'unitPriceHuf'      => isset( $s['unitPriceHuf'] ) ? (float) $s['unitPriceHuf'] : null,
		'currency'          => sanitize_text_field( $s['currency'] ?? 'HUF' ),
		'requiresApproval'  => ! empty( $s['requiresApproval'] ),
	];
}

/**
 * 2) A kosáradat alapból NEM marad meg oldalújratöltés között – a
 * `woocommerce_get_cart_item_from_session` szűrő visszatölti a session-ből
 * mentett kosárba. Ez régóta stabil, jól dokumentált WooCommerce minta
 * (MEGERŐSÍTVE, évek óta változatlan alap-API).
 */
add_filter( 'woocommerce_get_cart_item_from_session', function ( $cart_item, $values ) {
	if ( isset( $values[ SCOOVER_NS ] ) ) {
		$cart_item[ SCOOVER_NS ] = $values[ SCOOVER_NS ];
	}
	return $cart_item;
}, 10, 2 );

/**
 * 3) A tényleges árat a híd szerver már kiszámolta és hitelesítette
 * (src/pricing.js, szerver oldalon), ezért itt NEM újraszámoljuk, csak
 * alkalmazzuk a kosártétel árára. Ez a szokásos, sokfelé dokumentált
 * WooCommerce minta egyedi/dinamikus árazáshoz (MEGERŐSÍTVE).
 */
add_action( 'woocommerce_before_calculate_totals', function ( $cart ) {
	if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
		return;
	}
	foreach ( $cart->get_cart() as $cart_item ) {
		if ( isset( $cart_item[ SCOOVER_NS ]['unitPriceHuf'] ) && $cart_item[ SCOOVER_NS ]['unitPriceHuf'] !== null ) {
			$cart_item['data']->set_price( (float) $cart_item[ SCOOVER_NS ]['unitPriceHuf'] );
		}
	}
}, 20, 1 );

/**
 * 4) Checkout-kor a kosártétel egyedi adatait átmásoljuk a rendelés-tétel
 * meta adataiba, hogy megjelenjenek a rendelés-visszaigazolásban, az
 * admin felületen és a gyártáshoz felhasználható exportban is.
 * (MEGERŐSÍTVE: `woocommerce_checkout_create_order_line_item` régóta
 * stabil, pontosan erre a célra dokumentált hook.)
 */
add_action( 'woocommerce_checkout_create_order_line_item', function ( $item, $cart_item_key, $values, $order ) {
	if ( empty( $values[ SCOOVER_NS ] ) ) {
		return;
	}
	$s = $values[ SCOOVER_NS ];

	$item->add_meta_data( 'Modell', $s['model'] ?? '', true );
	$item->add_meta_data( 'Szint', strtoupper( $s['tier'] ?? '' ), true );
	if ( ! empty( $s['category'] ) ) $item->add_meta_data( 'Minta-kategória', $s['category'], true );
	if ( ! empty( $s['colorway'] ) ) $item->add_meta_data( 'Színvariáns', $s['colorway'], true );
	if ( ! empty( $s['density'] ) ) $item->add_meta_data( 'Sűrűség', $s['density'], true );
	if ( ! empty( $s['uploadedImageUrl'] ) ) $item->add_meta_data( 'Feltöltött kép', $s['uploadedImageUrl'], true );
	if ( ! empty( $s['labels'] ) ) $item->add_meta_data( 'Feliratok', wp_json_encode( $s['labels'], JSON_UNESCAPED_UNICODE ), true );
	$item->add_meta_data( 'Taposófelület extra', ! empty( $s['includeFootboard'] ) ? 'igen' : 'nem', true );
	if ( ! empty( $s['includeFootboard'] ) && ! empty( $s['footboard'] ) ) {
		$fb = $s['footboard'];
		if ( ! empty( $fb['category'] ) ) $item->add_meta_data( 'Taposó – minta-kategória', $fb['category'], true );
		if ( ! empty( $fb['colorway'] ) ) $item->add_meta_data( 'Taposó – színvariáns', $fb['colorway'], true );
		if ( ! empty( $fb['uploadedImageUrl'] ) ) $item->add_meta_data( 'Taposó – feltöltött kép', $fb['uploadedImageUrl'], true );
		if ( ! empty( $fb['label']['text'] ) ) $item->add_meta_data( 'Taposó – felirat', $fb['label']['text'], true );
	}
	if ( ! empty( $s['installation'] ) && 'none' !== $s['installation'] ) {
		$item->add_meta_data( 'Felrakás (személyes átvétellel)', $s['installation'], true );
	}
	if ( is_array( $s['selectedGroupIds'] ?? null ) ) {
		$item->add_meta_data( 'Darabonkénti választás (à la carte)', implode( ', ', $s['selectedGroupIds'] ), true );
	}

	// Rejtett (admin listákban nem zavaró) gépi mezők a gyártáshoz/logikához.
	$item->add_meta_data( '_scoover_requires_approval', ! empty( $s['requiresApproval'] ) ? 'yes' : 'no', true );
	$item->add_meta_data( '_scoover_raw', wp_json_encode( $s, JSON_UNESCAPED_UNICODE ), true );
}, 10, 4 );

/**
 * 5) CUSTOM (egyedi kép) tételt tartalmazó rendelés megjelölése: kézi
 * jóváhagyásra vár, mielőtt gyártásba megy (felbontás- és
 * jogtisztaság-ellenőrzés). Ehhez egy saját rendelésstátuszt regisztrálunk.
 * (MEGERŐSÍTVE: register_post_status + wc_order_statuses szűrő a
 * dokumentált, szabványos módja egyedi rendelésstátusz felvételének.)
 */
add_action( 'init', function () {
	register_post_status( 'wc-scoover-review', [
		'label'                     => 'Jóváhagyásra vár (egyedi minta)',
		'public'                    => true,
		'exclude_from_search'       => false,
		'show_in_admin_all_list'    => true,
		'show_in_admin_status_list' => true,
		'label_count'               => _n_noop(
			'Jóváhagyásra vár <span class="count">(%s)</span>',
			'Jóváhagyásra vár <span class="count">(%s)</span>'
		),
	] );
} );

add_filter( 'wc_order_statuses', function ( $statuses ) {
	$new = [];
	foreach ( $statuses as $key => $label ) {
		$new[ $key ] = $label;
		if ( 'wc-processing' === $key ) {
			$new['wc-scoover-review'] = 'Jóváhagyásra vár (egyedi minta)';
		}
	}
	return $new;
} );

function scoover_order_needs_review( WC_Order $order ): bool {
	foreach ( $order->get_items() as $item ) {
		if ( 'yes' === $item->get_meta( '_scoover_requires_approval' ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Fizetés véglegesülése UTÁN (a fizetési átjáró már lefutott, az állapot
 * ekkorra jellemzően 'processing'/'completed') visszaírjuk a saját
 * áttekintő státuszra, hogy ne csússzon véletlenül gyártásba. Ez a
 * `woocommerce_payment_complete` action WooCommerce-ben az egyik
 * leggyakrabban használt, régóta stabil hook erre a célra (ELLENŐRIZENDŐ:
 * a hálózati korlátozások miatt ebben a körben nem tudtuk élő
 * WooCommerce-forráson visszaellenőrizni ennek pontos verziófüggő
 * viselkedését – teszteld a választott fizetési átjáróval, mielőtt élesbe
 * megy).
 */
add_action( 'woocommerce_payment_complete', function ( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( $order && scoover_order_needs_review( $order ) && ! $order->has_status( 'scoover-review' ) ) {
		$order->update_status( 'scoover-review', 'Scoover: egyedi (CUSTOM) fóliaminta – gyártás előtt kézi jóváhagyás szükséges (felbontás, jogtisztaság).' );
	}
}, 20 );

// Tartalék: banki átutalásos/utánvétes rendeléseknél nem mindig fut le a
// payment_complete azonnal – a köszönő oldal betöltésekor is ellenőrizzük.
add_action( 'woocommerce_thankyou', function ( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( $order && scoover_order_needs_review( $order ) && ! $order->has_status( 'scoover-review' ) && ! $order->has_status( 'pending' ) ) {
		$order->update_status( 'scoover-review', 'Scoover: egyedi (CUSTOM) fóliaminta – gyártás előtt kézi jóváhagyás szükséges (felbontás, jogtisztaság).' );
	}
} );

/**
 * 6) OPCIONÁLIS/ELLENŐRIZENDŐ – kosár-átadás a klasszikus checkout oldalnak.
 *
 * A híd szerver a Store API-t hívja (Cart-Token alapú, session nélküli
 * mód), de a WooCommerce klasszikus (cookie-session alapú) checkout
 * oldala magától nem ismeri fel ezt a tokent. Amíg ezt nem hidaljuk át,
 * a legegyszerűbb és legbiztonságosabb megoldás: a "Kosárba került!"
 * visszajelzés után a vásárlót a bolt kosár/checkout oldalára irányítjuk,
 * DE a tényleges tétel-hozzáadást a vásárló saját böngészőjéből, a
 * normál (cookie-session) WooCommerce felé is meg kell ismételni, vagy
 * ezt az áthidalást kell megépíteni – lásd server/README.md "Kosár-átadás
 * a pénztárnak" szakasza a részletekért és a lehetséges megoldásokért.
 * Ez egy induló vázlat, ÉLES HASZNÁLAT ELŐTT VALÓDI
 * WOOCOMMERCE-EN TESZTELENDŐ.
 */
// add_action( 'template_redirect', function () {
// 	if ( ! is_checkout() || empty( $_GET['scoover_cart_token'] ) ) return;
// 	// ... token feloldása, majd WC()->cart->add_to_cart() a valódi session-be ...
// } );
