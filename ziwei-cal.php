<?php
declare(strict_types=1);

/**
 * Plugin Name: Ziwei Cal
 * Description: Ziwei Doushu Chart Calculator
 * Version: 0.6.1.1
 * Author: kcy1989
 * License: GPL v2 or later
 * Text Domain: ziwei-cal
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('ZIWEI_CAL_VERSION', '0.6.1.1'); // Bump version to force cache refresh
define('ZIWEI_CAL_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ZIWEI_CAL_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Register REST API endpoints for the calculator.
 *
 * @return void
 */
function ziwei_cal_register_rest_routes(): void {
    register_rest_route('ziwei-cal/v1', '/calculate', [
        'methods' => WP_REST_Server::CREATABLE,  // POST
        'callback' => 'ziwei_cal_calculate_chart',
        'permission_callback' => function($request) {
            // Public endpoint but require X-WP-Nonce header for CSRF protection
            $nonce = '';
            if ($request instanceof WP_REST_Request) {
                $nonce = $request->get_header('X-WP-Nonce') ?: $request->get_header('x-wp-nonce');
            }
            if (empty($nonce) && isset($_SERVER['HTTP_X_WP_NONCE'])) {
                $nonce = $_SERVER['HTTP_X_WP_NONCE'];
            }
            if (empty($nonce)) {
                return new WP_Error('rest_forbidden', 'Missing REST nonce', ['status' => 403]);
            }
            if (!wp_verify_nonce($nonce, 'wp_rest')) {
                return new WP_Error('rest_forbidden', 'Invalid REST nonce', ['status' => 403]);
            }
            return true;
        },
        'args' => [
            'name' => [
                'required' => false,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'gender' => [
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'enum' => ['M', 'F'],
            ],
            'year' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint',
                'minimum' => 1900,
                'maximum' => 2100,
            ],
            'month' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint',
                'minimum' => 1,
                'maximum' => 12,
            ],
            'day' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint',
                'minimum' => 1,
                'maximum' => 31,
            ],
            'hour' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint',
                'minimum' => 0,
                'maximum' => 23,
            ],
            'minute' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint',
                'minimum' => 0,
                'maximum' => 59,
            ],
            'birthplace' => [
                'required' => false,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ],
    ]);
    
    // Add schema
    register_rest_field('ziwei-cal', 'schema', [
        'schema' => [
            'description' => __('Ziwei Doushu calculation response schema', 'ziwei-cal'),
            'type' => 'object',
            'properties' => [
                'success' => [
                    'type' => 'boolean',
                    'description' => __('Whether the calculation was successful', 'ziwei-cal'),
                ],
                'data' => [
                    'type' => 'object',
                    'description' => __('The calculation result data', 'ziwei-cal'),
                ],
                'message' => [
                    'type' => 'string',
                    'description' => __('A message describing the result', 'ziwei-cal'),
                ],
            ],
        ],
    ]);
}
add_action('rest_api_init', 'ziwei_cal_register_rest_routes');

/*
 * Server-side HKO API-based lunar conversion and fallback removed.
 * Lunar conversion is performed client-side using the included
 * `LunarSolarConverter` (assets/calculate/common/lunar-converter.js) which supports
 * years 1900-2100. The REST API now expects lunar data to be provided
 * by the frontend where applicable.
 */

/**
 * Calculate Ziwei Doushu chart based on form data.
 *
 * @param WP_REST_Request $request The REST API request object.
 * @return WP_REST_Response The REST API response.
 */
