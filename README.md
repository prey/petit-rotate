# petit-rotate

Petit log rotator

# Install

    npm install petit-rotate

# Usage

    var rotate = require('petit-rotate');
    rotate(str, self.rotate_opts, function(err, rotating) {
      // The rotating output tells if the log it's currently rotating
    }

# Options

 - rotate: If it's true the rotation is activated.
 - size: Log file size limit (in bytes) before the rotation. For default it's set in 2.5 MB
 - limit: Maximum number of rotated file preserved. If the number it's reached, in the next rotation the oldest log it's deleted. For default it's set in 9, and it's gonna be the same if the number it's bigger than that.
 - compress: If it's true the rotated logs are gonna be zipped.
 - dest: Designated directory for the rotated logs. For default it's the same directory from the original log.

# Example

      Logger.prototype.write = function(str) {
        var self = this;
        var next = function() {
          if (self.stream.writable) self.stream.write(str + '\n');
        }
        rotate(str, self.rotate_opts, function(err, rotating) {
          if (err) {
            self.rotate_opts.rotate = false;
            next();
          }
          if (!rotating) next();
        });
      }
# petit-rotate
