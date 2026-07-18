#include <pebble.h>

static Window *s_window;
static TextLayer *s_text_layer;

static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  Tuple *fact_tuple = dict_find(iterator, MESSAGE_KEY_fact);
  Tuple *error_tuple = dict_find(iterator, MESSAGE_KEY_error);

  if (fact_tuple) {
    text_layer_set_text(s_text_layer, fact_tuple->value->cstring);
  } else if (error_tuple) {
    static char error_buf[128];
    snprintf(error_buf, sizeof(error_buf), "Error:\n%s", error_tuple->value->cstring);
    text_layer_set_text(s_text_layer, error_buf);
  }
}

static void inbox_dropped_callback(AppMessageResult reason, void *context) {
  text_layer_set_text(s_text_layer, "Message dropped");
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  s_text_layer = text_layer_create(GRect(0, 40, bounds.size.w, bounds.size.h - 80));
  text_layer_set_text(s_text_layer, "Open settings to fetch a fact");
  text_layer_set_font(s_text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
  text_layer_set_text_alignment(s_text_layer, GTextAlignmentCenter);
  text_layer_set_overflow_mode(s_text_layer, GTextOverflowModeWordWrap);
  layer_add_child(window_layer, text_layer_get_layer(s_text_layer));
}

static void window_unload(Window *window) {
  text_layer_destroy(s_text_layer);
}

static void init(void) {
  s_window = window_create();
  window_set_window_handlers(s_window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  window_stack_push(s_window, true);

  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_open(512, 64);
}

static void deinit(void) {
  window_destroy(s_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
