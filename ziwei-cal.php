<?php
declare(strict_types=1);

/**
 * Plugin Name: Ziwei Cal
 * Description: Ziwei Doushu Chart Calculator
 * Version: 1.1.0
 * Author: kcy1989
 * License: GPL v2 or later
 * Text Domain: ziwei-cal
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('ZIWEI_CAL_VERSION', '1.1.1'); // Bump version to force cache refresh
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
        'permission_callback' => '__return_true', // Public endpoint for calculator
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
                'minimum' => 800,
                'maximum' => 2200,
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
 * years 800-2200. The REST API now expects lunar data to be provided
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
 * Class to manage script/style enqueuing, grouped logically for maintainability.
 * Version 0.6.8: Refactored from monolithic function.
 */
class Ziwei_Enqueuer {
    public static function enqueue_all(): void {
        self::enqueue_styles();
        self::enqueue_data_js();
        self::enqueue_astrology_modules();
        self::enqueue_display_modules();
        self::enqueue_calculator();
    }

    private static function enqueue_styles(): void {
        $styles = [
            'form' => 'assets/display/css/form.css',
            'chart' => 'assets/display/css/chart.css',
            'control' => 'assets/display/css/control.css',
            'cycles' => 'assets/display/css/cycles.css',
            'palace-interaction' => 'assets/display/css/palace-interaction.css',
            'config' => 'assets/display/css/config.css',
            'share' => 'assets/display/css/share.css',
            'interpretation-panel' => 'assets/display/css/interpretation-panel.css',
            'ai_mode' => 'assets/display/css/ai_mode.css',
        ];
        foreach ($styles as $handle => $path) {
            wp_enqueue_style("ziwei-cal-{$handle}", ZIWEI_CAL_PLUGIN_URL . $path, [], ZIWEI_CAL_VERSION);
        }
    }

