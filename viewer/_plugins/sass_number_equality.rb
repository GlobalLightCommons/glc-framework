# Ruby Sass 3.7.4 assumes every hash-key comparison is between numbers.
# A hash collision with a string key can therefore crash map compilation.
# Keep numeric equality unchanged and reject keys of other Sass value types.
# Remove this compatibility shim when upgrading away from Ruby Sass.
require "sass"

module GlcSassNumberEquality
  def eql?(other)
    other.is_a?(Sass::Script::Value::Number) && super
  end
end

Sass::Script::Value::Number.prepend(GlcSassNumberEquality)
