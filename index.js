var fs       = require('fs'),
    join     = require('path').join,
    zlib     = require('zlib'),
    os_name  = process.platform.replace('darwin', 'mac').replace('win32', 'windows');

var rotating = false,
    bar = os_name == 'windows' ? '\\' : '/',
    file_name,
    log_size,
    extra_log,
    extra_path;

var zipped = function(file) {
  if (file.split('.').pop() == 'gz')
    return true;
  else return false;
}

var zip = function(file, cb) {
  var gzip   = zlib.createGzip();
  var input  = fs.createReadStream(file);
  var output = fs.createWriteStream(file +'.gz');
  input
    .pipe(gzip)
    .pipe(output)
    .on('finish', function() {
      fs.unlink(file, function(err){
        cb(err, file +'.gz');
      });
    });
}

var cp = function(source, target, cb) {
  var is  = fs.createReadStream(source),
      os  = fs.createWriteStream(target),
      out = 0;

  var done = function(err) {
    if (out++ > 0) return;
    cb(err);
  };

  is.on('end', done);
  is.on('error', done);
  os.on('error', done);

  is.pipe(os);
};

var rotation = function(file, opts, cb) {
  var current, next;
  var extension = '';

  if (zipped(file)) {
    current = parseInt(file.split('.').slice(-2)[0]);
    extension = '.gz';
  } else {
    current = parseInt(file.split('.').slice(-1)[0]);
  }
  next = current + 1;

  if (current >= opts.limit) {
    try { fs.unlinkSync(file); } catch (e) { return cb(e); }
  } else {
    try {
      var next_file = join(opts.dest, file_name + '.' + next + extension);
      fs.renameSync(file, next_file);
      if (opts.compress && extension == '') {
        zip(next_file, function(err, zip_file) {
          if (err) return cb(err);
        })
      }
    } catch (e) {
      return cb(e);
    }
  }
}

var lets_rotate = function(opts, cb) {
  cp(opts.path, join(opts.dest, file_name + '.0'), function(err) {
    if (err) return cb(err);

    cp(extra_path, opts.path, function(err) {
      if (err) return cb(err);

      rotating = false;
      extra_log.emit('close');

      fs.readdir(opts.dest, function(err, files) {
        files.reverse().forEach(function(file) {
          if (file.includes(file_name + '.')) {
            rotation(join(opts.dest, file), opts, cb)
          }
        });
      })
    })
  });
}

var rotate = function(str, opts, cb) {
  if (!opts.rotate || !opts.path) return cb(null, false);
  if (!opts.dest) opts.dest = opts.path.split(bar).slice(0,-1).join(bar);
  if (!opts.limit || (opts.limit > 9 || opts.limit < 1)) opts.limit = 9;
  if (!opts.size) opts.size = 2500000;     // 2.5 MB
  if (!opts.compress) opts.compress = true;

  file_name = opts.path.split(bar).pop();

  try { log_size = fs.statSync(opts.path).size;
  } catch (e) { return cb(e); }

  if (rotating) {
    if (extra_log) extra_log.write(str + '\n');
    return cb(null, true);

  } else {
    if (log_size + str.length > opts.size) {
      rotating = true;
      lets_rotate(opts, cb);

      extra_path = join(opts.dest, 'extra_' + file_name);
      extra_log  = fs.createWriteStream(extra_path);
      extra_log.on('error', function(err) { if (err) return cb(err) });
      extra_log.on('close', function() {
        extra_log.end();
        if (fs.existsSync(extra_path))
          try { fs.unlinkSync(extra_path); } catch (e) { return cb(e); }
      });
      extra_log.write(str + '\n');

      return cb(null, true);
    } else {
      return cb(null, false);
    }
  }
}

module.exports = rotate;