function ziwei_cal_calculate_chart(WP_REST_Request $request): WP_REST_Response {
    try {
        $params = $request->get_params();

        // Log request data for debugging if WP_DEBUG is enabled
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('Ziwei Cal API Request: ' . json_encode($params));
        }

    // Validate required fields per contract (name optional)
    $required_fields = ['gender', 'year', 'month', 'day', 'hour', 'minute'];
        foreach ($required_fields as $field) {
            // Use isset() and !== null for numeric fields (0 is valid), empty string for text fields
            if (!isset($params[$field]) || $params[$field] === '' || $params[$field] === null) {
                return new WP_REST_Response([
                    'success' => false,
                    'message' => "Missing required field: {$field}",
                    'code' => 'missing_field',
                    'data' => [ 'status' => 400, 'message' => "Missing required field: {$field}" ]
                ], 400);
            }
        }

        // Lunar data is now provided by the frontend (converted in JavaScript)
        // Extract lunar data from params if provided
        $lunar_data = null;
        if (isset($params['lunar']) && is_array($params['lunar'])) {
            $lunar_data = $params['lunar'];
        }

        // Process data and generate chart
        $chart_data = [
            'success' => true,
            'message' => '命盤生成成功。',
            'data' => [
                'name' => $params['name'],
                'gender' => $params['gender'],
                'birthdate' => sprintf('%04d-%02d-%02d',
                    $params['year'],
                    $params['month'],
                    $params['day']
                ),
                'birthtime' => sprintf('%02d:%02d',
                    $params['hour'],
                    $params['minute']
                ),
                'birthplace' => $params['birthplace'] ?? '',
                'lunar' => $lunar_data, // Use lunar data from frontend
            ]
        ];

        // Debug: log response when WP_DEBUG is enabled
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('Ziwei Cal API Response: ' . json_encode($chart_data));
        }

        // Return REST API response
        return new WP_REST_Response($chart_data, 200);

    } catch (Exception $e) {
        error_log('Ziwei Cal API Error: ' . $e->getMessage());
        return new WP_REST_Response([
            'success' => false,
            'message' => '系統錯誤，請稍後再試。',
            'code' => 'server_error',
            'data' => ['status' => 500, 'message' => '系統錯誤，請稍後再試。']
        ], 500);
    }
}

/**
 * Check if frontend assets should be enqueued on the current page.
 *
 * Only enqueue on pages that:
 * 1. Contain the [ziwei_cal] shortcode
 * 2. Use a custom page template (future support)
 *
 * @return bool True if assets should be enqueued, false otherwise
 */
function should_enqueue_frontend_assets(): bool {
    // Check if we're on the frontend
    if (is_admin()) {
        return false;
    }
    
    // Get the current post/page
    $post = get_queried_object();
    
    if (!$post || !is_a($post, 'WP_Post')) {
        return false;
    }
    
    // Check if the page contains [ziwei_cal] shortcode
    if (has_shortcode($post->post_content, 'ziwei_cal')) {
        return true;
    }
    
    // Future: Check for custom page templates
    // $template = get_page_template_slug($post->ID);
    // if (!empty($template) && strpos($template, 'ziwei') !== false) {
    //     return true;
    // }
    
    return false;
}

/**
 * Enqueue styles and scripts for the plugin.
 *
 * @return void
 */
