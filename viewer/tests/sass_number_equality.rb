require "sass"
require "set"

number = Sass::Script::Value::Number
string = Sass::Script::Value::String

require_relative "../_plugins/sass_number_equality"

raise "Mixed types must differ" if number.new(1).eql?(string.new("auto"))
raise "Equal numbers must match" unless number.new(1).eql?(number.new(1))
raise "Different numbers must differ" if number.new(1).eql?(number.new(2))
raise "Different units must differ" if number.new(1, ["px"]).eql?(number.new(1, ["em"]))

# Force collisions instead of relying on a random Ruby hash seed to expose it.
number.class_eval { def hash; 0; end }
string.class_eval { def hash; 0; end }
keys = Set.new([string.new("auto"), number.new(1)])
raise "Both map keys must survive" unless keys.size == 2

css = Sass::Engine.new(
  '$sizes: (auto: auto, 1: 1rem); .test { width: map-get($sizes, 1); }',
  syntax: :scss
).render
raise "Mixed-key stylesheet did not compile correctly" unless css.include?("width: 1rem")
puts "Sass mixed-type map key regression checks passed"