    private static function enqueue_data_js(): void {
        wp_enqueue_script('ziwei-cal-constants', ZIWEI_CAL_PLUGIN_URL . 'assets/data/constants.js', [], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-adapter-utils', ZIWEI_CAL_PLUGIN_URL . 'assets/js/adapter-utils.js', ['ziwei-cal-constants'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-lunar-converter', ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/common/lunar-converter.js', ['ziwei-cal-constants'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-palaces-name', ZIWEI_CAL_PLUGIN_URL . 'assets/data/palaces-name.js', ['ziwei-cal-constants', 'ziwei-cal-adapter-utils'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-nayin', ZIWEI_CAL_PLUGIN_URL . 'assets/data/nayin.js', ['ziwei-cal-constants', 'ziwei-cal-adapter-utils'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-mutation-zhongzhou', ZIWEI_CAL_PLUGIN_URL . 'assets/data/mutation.js', ['ziwei-cal-constants'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-brightness-zhongzhou', ZIWEI_CAL_PLUGIN_URL . 'assets/data/brightness.js', [], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-interpretations', ZIWEI_CAL_PLUGIN_URL . 'assets/data/interpretations.js', ['ziwei-cal-adapter-utils'], ZIWEI_CAL_VERSION, true);
    }

    private static function enqueue_astrology_modules(): void {
        $modules = [
            'basic' => ['ziwei-cal-constants', 'ziwei-cal-adapter-utils'],
            'gender-calculator' => ['ziwei-cal-constants', 'ziwei-cal-adapter-utils'],
            'palaces' => ['ziwei-cal-palaces-name', 'ziwei-cal-basic', 'ziwei-cal-adapter-utils'],
            'primary' => ['ziwei-cal-nayin', 'ziwei-cal-adapter-utils'],
            'life-cycle' => ['ziwei-cal-constants', 'ziwei-cal-adapter-utils'],
            'secondary' => ['ziwei-cal-nayin', 'ziwei-cal-constants', 'ziwei-cal-adapter-utils'],
            'mutations' => ['ziwei-cal-mutation-zhongzhou', 'ziwei-cal-basic', 'ziwei-cal-constants', 'ziwei-cal-adapter-utils'],
            'minor-stars' => ['ziwei-cal-basic', 'ziwei-cal-constants', 'ziwei-cal-adapter-utils'],
            'attributes' => ['ziwei-cal-constants', 'ziwei-cal-adapter-utils'],
            'brightness' => ['ziwei-cal-brightness-zhongzhou', 'ziwei-cal-adapter-utils'],
            'major-cycle' => ['ziwei-cal-constants', 'ziwei-cal-adapter-utils'],
        ];
        foreach ($modules as $handle => $deps) {
            wp_enqueue_script("ziwei-cal-{$handle}", ZIWEI_CAL_PLUGIN_URL . "assets/calculate/astrology/{$handle}.js", $deps, ZIWEI_CAL_VERSION, true);
        }
    }

    private static function enqueue_display_modules(): void {
        // Load external libraries for export functionality
        wp_enqueue_script('ziwei-cal-domtoimage', 'https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.8.0/dom-to-image.min.js', [], '2.8.0', true);
        wp_enqueue_script('ziwei-cal-jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', [], '2.5.1', true);

        wp_enqueue_script('ziwei-cal-chart', ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/chart.js', ['jquery', 'ziwei-cal-constants', 'ziwei-cal-adapter-utils'], ZIWEI_CAL_VERSION, true);
        
        wp_enqueue_script('ziwei-cal-data-adapter', ZIWEI_CAL_PLUGIN_URL . 'assets/js/data-adapter.js', [
            'ziwei-cal-adapter-utils', 'ziwei-cal-lunar-converter', 'ziwei-cal-basic', 'ziwei-cal-palaces-name', 'ziwei-cal-nayin',
            'ziwei-cal-palaces', 'ziwei-cal-primary', 'ziwei-cal-secondary', 'ziwei-cal-mutations',
            'ziwei-cal-minor-stars', 'ziwei-cal-attributes', 'ziwei-cal-brightness', 'ziwei-cal-life-cycle', 'ziwei-cal-gender-calculator'
        ], ZIWEI_CAL_VERSION, true);

        wp_enqueue_script('ziwei-cal-cycles', ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/cycles.js', ['ziwei-cal-life-cycle', 'ziwei-cal-constants', 'ziwei-cal-data-adapter'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-form', ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/form.js', ['jquery', 'ziwei-cal-lunar-converter', 'ziwei-cal-gender-calculator', 'ziwei-cal-data-adapter'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-palace-interaction', ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/palace-interaction.js', ['ziwei-cal-chart'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-interpretation-panel', ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/interpretation-panel.js', ['ziwei-cal-palace-interaction', 'ziwei-cal-interpretations', 'ziwei-cal-data-adapter'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-config', ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/config.js', ['ziwei-cal-data-adapter'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-control', ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/control.js', ['ziwei-cal-config'], ZIWEI_CAL_VERSION, true);
        wp_enqueue_script('ziwei-cal-ai-mode', ZIWEI_CAL_PLUGIN_URL . 'assets/display/js/ai_mode.js', ['ziwei-cal-chart', 'ziwei-cal-cycles', 'ziwei-cal-control'], ZIWEI_CAL_VERSION, true);
    }

    private static function enqueue_calculator(): void {
        wp_enqueue_script('ziwei-cal-js', ZIWEI_CAL_PLUGIN_URL . 'assets/calculate/common/calculator.js', [
            'jquery', 'ziwei-cal-form', 'ziwei-cal-chart', 'ziwei-cal-palace-interaction', 'ziwei-cal-control'
        ], ZIWEI_CAL_VERSION, true);

        wp_localize_script('ziwei-cal-js', 'ziweiCalData', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => esc_url_raw(rest_url('ziwei-cal/v1/calculate')),
            'nonce' => wp_create_nonce('wp_rest'),
            'isDebug' => defined('WP_DEBUG') && WP_DEBUG,
            'pluginUrl' => ZIWEI_CAL_PLUGIN_URL,
            'pluginVersion' => ZIWEI_CAL_VERSION,
            'env' => [
                'isDebug' => defined('WP_DEBUG') && WP_DEBUG,
                'wpVersion' => get_bloginfo('version'),
                'pluginVersion' => ZIWEI_CAL_VERSION,
            ]
        ]);
    }
}

// Update ziwei_cal_enqueue_scripts to use class
function ziwei_cal_enqueue_scripts(): void {
    if (!should_enqueue_frontend_assets()) {
        return;
    }
    Ziwei_Enqueuer::enqueue_all();
}
add_action('wp_enqueue_scripts', 'ziwei_cal_enqueue_scripts');

/**
 * Add defer attribute to non-critical scripts for performance optimization
 * This improves page load time by deferring script execution
 */
function ziwei_cal_add_defer_attribute($tag, $handle, $src) {
    // Scripts that should be deferred (non-blocking, loaded after page renders)
    $defer_scripts = [
        'ziwei-cal-cycles',           // Cycle panel (loaded after chart renders)
        'ziwei-cal-palace-interaction' // Palace interaction (loaded after chart renders)
    ];

    if (in_array($handle, $defer_scripts, true)) {
        $tag = str_replace(' src=', ' defer src=', $tag);
    }

    return $tag;
}
add_filter('script_loader_tag', 'ziwei_cal_add_defer_attribute', 10, 3);

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