function ziwei_cal_enqueue_scripts(): void {
    // Only enqueue on pages with [ziwei_cal] shortcode
    if (!should_enqueue_frontend_assets()) {
        return;
    }
    
    wp_enqueue_style(
        'ziwei-cal-form',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/css/form.css',
        [],
        ZIWEI_CAL_VERSION
    );

    wp_enqueue_style(
        'ziwei-cal-chart',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/css/chart.css',
        [],
        ZIWEI_CAL_VERSION
    );

    wp_enqueue_style(
        'ziwei-cal-control',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/css/control.css',
        [],
        ZIWEI_CAL_VERSION
    );

    wp_enqueue_style(
        'ziwei-cal-cycles',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/css/cycles.css',
        [],
        ZIWEI_CAL_VERSION
    );

    wp_enqueue_style(
        'ziwei-cal-palace-interaction',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/css/palace-interaction.css',
        [],
        ZIWEI_CAL_VERSION
    );

    wp_enqueue_style(
        'ziwei-cal-config',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/css/config.css',
        [],
        ZIWEI_CAL_VERSION
    );

    wp_enqueue_style(
        'ziwei-cal-share',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/css/share.css',
        [],
        ZIWEI_CAL_VERSION
    );

    // Enqueue constants module FIRST (before all other scripts)
    wp_enqueue_script(
        'ziwei-cal-constants',
        ZIWEI_CAL_PLUGIN_URL . 'assets/data/constants.js',
        [],  // No dependencies
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue lunar converter library (supports 1900-2100)
    wp_enqueue_script(
        'ziwei-cal-lunar-converter',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/common/lunar-converter.js',
        ['ziwei-cal-constants'],
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue palace names data (supports multiple schools)
    wp_enqueue_script(
        'ziwei-cal-palaces-name',
        ZIWEI_CAL_PLUGIN_URL . 'assets/data/palaces-name.js',
        ['ziwei-cal-constants'],
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue basic astrology module (date/time conversions)
    wp_enqueue_script(
        'ziwei-cal-basic',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/basic.js',
        ['ziwei-cal-constants'],
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue Nayin (納音) five elements loci table
    wp_enqueue_script(
        'ziwei-cal-nayin',
        ZIWEI_CAL_PLUGIN_URL . 'assets/data/nayin.js',
        ['ziwei-cal-constants'],
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue Zhongzhou School four mutations table (中州派四化表)
    wp_enqueue_script(
        'ziwei-cal-mutation-zhongzhou',
        ZIWEI_CAL_PLUGIN_URL . 'assets/data/mutation.js',
        ['ziwei-cal-constants'],
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue astrology modules
    wp_enqueue_script(
        'ziwei-cal-gender',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/gender-calculator.js',
        ['ziwei-cal-constants'],
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue palaces calculation module (Ziwei Doushu system logic)
    wp_enqueue_script(
        'ziwei-cal-palaces',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/palaces.js',
        ['ziwei-cal-palaces-name', 'ziwei-cal-basic'],  // Depend on palaces-name data and basic module
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue primary stars placement module (14 main stars)
    wp_enqueue_script(
        'ziwei-cal-primary',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/primary.js',
        ['ziwei-cal-nayin'],  // Depend on nayin loci data
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue life cycle module (major cycles and twelve life stages)
    wp_enqueue_script(
        'ziwei-cal-life-cycle',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/life-cycle.js',
        ['ziwei-cal-constants'],
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue secondary stars placement module (13 secondary stars)
    wp_enqueue_script(
        'ziwei-cal-secondary',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/secondary.js',
        ['ziwei-cal-nayin', 'ziwei-cal-constants'],  // Depend on nayin loci data for five elements calculations
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue four mutations calculation module (四化)
    wp_enqueue_script(
        'ziwei-cal-mutations',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/mutations.js',
        ['ziwei-cal-mutation-zhongzhou', 'ziwei-cal-basic', 'ziwei-cal-constants'],  // Depend on mutation table and basic module
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue minor stars calculation module (雜曜)
    wp_enqueue_script(
        'ziwei-cal-minor-stars',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/minor-stars.js',
        ['ziwei-cal-basic', 'ziwei-cal-constants'],  // Depend on basic module for index calculations
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue attributes calculation module (神煞 - spiritual mood descriptors)
    wp_enqueue_script(
        'ziwei-cal-attributes',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/attributes.js',
        ['ziwei-cal-constants'],  // Depend on constants
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue brightness database (星曜亮度表 - Zhongzhou School)
    wp_enqueue_script(
        'ziwei-cal-brightness-zhongzhou',
        ZIWEI_CAL_PLUGIN_URL . 'assets/data/brightness.js',
        [],  // No dependencies
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue brightness calculation module (星曜亮度計算)
    wp_enqueue_script(
        'ziwei-cal-brightness',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/brightness.js',
        ['ziwei-cal-brightness-zhongzhou'],  // Depend on brightness database
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue major cycle stars calculation module (大限文昌, 大限文曲)
    wp_enqueue_script(
        'ziwei-cal-major-cycle',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/astrology/major-cycle.js',
        ['ziwei-cal-constants'],  // Depend on constants
        ZIWEI_CAL_VERSION,
        true
    );

    wp_enqueue_script(
        'ziwei-cal-data-adapter',
        ZIWEI_CAL_PLUGIN_URL . 'assets/js/data-adapter.js',
        [
            'ziwei-cal-lunar-converter',
            'ziwei-cal-basic',
            'ziwei-cal-palaces-name',
            'ziwei-cal-nayin',
            'ziwei-cal-palaces',
            'ziwei-cal-primary',
            'ziwei-cal-secondary',
            'ziwei-cal-mutations',
            'ziwei-cal-minor-stars',
            'ziwei-cal-attributes',
            'ziwei-cal-brightness',
            'ziwei-cal-life-cycle',
            'ziwei-cal-gender'
        ],
        ZIWEI_CAL_VERSION,
        true
    );

    wp_enqueue_script(
        'ziwei-cal-cycles',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/cycles.js',
        ['ziwei-cal-life-cycle', 'ziwei-cal-constants', 'ziwei-cal-data-adapter'],
        ZIWEI_CAL_VERSION,
        true
    );

    wp_enqueue_script(
        'ziwei-cal-form',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/form.js',
        ['jquery', 'ziwei-cal-lunar-converter', 'ziwei-cal-gender', 'ziwei-cal-data-adapter'],
        ZIWEI_CAL_VERSION,
        true
    );

    wp_enqueue_script(
        'ziwei-cal-chart',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/chart.js',
        ['jquery', 'ziwei-cal-form', 'ziwei-cal-palaces', 'ziwei-cal-primary', 'ziwei-cal-secondary', 'ziwei-cal-mutations', 'ziwei-cal-minor-stars', 'ziwei-cal-attributes', 'ziwei-cal-brightness', 'ziwei-cal-major-cycle', 'ziwei-cal-cycles', 'ziwei-cal-data-adapter'],
        ZIWEI_CAL_VERSION,
        true
    );

    wp_enqueue_script(
        'ziwei-cal-palace-interaction',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/palace-interaction.js',
        ['ziwei-cal-chart'],
        ZIWEI_CAL_VERSION,
        true
    );

    wp_enqueue_script(
        'ziwei-cal-config',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/config.js',
        [],
        ZIWEI_CAL_VERSION,
        true
    );

    wp_enqueue_script(
        'ziwei-cal-control',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/control.js',
        ['ziwei-cal-config'],
        ZIWEI_CAL_VERSION,
        true
    );

    // Enqueue external CDN libraries for share/export functionality (Phase 1: v0.7.0)
    wp_enqueue_script(
        'html2canvas',
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        [],
        '1.4.1',
        true
    );

    wp_enqueue_script(
        'jspdf',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        [],
        '2.5.1',
        true
    );

    // Enqueue share.js module (depends on html2canvas and jsPDF from CDN)
    wp_enqueue_script(
        'ziwei-cal-share',
        ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/share.js',
        ['html2canvas', 'jspdf'],
        ZIWEI_CAL_VERSION,
        true
    );

    wp_enqueue_script(
        'ziwei-cal-js',
        ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/common/calculator.js',
        ['jquery', 'ziwei-cal-form', 'ziwei-cal-chart', 'ziwei-cal-palace-interaction', 'ziwei-cal-control', 'ziwei-cal-share'],
        ZIWEI_CAL_VERSION,
        true
    );

    wp_localize_script(
        'ziwei-cal-js',
        'ziweiCalData',
        array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => esc_url_raw(rest_url('ziwei-cal/v1/calculate')),
            'nonce' => wp_create_nonce('wp_rest'),
            'isDebug' => defined('WP_DEBUG') && WP_DEBUG,
            'pluginUrl' => ZIWEI_CAL_PLUGIN_URL,
            'pluginVersion' => ZIWEI_CAL_VERSION,
            'env' => array(
                'isDebug' => defined('WP_DEBUG') && WP_DEBUG,
                'wpVersion' => get_bloginfo('version'),
                'pluginVersion' => ZIWEI_CAL_VERSION,
            )
        )
    );
}
add_action('wp_enqueue_scripts', 'ziwei_cal_enqueue_scripts');

/**
 * Register shortcode [ziwei_cal] for the calculator form.
 *
 * @return string The form HTML output.
 */
function ziwei_cal_shortcode(): string {
    ob_start();
    include ZIWEI_CAL_PLUGIN_DIR . 'templates/form.php';
    return ob_get_clean();
}
add_shortcode('ziwei_cal', 'ziwei_cal_shortcode');

/**
 * Execute actions when the plugin is activated.
 *
 * @return void
 */
function ziwei_cal_activate(): void {
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'ziwei_cal_activate');

/**
 * Execute actions when the plugin is deactivated.
 *
 * @return void
 */
function ziwei_cal_deactivate(): void {
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'ziwei_cal_deactivate');
