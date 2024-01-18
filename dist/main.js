/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/browserslist/browser.js":
/*!**********************************************!*\
  !*** ./node_modules/browserslist/browser.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var BrowserslistError = __webpack_require__(/*! ./error */ "./node_modules/browserslist/error.js")

function noop() {}

module.exports = {
  loadQueries: function loadQueries() {
    throw new BrowserslistError(
      'Sharable configs are not supported in client-side build of Browserslist'
    )
  },

  getStat: function getStat(opts) {
    return opts.stats
  },

  loadConfig: function loadConfig(opts) {
    if (opts.config) {
      throw new BrowserslistError(
        'Browserslist config are not supported in client-side build'
      )
    }
  },

  loadCountry: function loadCountry() {
    throw new BrowserslistError(
      'Country statistics are not supported ' +
        'in client-side build of Browserslist'
    )
  },

  loadFeature: function loadFeature() {
    throw new BrowserslistError(
      'Supports queries are not available in client-side build of Browserslist'
    )
  },

  currentNode: function currentNode(resolve, context) {
    return resolve(['maintained node versions'], context)[0]
  },

  parseConfig: noop,

  readConfig: noop,

  findConfig: noop,

  clearCaches: noop,

  oldDataWarning: noop
}


/***/ }),

/***/ "./node_modules/browserslist/error.js":
/*!********************************************!*\
  !*** ./node_modules/browserslist/error.js ***!
  \********************************************/
/***/ ((module) => {

function BrowserslistError(message) {
  this.name = 'BrowserslistError'
  this.message = message
  this.browserslist = true
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, BrowserslistError)
  }
}

BrowserslistError.prototype = Error.prototype

module.exports = BrowserslistError


/***/ }),

/***/ "./node_modules/browserslist/index.js":
/*!********************************************!*\
  !*** ./node_modules/browserslist/index.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var jsReleases = __webpack_require__(/*! node-releases/data/processed/envs.json */ "./node_modules/node-releases/data/processed/envs.json")
var agents = (__webpack_require__(/*! caniuse-lite/dist/unpacker/agents */ "./node_modules/caniuse-lite/dist/unpacker/agents.js").agents)
var jsEOL = __webpack_require__(/*! node-releases/data/release-schedule/release-schedule.json */ "./node_modules/node-releases/data/release-schedule/release-schedule.json")
var path = __webpack_require__(/*! path */ "?3465")
var e2c = __webpack_require__(/*! electron-to-chromium/versions */ "./node_modules/electron-to-chromium/versions.js")

var BrowserslistError = __webpack_require__(/*! ./error */ "./node_modules/browserslist/error.js")
var parse = __webpack_require__(/*! ./parse */ "./node_modules/browserslist/parse.js")
var env = __webpack_require__(/*! ./node */ "./node_modules/browserslist/browser.js") // Will load browser.js in webpack

var YEAR = 365.259641 * 24 * 60 * 60 * 1000
var ANDROID_EVERGREEN_FIRST = 37

// Helpers

function isVersionsMatch(versionA, versionB) {
  return (versionA + '.').indexOf(versionB + '.') === 0
}

function isEolReleased(name) {
  var version = name.slice(1)
  return browserslist.nodeVersions.some(function (i) {
    return isVersionsMatch(i, version)
  })
}

function normalize(versions) {
  return versions.filter(function (version) {
    return typeof version === 'string'
  })
}

function normalizeElectron(version) {
  var versionToUse = version
  if (version.split('.').length === 3) {
    versionToUse = version.split('.').slice(0, -1).join('.')
  }
  return versionToUse
}

function nameMapper(name) {
  return function mapName(version) {
    return name + ' ' + version
  }
}

function getMajor(version) {
  return parseInt(version.split('.')[0])
}

function getMajorVersions(released, number) {
  if (released.length === 0) return []
  var majorVersions = uniq(released.map(getMajor))
  var minimum = majorVersions[majorVersions.length - number]
  if (!minimum) {
    return released
  }
  var selected = []
  for (var i = released.length - 1; i >= 0; i--) {
    if (minimum > getMajor(released[i])) break
    selected.unshift(released[i])
  }
  return selected
}

function uniq(array) {
  var filtered = []
  for (var i = 0; i < array.length; i++) {
    if (filtered.indexOf(array[i]) === -1) filtered.push(array[i])
  }
  return filtered
}

function fillUsage(result, name, data) {
  for (var i in data) {
    result[name + ' ' + i] = data[i]
  }
}

function generateFilter(sign, version) {
  version = parseFloat(version)
  if (sign === '>') {
    return function (v) {
      return parseFloat(v) > version
    }
  } else if (sign === '>=') {
    return function (v) {
      return parseFloat(v) >= version
    }
  } else if (sign === '<') {
    return function (v) {
      return parseFloat(v) < version
    }
  } else {
    return function (v) {
      return parseFloat(v) <= version
    }
  }
}

function generateSemverFilter(sign, version) {
  version = version.split('.').map(parseSimpleInt)
  version[1] = version[1] || 0
  version[2] = version[2] || 0
  if (sign === '>') {
    return function (v) {
      v = v.split('.').map(parseSimpleInt)
      return compareSemver(v, version) > 0
    }
  } else if (sign === '>=') {
    return function (v) {
      v = v.split('.').map(parseSimpleInt)
      return compareSemver(v, version) >= 0
    }
  } else if (sign === '<') {
    return function (v) {
      v = v.split('.').map(parseSimpleInt)
      return compareSemver(version, v) > 0
    }
  } else {
    return function (v) {
      v = v.split('.').map(parseSimpleInt)
      return compareSemver(version, v) >= 0
    }
  }
}

function parseSimpleInt(x) {
  return parseInt(x)
}

function compare(a, b) {
  if (a < b) return -1
  if (a > b) return +1
  return 0
}

function compareSemver(a, b) {
  return (
    compare(parseInt(a[0]), parseInt(b[0])) ||
    compare(parseInt(a[1] || '0'), parseInt(b[1] || '0')) ||
    compare(parseInt(a[2] || '0'), parseInt(b[2] || '0'))
  )
}

// this follows the npm-like semver behavior
function semverFilterLoose(operator, range) {
  range = range.split('.').map(parseSimpleInt)
  if (typeof range[1] === 'undefined') {
    range[1] = 'x'
  }
  // ignore any patch version because we only return minor versions
  // range[2] = 'x'
  switch (operator) {
    case '<=':
      return function (version) {
        version = version.split('.').map(parseSimpleInt)
        return compareSemverLoose(version, range) <= 0
      }
    case '>=':
    default:
      return function (version) {
        version = version.split('.').map(parseSimpleInt)
        return compareSemverLoose(version, range) >= 0
      }
  }
}

// this follows the npm-like semver behavior
function compareSemverLoose(version, range) {
  if (version[0] !== range[0]) {
    return version[0] < range[0] ? -1 : +1
  }
  if (range[1] === 'x') {
    return 0
  }
  if (version[1] !== range[1]) {
    return version[1] < range[1] ? -1 : +1
  }
  return 0
}

function resolveVersion(data, version) {
  if (data.versions.indexOf(version) !== -1) {
    return version
  } else if (browserslist.versionAliases[data.name][version]) {
    return browserslist.versionAliases[data.name][version]
  } else {
    return false
  }
}

function normalizeVersion(data, version) {
  var resolved = resolveVersion(data, version)
  if (resolved) {
    return resolved
  } else if (data.versions.length === 1) {
    return data.versions[0]
  } else {
    return false
  }
}

function filterByYear(since, context) {
  since = since / 1000
  return Object.keys(agents).reduce(function (selected, name) {
    var data = byName(name, context)
    if (!data) return selected
    var versions = Object.keys(data.releaseDate).filter(function (v) {
      var date = data.releaseDate[v]
      return date !== null && date >= since
    })
    return selected.concat(versions.map(nameMapper(data.name)))
  }, [])
}

function cloneData(data) {
  return {
    name: data.name,
    versions: data.versions,
    released: data.released,
    releaseDate: data.releaseDate
  }
}

function mapVersions(data, map) {
  data.versions = data.versions.map(function (i) {
    return map[i] || i
  })
  data.released = data.released.map(function (i) {
    return map[i] || i
  })
  var fixedDate = {}
  for (var i in data.releaseDate) {
    fixedDate[map[i] || i] = data.releaseDate[i]
  }
  data.releaseDate = fixedDate
  return data
}

function byName(name, context) {
  name = name.toLowerCase()
  name = browserslist.aliases[name] || name
  if (context.mobileToDesktop && browserslist.desktopNames[name]) {
    var desktop = browserslist.data[browserslist.desktopNames[name]]
    if (name === 'android') {
      return normalizeAndroidData(cloneData(browserslist.data[name]), desktop)
    } else {
      var cloned = cloneData(desktop)
      cloned.name = name
      if (name === 'op_mob') {
        cloned = mapVersions(cloned, { '10.0-10.1': '10' })
      }
      return cloned
    }
  }
  return browserslist.data[name]
}

function normalizeAndroidVersions(androidVersions, chromeVersions) {
  var firstEvergreen = ANDROID_EVERGREEN_FIRST
  var last = chromeVersions[chromeVersions.length - 1]
  return androidVersions
    .filter(function (version) {
      return /^(?:[2-4]\.|[34]$)/.test(version)
    })
    .concat(chromeVersions.slice(firstEvergreen - last - 1))
}

function normalizeAndroidData(android, chrome) {
  android.released = normalizeAndroidVersions(android.released, chrome.released)
  android.versions = normalizeAndroidVersions(android.versions, chrome.versions)
  return android
}

function checkName(name, context) {
  var data = byName(name, context)
  if (!data) throw new BrowserslistError('Unknown browser ' + name)
  return data
}

function unknownQuery(query) {
  return new BrowserslistError(
    'Unknown browser query `' +
      query +
      '`. ' +
      'Maybe you are using old Browserslist or made typo in query.'
  )
}

function filterAndroid(list, versions, context) {
  if (context.mobileToDesktop) return list
  var released = browserslist.data.android.released
  var last = released[released.length - 1]
  var diff = last - ANDROID_EVERGREEN_FIRST - versions
  if (diff > 0) {
    return list.slice(-1)
  } else {
    return list.slice(diff - 1)
  }
}

function resolve(queries, context) {
  return parse(QUERIES, queries).reduce(function (result, node, index) {
    if (node.not && index === 0) {
      throw new BrowserslistError(
        'Write any browsers query (for instance, `defaults`) ' +
          'before `' +
          node.query +
          '`'
      )
    }
    var type = QUERIES[node.type]
    var array = type.select.call(browserslist, context, node).map(function (j) {
      var parts = j.split(' ')
      if (parts[1] === '0') {
        return parts[0] + ' ' + byName(parts[0], context).versions[0]
      } else {
        return j
      }
    })

    if (node.compose === 'and') {
      if (node.not) {
        return result.filter(function (j) {
          return array.indexOf(j) === -1
        })
      } else {
        return result.filter(function (j) {
          return array.indexOf(j) !== -1
        })
      }
    } else {
      if (node.not) {
        var filter = {}
        array.forEach(function (j) {
          filter[j] = true
        })
        return result.filter(function (j) {
          return !filter[j]
        })
      }
      return result.concat(array)
    }
  }, [])
}

function prepareOpts(opts) {
  if (typeof opts === 'undefined') opts = {}

  if (typeof opts.path === 'undefined') {
    opts.path = path.resolve ? path.resolve('.') : '.'
  }

  return opts
}

function prepareQueries(queries, opts) {
  if (typeof queries === 'undefined' || queries === null) {
    var config = browserslist.loadConfig(opts)
    if (config) {
      queries = config
    } else {
      queries = browserslist.defaults
    }
  }

  return queries
}

function checkQueries(queries) {
  if (!(typeof queries === 'string' || Array.isArray(queries))) {
    throw new BrowserslistError(
      'Browser queries must be an array or string. Got ' + typeof queries + '.'
    )
  }
}

var cache = {}

function browserslist(queries, opts) {
  opts = prepareOpts(opts)
  queries = prepareQueries(queries, opts)
  checkQueries(queries)

  var context = {
    ignoreUnknownVersions: opts.ignoreUnknownVersions,
    dangerousExtend: opts.dangerousExtend,
    mobileToDesktop: opts.mobileToDesktop,
    path: opts.path,
    env: opts.env
  }

  env.oldDataWarning(browserslist.data)
  var stats = env.getStat(opts, browserslist.data)
  if (stats) {
    context.customUsage = {}
    for (var browser in stats) {
      fillUsage(context.customUsage, browser, stats[browser])
    }
  }

  var cacheKey = JSON.stringify([queries, context])
  if (cache[cacheKey]) return cache[cacheKey]

  var result = uniq(resolve(queries, context)).sort(function (name1, name2) {
    name1 = name1.split(' ')
    name2 = name2.split(' ')
    if (name1[0] === name2[0]) {
      // assumptions on caniuse data
      // 1) version ranges never overlaps
      // 2) if version is not a range, it never contains `-`
      var version1 = name1[1].split('-')[0]
      var version2 = name2[1].split('-')[0]
      return compareSemver(version2.split('.'), version1.split('.'))
    } else {
      return compare(name1[0], name2[0])
    }
  })
  if (!process.env.BROWSERSLIST_DISABLE_CACHE) {
    cache[cacheKey] = result
  }
  return result
}

browserslist.parse = function (queries, opts) {
  opts = prepareOpts(opts)
  queries = prepareQueries(queries, opts)
  checkQueries(queries)
  return parse(QUERIES, queries)
}

// Will be filled by Can I Use data below
browserslist.cache = {}
browserslist.data = {}
browserslist.usage = {
  global: {},
  custom: null
}

// Default browsers query
browserslist.defaults = ['> 0.5%', 'last 2 versions', 'Firefox ESR', 'not dead']

// Browser names aliases
browserslist.aliases = {
  fx: 'firefox',
  ff: 'firefox',
  ios: 'ios_saf',
  explorer: 'ie',
  blackberry: 'bb',
  explorermobile: 'ie_mob',
  operamini: 'op_mini',
  operamobile: 'op_mob',
  chromeandroid: 'and_chr',
  firefoxandroid: 'and_ff',
  ucandroid: 'and_uc',
  qqandroid: 'and_qq'
}

// Can I Use only provides a few versions for some browsers (e.g. and_chr).
// Fallback to a similar browser for unknown versions
browserslist.desktopNames = {
  and_chr: 'chrome',
  and_ff: 'firefox',
  ie_mob: 'ie',
  op_mob: 'opera',
  android: 'chrome' // has extra processing logic
}

// Aliases to work with joined versions like `ios_saf 7.0-7.1`
browserslist.versionAliases = {}

browserslist.clearCaches = env.clearCaches
browserslist.parseConfig = env.parseConfig
browserslist.readConfig = env.readConfig
browserslist.findConfig = env.findConfig
browserslist.loadConfig = env.loadConfig

browserslist.coverage = function (browsers, stats) {
  var data
  if (typeof stats === 'undefined') {
    data = browserslist.usage.global
  } else if (stats === 'my stats') {
    var opts = {}
    opts.path = path.resolve ? path.resolve('.') : '.'
    var customStats = env.getStat(opts)
    if (!customStats) {
      throw new BrowserslistError('Custom usage statistics was not provided')
    }
    data = {}
    for (var browser in customStats) {
      fillUsage(data, browser, customStats[browser])
    }
  } else if (typeof stats === 'string') {
    if (stats.length > 2) {
      stats = stats.toLowerCase()
    } else {
      stats = stats.toUpperCase()
    }
    env.loadCountry(browserslist.usage, stats, browserslist.data)
    data = browserslist.usage[stats]
  } else {
    if ('dataByBrowser' in stats) {
      stats = stats.dataByBrowser
    }
    data = {}
    for (var name in stats) {
      for (var version in stats[name]) {
        data[name + ' ' + version] = stats[name][version]
      }
    }
  }

  return browsers.reduce(function (all, i) {
    var usage = data[i]
    if (usage === undefined) {
      usage = data[i.replace(/ \S+$/, ' 0')]
    }
    return all + (usage || 0)
  }, 0)
}

function nodeQuery(context, node) {
  var matched = browserslist.nodeVersions.filter(function (i) {
    return isVersionsMatch(i, node.version)
  })
  if (matched.length === 0) {
    if (context.ignoreUnknownVersions) {
      return []
    } else {
      throw new BrowserslistError(
        'Unknown version ' + node.version + ' of Node.js'
      )
    }
  }
  return ['node ' + matched[matched.length - 1]]
}

function sinceQuery(context, node) {
  var year = parseInt(node.year)
  var month = parseInt(node.month || '01') - 1
  var day = parseInt(node.day || '01')
  return filterByYear(Date.UTC(year, month, day, 0, 0, 0), context)
}

function coverQuery(context, node) {
  var coverage = parseFloat(node.coverage)
  var usage = browserslist.usage.global
  if (node.place) {
    if (node.place.match(/^my\s+stats$/i)) {
      if (!context.customUsage) {
        throw new BrowserslistError('Custom usage statistics was not provided')
      }
      usage = context.customUsage
    } else {
      var place
      if (node.place.length === 2) {
        place = node.place.toUpperCase()
      } else {
        place = node.place.toLowerCase()
      }
      env.loadCountry(browserslist.usage, place, browserslist.data)
      usage = browserslist.usage[place]
    }
  }
  var versions = Object.keys(usage).sort(function (a, b) {
    return usage[b] - usage[a]
  })
  var coveraged = 0
  var result = []
  var version
  for (var i = 0; i < versions.length; i++) {
    version = versions[i]
    if (usage[version] === 0) break
    coveraged += usage[version]
    result.push(version)
    if (coveraged >= coverage) break
  }
  return result
}

var QUERIES = {
  last_major_versions: {
    matches: ['versions'],
    regexp: /^last\s+(\d+)\s+major\s+versions?$/i,
    select: function (context, node) {
      return Object.keys(agents).reduce(function (selected, name) {
        var data = byName(name, context)
        if (!data) return selected
        var list = getMajorVersions(data.released, node.versions)
        list = list.map(nameMapper(data.name))
        if (data.name === 'android') {
          list = filterAndroid(list, node.versions, context)
        }
        return selected.concat(list)
      }, [])
    }
  },
  last_versions: {
    matches: ['versions'],
    regexp: /^last\s+(\d+)\s+versions?$/i,
    select: function (context, node) {
      return Object.keys(agents).reduce(function (selected, name) {
        var data = byName(name, context)
        if (!data) return selected
        var list = data.released.slice(-node.versions)
        list = list.map(nameMapper(data.name))
        if (data.name === 'android') {
          list = filterAndroid(list, node.versions, context)
        }
        return selected.concat(list)
      }, [])
    }
  },
  last_electron_major_versions: {
    matches: ['versions'],
    regexp: /^last\s+(\d+)\s+electron\s+major\s+versions?$/i,
    select: function (context, node) {
      var validVersions = getMajorVersions(Object.keys(e2c), node.versions)
      return validVersions.map(function (i) {
        return 'chrome ' + e2c[i]
      })
    }
  },
  last_node_major_versions: {
    matches: ['versions'],
    regexp: /^last\s+(\d+)\s+node\s+major\s+versions?$/i,
    select: function (context, node) {
      return getMajorVersions(browserslist.nodeVersions, node.versions).map(
        function (version) {
          return 'node ' + version
        }
      )
    }
  },
  last_browser_major_versions: {
    matches: ['versions', 'browser'],
    regexp: /^last\s+(\d+)\s+(\w+)\s+major\s+versions?$/i,
    select: function (context, node) {
      var data = checkName(node.browser, context)
      var validVersions = getMajorVersions(data.released, node.versions)
      var list = validVersions.map(nameMapper(data.name))
      if (data.name === 'android') {
        list = filterAndroid(list, node.versions, context)
      }
      return list
    }
  },
  last_electron_versions: {
    matches: ['versions'],
    regexp: /^last\s+(\d+)\s+electron\s+versions?$/i,
    select: function (context, node) {
      return Object.keys(e2c)
        .slice(-node.versions)
        .map(function (i) {
          return 'chrome ' + e2c[i]
        })
    }
  },
  last_node_versions: {
    matches: ['versions'],
    regexp: /^last\s+(\d+)\s+node\s+versions?$/i,
    select: function (context, node) {
      return browserslist.nodeVersions
        .slice(-node.versions)
        .map(function (version) {
          return 'node ' + version
        })
    }
  },
  last_browser_versions: {
    matches: ['versions', 'browser'],
    regexp: /^last\s+(\d+)\s+(\w+)\s+versions?$/i,
    select: function (context, node) {
      var data = checkName(node.browser, context)
      var list = data.released.slice(-node.versions).map(nameMapper(data.name))
      if (data.name === 'android') {
        list = filterAndroid(list, node.versions, context)
      }
      return list
    }
  },
  unreleased_versions: {
    matches: [],
    regexp: /^unreleased\s+versions$/i,
    select: function (context) {
      return Object.keys(agents).reduce(function (selected, name) {
        var data = byName(name, context)
        if (!data) return selected
        var list = data.versions.filter(function (v) {
          return data.released.indexOf(v) === -1
        })
        list = list.map(nameMapper(data.name))
        return selected.concat(list)
      }, [])
    }
  },
  unreleased_electron_versions: {
    matches: [],
    regexp: /^unreleased\s+electron\s+versions?$/i,
    select: function () {
      return []
    }
  },
  unreleased_browser_versions: {
    matches: ['browser'],
    regexp: /^unreleased\s+(\w+)\s+versions?$/i,
    select: function (context, node) {
      var data = checkName(node.browser, context)
      return data.versions
        .filter(function (v) {
          return data.released.indexOf(v) === -1
        })
        .map(nameMapper(data.name))
    }
  },
  last_years: {
    matches: ['years'],
    regexp: /^last\s+(\d*.?\d+)\s+years?$/i,
    select: function (context, node) {
      return filterByYear(Date.now() - YEAR * node.years, context)
    }
  },
  since_y: {
    matches: ['year'],
    regexp: /^since (\d+)$/i,
    select: sinceQuery
  },
  since_y_m: {
    matches: ['year', 'month'],
    regexp: /^since (\d+)-(\d+)$/i,
    select: sinceQuery
  },
  since_y_m_d: {
    matches: ['year', 'month', 'day'],
    regexp: /^since (\d+)-(\d+)-(\d+)$/i,
    select: sinceQuery
  },
  popularity: {
    matches: ['sign', 'popularity'],
    regexp: /^(>=?|<=?)\s*(\d+|\d+\.\d+|\.\d+)%$/,
    select: function (context, node) {
      var popularity = parseFloat(node.popularity)
      var usage = browserslist.usage.global
      return Object.keys(usage).reduce(function (result, version) {
        if (node.sign === '>') {
          if (usage[version] > popularity) {
            result.push(version)
          }
        } else if (node.sign === '<') {
          if (usage[version] < popularity) {
            result.push(version)
          }
        } else if (node.sign === '<=') {
          if (usage[version] <= popularity) {
            result.push(version)
          }
        } else if (usage[version] >= popularity) {
          result.push(version)
        }
        return result
      }, [])
    }
  },
  popularity_in_my_stats: {
    matches: ['sign', 'popularity'],
    regexp: /^(>=?|<=?)\s*(\d+|\d+\.\d+|\.\d+)%\s+in\s+my\s+stats$/,
    select: function (context, node) {
      var popularity = parseFloat(node.popularity)
      if (!context.customUsage) {
        throw new BrowserslistError('Custom usage statistics was not provided')
      }
      var usage = context.customUsage
      return Object.keys(usage).reduce(function (result, version) {
        var percentage = usage[version]
        if (percentage == null) {
          return result
        }

        if (node.sign === '>') {
          if (percentage > popularity) {
            result.push(version)
          }
        } else if (node.sign === '<') {
          if (percentage < popularity) {
            result.push(version)
          }
        } else if (node.sign === '<=') {
          if (percentage <= popularity) {
            result.push(version)
          }
        } else if (percentage >= popularity) {
          result.push(version)
        }
        return result
      }, [])
    }
  },
  popularity_in_config_stats: {
    matches: ['sign', 'popularity', 'config'],
    regexp: /^(>=?|<=?)\s*(\d+|\d+\.\d+|\.\d+)%\s+in\s+(\S+)\s+stats$/,
    select: function (context, node) {
      var popularity = parseFloat(node.popularity)
      var stats = env.loadStat(context, node.config, browserslist.data)
      if (stats) {
        context.customUsage = {}
        for (var browser in stats) {
          fillUsage(context.customUsage, browser, stats[browser])
        }
      }
      if (!context.customUsage) {
        throw new BrowserslistError('Custom usage statistics was not provided')
      }
      var usage = context.customUsage
      return Object.keys(usage).reduce(function (result, version) {
        var percentage = usage[version]
        if (percentage == null) {
          return result
        }

        if (node.sign === '>') {
          if (percentage > popularity) {
            result.push(version)
          }
        } else if (node.sign === '<') {
          if (percentage < popularity) {
            result.push(version)
          }
        } else if (node.sign === '<=') {
          if (percentage <= popularity) {
            result.push(version)
          }
        } else if (percentage >= popularity) {
          result.push(version)
        }
        return result
      }, [])
    }
  },
  popularity_in_place: {
    matches: ['sign', 'popularity', 'place'],
    regexp: /^(>=?|<=?)\s*(\d+|\d+\.\d+|\.\d+)%\s+in\s+((alt-)?\w\w)$/,
    select: function (context, node) {
      var popularity = parseFloat(node.popularity)
      var place = node.place
      if (place.length === 2) {
        place = place.toUpperCase()
      } else {
        place = place.toLowerCase()
      }
      env.loadCountry(browserslist.usage, place, browserslist.data)
      var usage = browserslist.usage[place]
      return Object.keys(usage).reduce(function (result, version) {
        var percentage = usage[version]
        if (percentage == null) {
          return result
        }

        if (node.sign === '>') {
          if (percentage > popularity) {
            result.push(version)
          }
        } else if (node.sign === '<') {
          if (percentage < popularity) {
            result.push(version)
          }
        } else if (node.sign === '<=') {
          if (percentage <= popularity) {
            result.push(version)
          }
        } else if (percentage >= popularity) {
          result.push(version)
        }
        return result
      }, [])
    }
  },
  cover: {
    matches: ['coverage'],
    regexp: /^cover\s+(\d+|\d+\.\d+|\.\d+)%$/i,
    select: coverQuery
  },
  cover_in: {
    matches: ['coverage', 'place'],
    regexp: /^cover\s+(\d+|\d+\.\d+|\.\d+)%\s+in\s+(my\s+stats|(alt-)?\w\w)$/i,
    select: coverQuery
  },
  supports: {
    matches: ['feature'],
    regexp: /^supports\s+([\w-]+)$/,
    select: function (context, node) {
      env.loadFeature(browserslist.cache, node.feature)
      var features = browserslist.cache[node.feature]
      return Object.keys(features).reduce(function (result, version) {
        var flags = features[version]
        if (flags.indexOf('y') >= 0 || flags.indexOf('a') >= 0) {
          result.push(version)
        }
        return result
      }, [])
    }
  },
  electron_range: {
    matches: ['from', 'to'],
    regexp: /^electron\s+([\d.]+)\s*-\s*([\d.]+)$/i,
    select: function (context, node) {
      var fromToUse = normalizeElectron(node.from)
      var toToUse = normalizeElectron(node.to)
      var from = parseFloat(node.from)
      var to = parseFloat(node.to)
      if (!e2c[fromToUse]) {
        throw new BrowserslistError('Unknown version ' + from + ' of electron')
      }
      if (!e2c[toToUse]) {
        throw new BrowserslistError('Unknown version ' + to + ' of electron')
      }
      return Object.keys(e2c)
        .filter(function (i) {
          var parsed = parseFloat(i)
          return parsed >= from && parsed <= to
        })
        .map(function (i) {
          return 'chrome ' + e2c[i]
        })
    }
  },
  node_range: {
    matches: ['from', 'to'],
    regexp: /^node\s+([\d.]+)\s*-\s*([\d.]+)$/i,
    select: function (context, node) {
      return browserslist.nodeVersions
        .filter(semverFilterLoose('>=', node.from))
        .filter(semverFilterLoose('<=', node.to))
        .map(function (v) {
          return 'node ' + v
        })
    }
  },
  browser_range: {
    matches: ['browser', 'from', 'to'],
    regexp: /^(\w+)\s+([\d.]+)\s*-\s*([\d.]+)$/i,
    select: function (context, node) {
      var data = checkName(node.browser, context)
      var from = parseFloat(normalizeVersion(data, node.from) || node.from)
      var to = parseFloat(normalizeVersion(data, node.to) || node.to)
      function filter(v) {
        var parsed = parseFloat(v)
        return parsed >= from && parsed <= to
      }
      return data.released.filter(filter).map(nameMapper(data.name))
    }
  },
  electron_ray: {
    matches: ['sign', 'version'],
    regexp: /^electron\s*(>=?|<=?)\s*([\d.]+)$/i,
    select: function (context, node) {
      var versionToUse = normalizeElectron(node.version)
      return Object.keys(e2c)
        .filter(generateFilter(node.sign, versionToUse))
        .map(function (i) {
          return 'chrome ' + e2c[i]
        })
    }
  },
  node_ray: {
    matches: ['sign', 'version'],
    regexp: /^node\s*(>=?|<=?)\s*([\d.]+)$/i,
    select: function (context, node) {
      return browserslist.nodeVersions
        .filter(generateSemverFilter(node.sign, node.version))
        .map(function (v) {
          return 'node ' + v
        })
    }
  },
  browser_ray: {
    matches: ['browser', 'sign', 'version'],
    regexp: /^(\w+)\s*(>=?|<=?)\s*([\d.]+)$/,
    select: function (context, node) {
      var version = node.version
      var data = checkName(node.browser, context)
      var alias = browserslist.versionAliases[data.name][version]
      if (alias) version = alias
      return data.released
        .filter(generateFilter(node.sign, version))
        .map(function (v) {
          return data.name + ' ' + v
        })
    }
  },
  firefox_esr: {
    matches: [],
    regexp: /^(firefox|ff|fx)\s+esr$/i,
    select: function () {
      return ['firefox 102']
    }
  },
  opera_mini_all: {
    matches: [],
    regexp: /(operamini|op_mini)\s+all/i,
    select: function () {
      return ['op_mini all']
    }
  },
  electron_version: {
    matches: ['version'],
    regexp: /^electron\s+([\d.]+)$/i,
    select: function (context, node) {
      var versionToUse = normalizeElectron(node.version)
      var chrome = e2c[versionToUse]
      if (!chrome) {
        throw new BrowserslistError(
          'Unknown version ' + node.version + ' of electron'
        )
      }
      return ['chrome ' + chrome]
    }
  },
  node_major_version: {
    matches: ['version'],
    regexp: /^node\s+(\d+)$/i,
    select: nodeQuery
  },
  node_minor_version: {
    matches: ['version'],
    regexp: /^node\s+(\d+\.\d+)$/i,
    select: nodeQuery
  },
  node_patch_version: {
    matches: ['version'],
    regexp: /^node\s+(\d+\.\d+\.\d+)$/i,
    select: nodeQuery
  },
  current_node: {
    matches: [],
    regexp: /^current\s+node$/i,
    select: function (context) {
      return [env.currentNode(resolve, context)]
    }
  },
  maintained_node: {
    matches: [],
    regexp: /^maintained\s+node\s+versions$/i,
    select: function (context) {
      var now = Date.now()
      var queries = Object.keys(jsEOL)
        .filter(function (key) {
          return (
            now < Date.parse(jsEOL[key].end) &&
            now > Date.parse(jsEOL[key].start) &&
            isEolReleased(key)
          )
        })
        .map(function (key) {
          return 'node ' + key.slice(1)
        })
      return resolve(queries, context)
    }
  },
  phantomjs_1_9: {
    matches: [],
    regexp: /^phantomjs\s+1.9$/i,
    select: function () {
      return ['safari 5']
    }
  },
  phantomjs_2_1: {
    matches: [],
    regexp: /^phantomjs\s+2.1$/i,
    select: function () {
      return ['safari 6']
    }
  },
  browser_version: {
    matches: ['browser', 'version'],
    regexp: /^(\w+)\s+(tp|[\d.]+)$/i,
    select: function (context, node) {
      var version = node.version
      if (/^tp$/i.test(version)) version = 'TP'
      var data = checkName(node.browser, context)
      var alias = normalizeVersion(data, version)
      if (alias) {
        version = alias
      } else {
        if (version.indexOf('.') === -1) {
          alias = version + '.0'
        } else {
          alias = version.replace(/\.0$/, '')
        }
        alias = normalizeVersion(data, alias)
        if (alias) {
          version = alias
        } else if (context.ignoreUnknownVersions) {
          return []
        } else {
          throw new BrowserslistError(
            'Unknown version ' + version + ' of ' + node.browser
          )
        }
      }
      return [data.name + ' ' + version]
    }
  },
  browserslist_config: {
    matches: [],
    regexp: /^browserslist config$/i,
    select: function (context) {
      return browserslist(undefined, context)
    }
  },
  extends: {
    matches: ['config'],
    regexp: /^extends (.+)$/i,
    select: function (context, node) {
      return resolve(env.loadQueries(context, node.config), context)
    }
  },
  defaults: {
    matches: [],
    regexp: /^defaults$/i,
    select: function (context) {
      return resolve(browserslist.defaults, context)
    }
  },
  dead: {
    matches: [],
    regexp: /^dead$/i,
    select: function (context) {
      var dead = [
        'Baidu >= 0',
        'ie <= 11',
        'ie_mob <= 11',
        'bb <= 10',
        'op_mob <= 12.1',
        'samsung 4'
      ]
      return resolve(dead, context)
    }
  },
  unknown: {
    matches: [],
    regexp: /^(\w+)$/i,
    select: function (context, node) {
      if (byName(node.query, context)) {
        throw new BrowserslistError(
          'Specify versions in Browserslist query for browser ' + node.query
        )
      } else {
        throw unknownQuery(node.query)
      }
    }
  }
}

// Get and convert Can I Use data

;(function () {
  for (var name in agents) {
    var browser = agents[name]
    browserslist.data[name] = {
      name: name,
      versions: normalize(agents[name].versions),
      released: normalize(agents[name].versions.slice(0, -3)),
      releaseDate: agents[name].release_date
    }
    fillUsage(browserslist.usage.global, name, browser.usage_global)

    browserslist.versionAliases[name] = {}
    for (var i = 0; i < browser.versions.length; i++) {
      var full = browser.versions[i]
      if (!full) continue

      if (full.indexOf('-') !== -1) {
        var interval = full.split('-')
        for (var j = 0; j < interval.length; j++) {
          browserslist.versionAliases[name][interval[j]] = full
        }
      }
    }
  }

  browserslist.versionAliases.op_mob['59'] = '58'

  browserslist.nodeVersions = jsReleases.map(function (release) {
    return release.version
  })
})()

module.exports = browserslist


/***/ }),

/***/ "./node_modules/browserslist/parse.js":
/*!********************************************!*\
  !*** ./node_modules/browserslist/parse.js ***!
  \********************************************/
/***/ ((module) => {

var AND_REGEXP = /^\s+and\s+(.*)/i
var OR_REGEXP = /^(?:,\s*|\s+or\s+)(.*)/i

function flatten(array) {
  if (!Array.isArray(array)) return [array]
  return array.reduce(function (a, b) {
    return a.concat(flatten(b))
  }, [])
}

function find(string, predicate) {
  for (var n = 1, max = string.length; n <= max; n++) {
    var parsed = string.substr(-n, n)
    if (predicate(parsed, n, max)) {
      return string.slice(0, -n)
    }
  }
  return ''
}

function matchQuery(all, query) {
  var node = { query: query }
  if (query.indexOf('not ') === 0) {
    node.not = true
    query = query.slice(4)
  }

  for (var name in all) {
    var type = all[name]
    var match = query.match(type.regexp)
    if (match) {
      node.type = name
      for (var i = 0; i < type.matches.length; i++) {
        node[type.matches[i]] = match[i + 1]
      }
      return node
    }
  }

  node.type = 'unknown'
  return node
}

function matchBlock(all, string, qs) {
  var node
  return find(string, function (parsed, n, max) {
    if (AND_REGEXP.test(parsed)) {
      node = matchQuery(all, parsed.match(AND_REGEXP)[1])
      node.compose = 'and'
      qs.unshift(node)
      return true
    } else if (OR_REGEXP.test(parsed)) {
      node = matchQuery(all, parsed.match(OR_REGEXP)[1])
      node.compose = 'or'
      qs.unshift(node)
      return true
    } else if (n === max) {
      node = matchQuery(all, parsed.trim())
      node.compose = 'or'
      qs.unshift(node)
      return true
    }
    return false
  })
}

module.exports = function parse(all, queries) {
  if (!Array.isArray(queries)) queries = [queries]
  return flatten(
    queries.map(function (block) {
      var qs = []
      do {
        block = matchBlock(all, block, qs)
      } while (block)
      return qs
    })
  )
}


/***/ }),

/***/ "./node_modules/call-bind/callBound.js":
/*!*********************************************!*\
  !*** ./node_modules/call-bind/callBound.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(/*! get-intrinsic */ "./node_modules/get-intrinsic/index.js");

var callBind = __webpack_require__(/*! ./ */ "./node_modules/call-bind/index.js");

var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

module.exports = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
		return callBind(intrinsic);
	}
	return intrinsic;
};


/***/ }),

/***/ "./node_modules/call-bind/index.js":
/*!*****************************************!*\
  !*** ./node_modules/call-bind/index.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var bind = __webpack_require__(/*! function-bind */ "./node_modules/function-bind/index.js");
var GetIntrinsic = __webpack_require__(/*! get-intrinsic */ "./node_modules/get-intrinsic/index.js");

var $apply = GetIntrinsic('%Function.prototype.apply%');
var $call = GetIntrinsic('%Function.prototype.call%');
var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);
var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
var $max = GetIntrinsic('%Math.max%');

if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = null;
	}
}

module.exports = function callBind(originalFunction) {
	var func = $reflectApply(bind, $call, arguments);
	if ($gOPD && $defineProperty) {
		var desc = $gOPD(func, 'length');
		if (desc.configurable) {
			// original length, plus the receiver, minus any additional arguments (after the receiver)
			$defineProperty(
				func,
				'length',
				{ value: 1 + $max(0, originalFunction.length - (arguments.length - 1)) }
			);
		}
	}
	return func;
};

var applyBind = function applyBind() {
	return $reflectApply(bind, $apply, arguments);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}


/***/ }),

/***/ "./node_modules/caniuse-lite/data/agents.js":
/*!**************************************************!*\
  !*** ./node_modules/caniuse-lite/data/agents.js ***!
  \**************************************************/
/***/ ((module) => {

module.exports={A:{A:{J:0.0131217,D:0.00621152,E:0.0581246,F:0.0774995,A:0.00968743,B:0.571559,"9B":0.009298},B:"ms",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","9B","J","D","E","F","A","B","","",""],E:"IE",F:{"9B":962323200,J:998870400,D:1161129600,E:1237420800,F:1300060800,A:1346716800,B:1381968000}},B:{A:{C:0.003773,K:0.004267,L:0.004268,G:0.003773,M:0.003702,N:0.003773,O:0.015092,P:0,Q:0.004298,R:0.00944,S:0.004043,T:0.003773,U:0.003773,V:0.003974,W:0.003901,X:0.004318,Y:0.003773,Z:0.004118,a:0.003939,b:0.007546,e:0.004118,f:0.003939,g:0.003801,h:0.003901,i:0.003855,j:0.003929,k:0.003901,l:0.003773,m:0.007546,n:0.003773,o:0.011319,p:0.011319,q:0.018865,r:0.033957,c:1.13945,H:2.85239},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","C","K","L","G","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","a","b","e","f","g","h","i","j","k","l","m","n","o","p","q","r","c","H","","",""],E:"Edge",F:{C:1438128000,K:1447286400,L:1470096000,G:1491868800,M:1508198400,N:1525046400,O:1542067200,P:1579046400,Q:1581033600,R:1586736000,S:1590019200,T:1594857600,U:1598486400,V:1602201600,W:1605830400,X:1611360000,Y:1614816000,Z:1618358400,a:1622073600,b:1626912000,e:1630627200,f:1632441600,g:1634774400,h:1637539200,i:1641427200,j:1643932800,k:1646265600,l:1649635200,m:1651190400,n:1653955200,o:1655942400,p:1659657600,q:1661990400,r:1664755200,c:1666915200,H:1670198400},D:{C:"ms",K:"ms",L:"ms",G:"ms",M:"ms",N:"ms",O:"ms"}},C:{A:{"0":0.004317,"1":0.004393,"2":0.004418,"3":0.008834,"4":0.008322,"5":0.008928,"6":0.004471,"7":0.009284,"8":0.004707,"9":0.009076,AC:0.004118,rB:0.004271,I:0.011703,s:0.004879,J:0.020136,D:0.005725,E:0.004525,F:0.00533,A:0.004283,B:0.007546,C:0.004471,K:0.004486,L:0.00453,G:0.008322,M:0.004417,N:0.004425,O:0.004161,t:0.004443,u:0.004283,v:0.008322,w:0.013698,x:0.004161,y:0.008786,z:0.004118,AB:0.007546,BB:0.004783,CB:0.003929,DB:0.004783,EB:0.00487,FB:0.005029,GB:0.0047,HB:0.094325,IB:0.007546,JB:0.003867,KB:0.004525,LB:0.004293,MB:0.003773,NB:0.004538,OB:0.008282,PB:0.011601,QB:0.052822,RB:0.011601,SB:0.003929,TB:0.003974,UB:0.007546,VB:0.011601,WB:0.003939,sB:0.003773,XB:0.003929,tB:0.004356,YB:0.004425,ZB:0.008322,aB:0.00415,bB:0.004267,cB:0.003801,dB:0.004267,eB:0.003773,fB:0.00415,gB:0.004293,hB:0.004425,d:0.003773,iB:0.00415,jB:0.00415,kB:0.004318,lB:0.004356,mB:0.003974,nB:0.033957,P:0.003773,Q:0.003773,R:0.003773,uB:0.003773,S:0.003773,T:0.003929,U:0.004268,V:0.003801,W:0.011319,X:0.007546,Y:0.003773,Z:0.003773,a:0.018865,b:0.003801,e:0.003855,f:0.018865,g:0.003773,h:0.003773,i:0.003901,j:0.003901,k:0.007546,l:0.007546,m:0.007546,n:0.083006,o:0.030184,p:0.015092,q:0.030184,r:0.049049,c:1.12058,H:0.939477,vB:0.011319,wB:0,BC:0.008786,CC:0.00487},B:"moz",C:["AC","rB","BC","CC","I","s","J","D","E","F","A","B","C","K","L","G","M","N","O","t","u","v","w","x","y","z","0","1","2","3","4","5","6","7","8","9","AB","BB","CB","DB","EB","FB","GB","HB","IB","JB","KB","LB","MB","NB","OB","PB","QB","RB","SB","TB","UB","VB","WB","sB","XB","tB","YB","ZB","aB","bB","cB","dB","eB","fB","gB","hB","d","iB","jB","kB","lB","mB","nB","P","Q","R","uB","S","T","U","V","W","X","Y","Z","a","b","e","f","g","h","i","j","k","l","m","n","o","p","q","r","c","H","vB","wB",""],E:"Firefox",F:{"0":1386633600,"1":1391472000,"2":1395100800,"3":1398729600,"4":1402358400,"5":1405987200,"6":1409616000,"7":1413244800,"8":1417392000,"9":1421107200,AC:1161648000,rB:1213660800,BC:1246320000,CC:1264032000,I:1300752000,s:1308614400,J:1313452800,D:1317081600,E:1317081600,F:1320710400,A:1324339200,B:1327968000,C:1331596800,K:1335225600,L:1338854400,G:1342483200,M:1346112000,N:1349740800,O:1353628800,t:1357603200,u:1361232000,v:1364860800,w:1368489600,x:1372118400,y:1375747200,z:1379376000,AB:1424736000,BB:1428278400,CB:1431475200,DB:1435881600,EB:1439251200,FB:1442880000,GB:1446508800,HB:1450137600,IB:1453852800,JB:1457395200,KB:1461628800,LB:1465257600,MB:1470096000,NB:1474329600,OB:1479168000,PB:1485216000,QB:1488844800,RB:1492560000,SB:1497312000,TB:1502150400,UB:1506556800,VB:1510617600,WB:1516665600,sB:1520985600,XB:1525824000,tB:1529971200,YB:1536105600,ZB:1540252800,aB:1544486400,bB:1548720000,cB:1552953600,dB:1558396800,eB:1562630400,fB:1567468800,gB:1571788800,hB:1575331200,d:1578355200,iB:1581379200,jB:1583798400,kB:1586304000,lB:1588636800,mB:1591056000,nB:1593475200,P:1595894400,Q:1598313600,R:1600732800,uB:1603152000,S:1605571200,T:1607990400,U:1611619200,V:1614038400,W:1616457600,X:1618790400,Y:1622505600,Z:1626134400,a:1628553600,b:1630972800,e:1633392000,f:1635811200,g:1638835200,h:1641859200,i:1644364800,j:1646697600,k:1649116800,l:1651536000,m:1653955200,n:1656374400,o:1658793600,p:1661212800,q:1663632000,r:1666051200,c:1668470400,H:1670889600,vB:null,wB:null}},D:{A:{"0":0.004141,"1":0.004326,"2":0.0047,"3":0.004538,"4":0.008322,"5":0.008596,"6":0.004566,"7":0.004118,"8":0.007546,"9":0.003901,I:0.004706,s:0.004879,J:0.004879,D:0.005591,E:0.005591,F:0.005591,A:0.004534,B:0.004464,C:0.010424,K:0.0083,L:0.004706,G:0.015087,M:0.004393,N:0.004393,O:0.008652,t:0.008322,u:0.004393,v:0.004317,w:0.003901,x:0.008786,y:0.003939,z:0.004461,AB:0.004335,BB:0.004464,CB:0.015092,DB:0.003867,EB:0.015092,FB:0.003773,GB:0.003974,HB:0.007546,IB:0.007948,JB:0.003974,KB:0.003867,LB:0.007546,MB:0.022638,NB:0.049049,OB:0.003867,PB:0.003929,QB:0.007546,RB:0.011319,SB:0.003867,TB:0.007546,UB:0.045276,VB:0.003773,WB:0.003773,sB:0.003773,XB:0.011319,tB:0.011319,YB:0.003773,ZB:0.015092,aB:0.003773,bB:0.011319,cB:0.030184,dB:0.007546,eB:0.007546,fB:0.079233,gB:0.026411,hB:0.011319,d:0.03773,iB:0.011319,jB:0.045276,kB:0.041503,lB:0.026411,mB:0.011319,nB:0.033957,P:0.120736,Q:0.041503,R:0.041503,S:0.07546,T:0.045276,U:0.094325,V:0.07546,W:0.079233,X:0.018865,Y:0.033957,Z:0.026411,a:0.056595,b:0.041503,e:0.049049,f:0.033957,g:0.022638,h:0.041503,i:0.056595,j:0.098098,k:0.049049,l:0.079233,m:0.060368,n:0.098098,o:0.279202,p:0.124509,q:0.192423,r:0.286748,c:3.64849,H:16.8389,vB:0.033957,wB:0.018865,DC:0.011319},B:"webkit",C:["","","","","","I","s","J","D","E","F","A","B","C","K","L","G","M","N","O","t","u","v","w","x","y","z","0","1","2","3","4","5","6","7","8","9","AB","BB","CB","DB","EB","FB","GB","HB","IB","JB","KB","LB","MB","NB","OB","PB","QB","RB","SB","TB","UB","VB","WB","sB","XB","tB","YB","ZB","aB","bB","cB","dB","eB","fB","gB","hB","d","iB","jB","kB","lB","mB","nB","P","Q","R","S","T","U","V","W","X","Y","Z","a","b","e","f","g","h","i","j","k","l","m","n","o","p","q","r","c","H","vB","wB","DC"],E:"Chrome",F:{"0":1361404800,"1":1364428800,"2":1369094400,"3":1374105600,"4":1376956800,"5":1384214400,"6":1389657600,"7":1392940800,"8":1397001600,"9":1400544000,I:1264377600,s:1274745600,J:1283385600,D:1287619200,E:1291248000,F:1296777600,A:1299542400,B:1303862400,C:1307404800,K:1312243200,L:1316131200,G:1316131200,M:1319500800,N:1323734400,O:1328659200,t:1332892800,u:1337040000,v:1340668800,w:1343692800,x:1348531200,y:1352246400,z:1357862400,AB:1405468800,BB:1409011200,CB:1412640000,DB:1416268800,EB:1421798400,FB:1425513600,GB:1429401600,HB:1432080000,IB:1437523200,JB:1441152000,KB:1444780800,LB:1449014400,MB:1453248000,NB:1456963200,OB:1460592000,PB:1464134400,QB:1469059200,RB:1472601600,SB:1476230400,TB:1480550400,UB:1485302400,VB:1489017600,WB:1492560000,sB:1496707200,XB:1500940800,tB:1504569600,YB:1508198400,ZB:1512518400,aB:1516752000,bB:1520294400,cB:1523923200,dB:1527552000,eB:1532390400,fB:1536019200,gB:1539648000,hB:1543968000,d:1548720000,iB:1552348800,jB:1555977600,kB:1559606400,lB:1564444800,mB:1568073600,nB:1571702400,P:1575936000,Q:1580860800,R:1586304000,S:1589846400,T:1594684800,U:1598313600,V:1601942400,W:1605571200,X:1611014400,Y:1614556800,Z:1618272000,a:1621987200,b:1626739200,e:1630368000,f:1632268800,g:1634601600,h:1637020800,i:1641340800,j:1643673600,k:1646092800,l:1648512000,m:1650931200,n:1653350400,o:1655769600,p:1659398400,q:1661817600,r:1664236800,c:1666656000,H:1669680000,vB:null,wB:null,DC:null}},E:{A:{I:0,s:0.008322,J:0.004656,D:0.004465,E:0.003974,F:0.003929,A:0.004425,B:0.004318,C:0.003801,K:0.018865,L:0.094325,G:0.022638,EC:0,xB:0.008692,FC:0.011319,GC:0.00456,HC:0.004283,IC:0.022638,yB:0.007802,oB:0.007546,pB:0.033957,zB:0.18865,JC:0.256564,KC:0.041503,"0B":0.03773,"1B":0.094325,"2B":0.192423,"3B":1.313,qB:0.162239,"4B":0.64141,"5B":0.143374,"6B":0,LC:0},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","EC","xB","I","s","FC","J","GC","D","HC","E","F","IC","A","yB","B","oB","C","pB","K","zB","L","JC","G","KC","0B","1B","2B","3B","qB","4B","5B","6B","LC",""],E:"Safari",F:{EC:1205798400,xB:1226534400,I:1244419200,s:1275868800,FC:1311120000,J:1343174400,GC:1382400000,D:1382400000,HC:1410998400,E:1413417600,F:1443657600,IC:1458518400,A:1474329600,yB:1490572800,B:1505779200,oB:1522281600,C:1537142400,pB:1553472000,K:1568851200,zB:1585008000,L:1600214400,JC:1619395200,G:1632096000,KC:1635292800,"0B":1639353600,"1B":1647216000,"2B":1652745600,"3B":1658275200,qB:1662940800,"4B":1666569600,"5B":1670889600,"6B":null,LC:null}},F:{A:{"0":0.005595,"1":0.004393,"2":0.007546,"3":0.004879,"4":0.004879,"5":0.003773,"6":0.005152,"7":0.005014,"8":0.009758,"9":0.004879,F:0.0082,B:0.016581,C:0.004317,G:0.00685,M:0.00685,N:0.00685,O:0.005014,t:0.006015,u:0.004879,v:0.006597,w:0.006597,x:0.013434,y:0.006702,z:0.006015,AB:0.003773,BB:0.004283,CB:0.004367,DB:0.004534,EB:0.007546,FB:0.004227,GB:0.004418,HB:0.004161,IB:0.004227,JB:0.004725,KB:0.015092,LB:0.008942,MB:0.004707,NB:0.004827,OB:0.004707,PB:0.004707,QB:0.004326,RB:0.008922,SB:0.014349,TB:0.004425,UB:0.00472,VB:0.004425,WB:0.004425,XB:0.00472,YB:0.004532,ZB:0.004566,aB:0.02283,bB:0.00867,cB:0.004656,dB:0.004642,eB:0.003929,fB:0.00944,gB:0.004293,hB:0.003929,d:0.004298,iB:0.096692,jB:0.004201,kB:0.004141,lB:0.004257,mB:0.003939,nB:0.008236,P:0.003855,Q:0.003939,R:0.008514,uB:0.003939,S:0.003939,T:0.003702,U:0.007546,V:0.003855,W:0.003855,X:0.003929,Y:0.007802,Z:0.011703,a:0.007546,b:0.207515,MC:0.00685,NC:0,OC:0.008392,PC:0.004706,oB:0.006229,"7B":0.004879,QC:0.008786,pB:0.00472},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","F","MC","NC","OC","PC","B","oB","7B","QC","C","pB","G","M","N","O","t","u","v","w","x","y","z","0","1","2","3","4","5","6","7","8","9","AB","BB","CB","DB","EB","FB","GB","HB","IB","JB","KB","LB","MB","NB","OB","PB","QB","RB","SB","TB","UB","VB","WB","XB","YB","ZB","aB","bB","cB","dB","eB","fB","gB","hB","d","iB","jB","kB","lB","mB","nB","P","Q","R","uB","S","T","U","V","W","X","Y","Z","a","b","","",""],E:"Opera",F:{"0":1417132800,"1":1422316800,"2":1425945600,"3":1430179200,"4":1433808000,"5":1438646400,"6":1442448000,"7":1445904000,"8":1449100800,"9":1454371200,F:1150761600,MC:1223424000,NC:1251763200,OC:1267488000,PC:1277942400,B:1292457600,oB:1302566400,"7B":1309219200,QC:1323129600,C:1323129600,pB:1352073600,G:1372723200,M:1377561600,N:1381104000,O:1386288000,t:1390867200,u:1393891200,v:1399334400,w:1401753600,x:1405987200,y:1409616000,z:1413331200,AB:1457308800,BB:1462320000,CB:1465344000,DB:1470096000,EB:1474329600,FB:1477267200,GB:1481587200,HB:1486425600,IB:1490054400,JB:1494374400,KB:1498003200,LB:1502236800,MB:1506470400,NB:1510099200,OB:1515024000,PB:1517961600,QB:1521676800,RB:1525910400,SB:1530144000,TB:1534982400,UB:1537833600,VB:1543363200,WB:1548201600,XB:1554768000,YB:1561593600,ZB:1566259200,aB:1570406400,bB:1573689600,cB:1578441600,dB:1583971200,eB:1587513600,fB:1592956800,gB:1595894400,hB:1600128000,d:1603238400,iB:1613520000,jB:1612224000,kB:1616544000,lB:1619568000,mB:1623715200,nB:1627948800,P:1631577600,Q:1633392000,R:1635984000,uB:1638403200,S:1642550400,T:1644969600,U:1647993600,V:1650412800,W:1652745600,X:1654646400,Y:1657152000,Z:1660780800,a:1663113600,b:1668816000},D:{F:"o",B:"o",C:"o",MC:"o",NC:"o",OC:"o",PC:"o",oB:"o","7B":"o",QC:"o",pB:"o"}},G:{A:{E:0,xB:0,RC:0,"8B":0.00470195,SC:0.00470195,TC:0.00313463,UC:0.0141058,VC:0.00626926,WC:0.0188078,XC:0.0611253,YC:0.00783658,ZC:0.106577,aC:0.0282117,bC:0.0266444,cC:0.0250771,dC:0.405935,eC:0.0423175,fC:0.0109712,gC:0.0391829,hC:0.141058,iC:0.340108,jC:0.647301,kC:0.186511,"0B":0.239799,"1B":0.304059,"2B":0.546993,"3B":2.31493,qB:2.09864,"4B":6.33196,"5B":0.694321,"6B":0.0156732},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","xB","RC","8B","SC","TC","UC","E","VC","WC","XC","YC","ZC","aC","bC","cC","dC","eC","fC","gC","hC","iC","jC","kC","0B","1B","2B","3B","qB","4B","5B","6B","",""],E:"Safari on iOS",F:{xB:1270252800,RC:1283904000,"8B":1299628800,SC:1331078400,TC:1359331200,UC:1394409600,E:1410912000,VC:1413763200,WC:1442361600,XC:1458518400,YC:1473724800,ZC:1490572800,aC:1505779200,bC:1522281600,cC:1537142400,dC:1553472000,eC:1568851200,fC:1572220800,gC:1580169600,hC:1585008000,iC:1600214400,jC:1619395200,kC:1632096000,"0B":1639353600,"1B":1647216000,"2B":1652659200,"3B":1658275200,qB:1662940800,"4B":1666569600,"5B":1670889600,"6B":null}},H:{A:{lC:0.966988},B:"o",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","lC","","",""],E:"Opera Mini",F:{lC:1426464000}},I:{A:{rB:0,I:0.0306951,H:0,mC:0,nC:0.0204634,oC:0,pC:0.0204634,"8B":0.0818537,qC:0,rC:0.4195},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","mC","nC","oC","rB","I","pC","8B","qC","rC","H","","",""],E:"Android Browser",F:{mC:1256515200,nC:1274313600,oC:1291593600,rB:1298332800,I:1318896000,pC:1341792000,"8B":1374624000,qC:1386547200,rC:1401667200,H:1669939200}},J:{A:{D:0,A:0},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","D","A","","",""],E:"Blackberry Browser",F:{D:1325376000,A:1359504000}},K:{A:{A:0,B:0,C:0,d:0.0111391,oB:0,"7B":0,pB:0},B:"o",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","A","B","oB","7B","C","pB","d","","",""],E:"Opera Mobile",F:{A:1287100800,B:1300752000,oB:1314835200,"7B":1318291200,C:1330300800,pB:1349740800,d:1666828800},D:{d:"webkit"}},L:{A:{H:41.5426},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","H","","",""],E:"Chrome for Android",F:{H:1669939200}},M:{A:{c:0.292716},B:"moz",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","c","","",""],E:"Firefox for Android",F:{c:1668470400}},N:{A:{A:0.0115934,B:0.022664},B:"ms",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","A","B","","",""],E:"IE Mobile",F:{A:1340150400,B:1353456000}},O:{A:{sC:1.75007},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","sC","","",""],E:"UC Browser for Android",F:{sC:1634688000},D:{sC:"webkit"}},P:{A:{I:0.166409,tC:0.0103543,uC:0.010304,vC:0.0520028,wC:0.0103584,xC:0.0104443,yB:0.0105043,yC:0.0312017,zC:0.0104006,"0C":0.0520028,"1C":0.0624033,"2C":0.0312017,qB:0.114406,"3C":0.124807,"4C":0.249613,"5C":2.25692},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","I","tC","uC","vC","wC","xC","yB","yC","zC","0C","1C","2C","qB","3C","4C","5C","","",""],E:"Samsung Internet",F:{I:1461024000,tC:1481846400,uC:1509408000,vC:1528329600,wC:1546128000,xC:1554163200,yB:1567900800,yC:1582588800,zC:1593475200,"0C":1605657600,"1C":1618531200,"2C":1629072000,qB:1640736000,"3C":1651708800,"4C":1659657600,"5C":1667260800}},Q:{A:{zB:0.199296},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","zB","","",""],E:"QQ Browser",F:{zB:1663718400}},R:{A:{"6C":0},B:"webkit",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","6C","","",""],E:"Baidu Browser",F:{"6C":1663027200}},S:{A:{"7C":0.068508},B:"moz",C:["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","7C","","",""],E:"KaiOS Browser",F:{"7C":1527811200}}};


/***/ }),

/***/ "./node_modules/caniuse-lite/data/browserVersions.js":
/*!***********************************************************!*\
  !*** ./node_modules/caniuse-lite/data/browserVersions.js ***!
  \***********************************************************/
/***/ ((module) => {

module.exports={"0":"26","1":"27","2":"28","3":"29","4":"30","5":"31","6":"32","7":"33","8":"34","9":"35",A:"10",B:"11",C:"12",D:"7",E:"8",F:"9",G:"15",H:"108",I:"4",J:"6",K:"13",L:"14",M:"16",N:"17",O:"18",P:"79",Q:"80",R:"81",S:"83",T:"84",U:"85",V:"86",W:"87",X:"88",Y:"89",Z:"90",a:"91",b:"92",c:"107",d:"72",e:"93",f:"94",g:"95",h:"96",i:"97",j:"98",k:"99",l:"100",m:"101",n:"102",o:"103",p:"104",q:"105",r:"106",s:"5",t:"19",u:"20",v:"21",w:"22",x:"23",y:"24",z:"25",AB:"36",BB:"37",CB:"38",DB:"39",EB:"40",FB:"41",GB:"42",HB:"43",IB:"44",JB:"45",KB:"46",LB:"47",MB:"48",NB:"49",OB:"50",PB:"51",QB:"52",RB:"53",SB:"54",TB:"55",UB:"56",VB:"57",WB:"58",XB:"60",YB:"62",ZB:"63",aB:"64",bB:"65",cB:"66",dB:"67",eB:"68",fB:"69",gB:"70",hB:"71",iB:"73",jB:"74",kB:"75",lB:"76",mB:"77",nB:"78",oB:"11.1",pB:"12.1",qB:"16.0",rB:"3",sB:"59",tB:"61",uB:"82",vB:"109",wB:"110",xB:"3.2",yB:"10.1",zB:"13.1","0B":"15.2-15.3","1B":"15.4","2B":"15.5","3B":"15.6","4B":"16.1","5B":"16.2","6B":"16.3","7B":"11.5","8B":"4.2-4.3","9B":"5.5",AC:"2",BC:"3.5",CC:"3.6",DC:"111",EC:"3.1",FC:"5.1",GC:"6.1",HC:"7.1",IC:"9.1",JC:"14.1",KC:"15.1",LC:"TP",MC:"9.5-9.6",NC:"10.0-10.1",OC:"10.5",PC:"10.6",QC:"11.6",RC:"4.0-4.1",SC:"5.0-5.1",TC:"6.0-6.1",UC:"7.0-7.1",VC:"8.1-8.4",WC:"9.0-9.2",XC:"9.3",YC:"10.0-10.2",ZC:"10.3",aC:"11.0-11.2",bC:"11.3-11.4",cC:"12.0-12.1",dC:"12.2-12.5",eC:"13.0-13.1",fC:"13.2",gC:"13.3",hC:"13.4-13.7",iC:"14.0-14.4",jC:"14.5-14.8",kC:"15.0-15.1",lC:"all",mC:"2.1",nC:"2.2",oC:"2.3",pC:"4.1",qC:"4.4",rC:"4.4.3-4.4.4",sC:"13.4",tC:"5.0-5.4",uC:"6.2-6.4",vC:"7.2-7.4",wC:"8.2",xC:"9.2",yC:"11.1-11.2",zC:"12.0","0C":"13.0","1C":"14.0","2C":"15.0","3C":"17.0","4C":"18.0","5C":"19.0","6C":"13.18","7C":"2.5"};


/***/ }),

/***/ "./node_modules/caniuse-lite/data/browsers.js":
/*!****************************************************!*\
  !*** ./node_modules/caniuse-lite/data/browsers.js ***!
  \****************************************************/
/***/ ((module) => {

module.exports={A:"ie",B:"edge",C:"firefox",D:"chrome",E:"safari",F:"opera",G:"ios_saf",H:"op_mini",I:"android",J:"bb",K:"op_mob",L:"and_chr",M:"and_ff",N:"ie_mob",O:"and_uc",P:"samsung",Q:"and_qq",R:"baidu",S:"kaios"};


/***/ }),

/***/ "./node_modules/caniuse-lite/dist/unpacker/agents.js":
/*!***********************************************************!*\
  !*** ./node_modules/caniuse-lite/dist/unpacker/agents.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const browsers = (__webpack_require__(/*! ./browsers */ "./node_modules/caniuse-lite/dist/unpacker/browsers.js").browsers)
const versions = (__webpack_require__(/*! ./browserVersions */ "./node_modules/caniuse-lite/dist/unpacker/browserVersions.js").browserVersions)
const agentsData = __webpack_require__(/*! ../../data/agents */ "./node_modules/caniuse-lite/data/agents.js")

function unpackBrowserVersions(versionsData) {
  return Object.keys(versionsData).reduce((usage, version) => {
    usage[versions[version]] = versionsData[version]
    return usage
  }, {})
}

module.exports.agents = Object.keys(agentsData).reduce((map, key) => {
  let versionsData = agentsData[key]
  map[browsers[key]] = Object.keys(versionsData).reduce((data, entry) => {
    if (entry === 'A') {
      data.usage_global = unpackBrowserVersions(versionsData[entry])
    } else if (entry === 'C') {
      data.versions = versionsData[entry].reduce((list, version) => {
        if (version === '') {
          list.push(null)
        } else {
          list.push(versions[version])
        }
        return list
      }, [])
    } else if (entry === 'D') {
      data.prefix_exceptions = unpackBrowserVersions(versionsData[entry])
    } else if (entry === 'E') {
      data.browser = versionsData[entry]
    } else if (entry === 'F') {
      data.release_date = Object.keys(versionsData[entry]).reduce(
        (map2, key2) => {
          map2[versions[key2]] = versionsData[entry][key2]
          return map2
        },
        {}
      )
    } else {
      // entry is B
      data.prefix = versionsData[entry]
    }
    return data
  }, {})
  return map
}, {})


/***/ }),

/***/ "./node_modules/caniuse-lite/dist/unpacker/browserVersions.js":
/*!********************************************************************!*\
  !*** ./node_modules/caniuse-lite/dist/unpacker/browserVersions.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports.browserVersions = __webpack_require__(/*! ../../data/browserVersions */ "./node_modules/caniuse-lite/data/browserVersions.js")


/***/ }),

/***/ "./node_modules/caniuse-lite/dist/unpacker/browsers.js":
/*!*************************************************************!*\
  !*** ./node_modules/caniuse-lite/dist/unpacker/browsers.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports.browsers = __webpack_require__(/*! ../../data/browsers */ "./node_modules/caniuse-lite/data/browsers.js")


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/global.css":
/*!**************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/global.css ***!
  \**************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, ".glow {\n  background-color: black;\n  border-style: solid;\n  border-color: green;\n  border-width: 5px;\n  \n  box-shadow: 0 0 40px black;\n}\n\n.navButton {\n  background-color: green;\n  color: black;\n\n  border-radius: 5px;\n  border-width: 0px;\n\n  font-size: x-large;\n  font-weight: bold;\n  padding: 5px;\n}\n\n.navButton:hover {\n  background-color: black;\n  color: green;\n\n  outline-style: solid;\n  outline-width: 2px;\n}\n\n.footer {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 10px;\n  padding: 10px;\n  width: 900px;\n}\n\nbutton:hover{\n  cursor: pointer;\n}\n\n@media only screen and (max-width: 1000px) {\n  .navButton{\n    font-size: larger;\n  }\n}", "",{"version":3,"sources":["webpack://./src/global.css"],"names":[],"mappings":"AAAA;EACE,uBAAuB;EACvB,mBAAmB;EACnB,mBAAmB;EACnB,iBAAiB;;EAEjB,0BAA0B;AAC5B;;AAEA;EACE,uBAAuB;EACvB,YAAY;;EAEZ,kBAAkB;EAClB,iBAAiB;;EAEjB,kBAAkB;EAClB,iBAAiB;EACjB,YAAY;AACd;;AAEA;EACE,uBAAuB;EACvB,YAAY;;EAEZ,oBAAoB;EACpB,kBAAkB;AACpB;;AAEA;EACE,aAAa;EACb,uBAAuB;EACvB,mBAAmB;EACnB,SAAS;EACT,aAAa;EACb,YAAY;AACd;;AAEA;EACE,eAAe;AACjB;;AAEA;EACE;IACE,iBAAiB;EACnB;AACF","sourcesContent":[".glow {\n  background-color: black;\n  border-style: solid;\n  border-color: green;\n  border-width: 5px;\n  \n  box-shadow: 0 0 40px black;\n}\n\n.navButton {\n  background-color: green;\n  color: black;\n\n  border-radius: 5px;\n  border-width: 0px;\n\n  font-size: x-large;\n  font-weight: bold;\n  padding: 5px;\n}\n\n.navButton:hover {\n  background-color: black;\n  color: green;\n\n  outline-style: solid;\n  outline-width: 2px;\n}\n\n.footer {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 10px;\n  padding: 10px;\n  width: 900px;\n}\n\nbutton:hover{\n  cursor: pointer;\n}\n\n@media only screen and (max-width: 1000px) {\n  .navButton{\n    font-size: larger;\n  }\n}"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/initialPage.css":
/*!*******************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/initialPage.css ***!
  \*******************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/getUrl.js */ "./node_modules/css-loader/dist/runtime/getUrl.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2__);
// Imports



var ___CSS_LOADER_URL_IMPORT_0___ = new URL(/* asset import */ __webpack_require__(/*! imgs/noodlestv.png */ "./src/imgs/noodlestv.png"), __webpack_require__.b);
var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
var ___CSS_LOADER_URL_REPLACEMENT_0___ = _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2___default()(___CSS_LOADER_URL_IMPORT_0___);
// Module
___CSS_LOADER_EXPORT___.push([module.id, ".header {\n    background-image: url(" + ___CSS_LOADER_URL_REPLACEMENT_0___ + ");\n    background-size: cover;\n    background-repeat: no-repeat;\n    background-position: center;\n\n    width: 900px;\n    height: 600px;\n\n    display:inline-block;\n}\n\n.opaque{\n    background-color: rgba(0, 0, 0, 0.5);\n    font-size: xx-large;\n    text-align: center;\n    color: white;\n    margin-top: 250px;\n}\n\n.navBar {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n\n    background-color: black;\n    padding: 5px 10px;\n}\n\n.titleImg{\n    width: 150px;\n    height: 50px;\n}\n\n.map {\n    width: 900px;\n}\n\n.storeHours{\n    width: 900px;\n    display: flex;\n    align-items: center;\n    padding: 5px 10px;\n    font-size: x-large;\n}\n\n.storeHours table {\n    flex: 1;\n}\n\n.storeHours table tr {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n}\n\n.storeHours table th {\n    padding: 5px;\n    text-align: left;\n}\n\n.information {\n    padding: 25px;\n    font-size: large;\n}\n\n.credits {\n    display: flex;\n    flex-direction: column;\n    width: 100%;\n    gap: 10px;\n    font-size: x-large;\n    padding: 20px;\n}\n\n\n@media only screen and (max-width: 1000px) {\n    #content > * {\n        width: 95vw;\n        height: auto;\n    }\n\n    .titleImg{\n        width: 100px;\n        height: auto;\n    }\n}", "",{"version":3,"sources":["webpack://./src/initialPage.css"],"names":[],"mappings":"AAAA;IACI,yDAA2C;IAC3C,sBAAsB;IACtB,4BAA4B;IAC5B,2BAA2B;;IAE3B,YAAY;IACZ,aAAa;;IAEb,oBAAoB;AACxB;;AAEA;IACI,oCAAoC;IACpC,mBAAmB;IACnB,kBAAkB;IAClB,YAAY;IACZ,iBAAiB;AACrB;;AAEA;IACI,aAAa;IACb,8BAA8B;IAC9B,mBAAmB;;IAEnB,uBAAuB;IACvB,iBAAiB;AACrB;;AAEA;IACI,YAAY;IACZ,YAAY;AAChB;;AAEA;IACI,YAAY;AAChB;;AAEA;IACI,YAAY;IACZ,aAAa;IACb,mBAAmB;IACnB,iBAAiB;IACjB,kBAAkB;AACtB;;AAEA;IACI,OAAO;AACX;;AAEA;IACI,aAAa;IACb,8BAA8B;IAC9B,mBAAmB;AACvB;;AAEA;IACI,YAAY;IACZ,gBAAgB;AACpB;;AAEA;IACI,aAAa;IACb,gBAAgB;AACpB;;AAEA;IACI,aAAa;IACb,sBAAsB;IACtB,WAAW;IACX,SAAS;IACT,kBAAkB;IAClB,aAAa;AACjB;;;AAGA;IACI;QACI,WAAW;QACX,YAAY;IAChB;;IAEA;QACI,YAAY;QACZ,YAAY;IAChB;AACJ","sourcesContent":[".header {\n    background-image: url('imgs/noodlestv.png');\n    background-size: cover;\n    background-repeat: no-repeat;\n    background-position: center;\n\n    width: 900px;\n    height: 600px;\n\n    display:inline-block;\n}\n\n.opaque{\n    background-color: rgba(0, 0, 0, 0.5);\n    font-size: xx-large;\n    text-align: center;\n    color: white;\n    margin-top: 250px;\n}\n\n.navBar {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n\n    background-color: black;\n    padding: 5px 10px;\n}\n\n.titleImg{\n    width: 150px;\n    height: 50px;\n}\n\n.map {\n    width: 900px;\n}\n\n.storeHours{\n    width: 900px;\n    display: flex;\n    align-items: center;\n    padding: 5px 10px;\n    font-size: x-large;\n}\n\n.storeHours table {\n    flex: 1;\n}\n\n.storeHours table tr {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n}\n\n.storeHours table th {\n    padding: 5px;\n    text-align: left;\n}\n\n.information {\n    padding: 25px;\n    font-size: large;\n}\n\n.credits {\n    display: flex;\n    flex-direction: column;\n    width: 100%;\n    gap: 10px;\n    font-size: x-large;\n    padding: 20px;\n}\n\n\n@media only screen and (max-width: 1000px) {\n    #content > * {\n        width: 95vw;\n        height: auto;\n    }\n\n    .titleImg{\n        width: 100px;\n        height: auto;\n    }\n}"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./src/menu.css":
/*!************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./src/menu.css ***!
  \************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, ".menuContainer {\n  width: 900px;\n}\n\n.menu {\n  width: 100%;\n  height: 750px;\n  font-size: x-large;\n  text-align: center;\n}\n\n.menu  *{\n  outline-style: solid;\n  outline-color: green;\n}\n\n.menu caption {\n  font-size: xx-large;\n}\n\n@media only screen and (max-width: 1000px) {\n  .menuContainer{\n    width: 95vw;\n  }\n  \n  .menu>tr>td:nth-child(4), .menu>tr>th:nth-child(4){\n    display: none;\n  }\n\n  .menu {\n    font-size:larger;\n  }\n}", "",{"version":3,"sources":["webpack://./src/menu.css"],"names":[],"mappings":"AAAA;EACE,YAAY;AACd;;AAEA;EACE,WAAW;EACX,aAAa;EACb,kBAAkB;EAClB,kBAAkB;AACpB;;AAEA;EACE,oBAAoB;EACpB,oBAAoB;AACtB;;AAEA;EACE,mBAAmB;AACrB;;AAEA;EACE;IACE,WAAW;EACb;;EAEA;IACE,aAAa;EACf;;EAEA;IACE,gBAAgB;EAClB;AACF","sourcesContent":[".menuContainer {\n  width: 900px;\n}\n\n.menu {\n  width: 100%;\n  height: 750px;\n  font-size: x-large;\n  text-align: center;\n}\n\n.menu  *{\n  outline-style: solid;\n  outline-color: green;\n}\n\n.menu caption {\n  font-size: xx-large;\n}\n\n@media only screen and (max-width: 1000px) {\n  .menuContainer{\n    width: 95vw;\n  }\n  \n  .menu>tr>td:nth-child(4), .menu>tr>th:nth-child(4){\n    display: none;\n  }\n\n  .menu {\n    font-size:larger;\n  }\n}"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/api.js":
/*!*****************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/api.js ***!
  \*****************************************************/
/***/ ((module) => {

"use strict";


/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
module.exports = function (cssWithMappingToString) {
  var list = [];

  // return the list of modules as css string
  list.toString = function toString() {
    return this.map(function (item) {
      var content = "";
      var needLayer = typeof item[5] !== "undefined";
      if (item[4]) {
        content += "@supports (".concat(item[4], ") {");
      }
      if (item[2]) {
        content += "@media ".concat(item[2], " {");
      }
      if (needLayer) {
        content += "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {");
      }
      content += cssWithMappingToString(item);
      if (needLayer) {
        content += "}";
      }
      if (item[2]) {
        content += "}";
      }
      if (item[4]) {
        content += "}";
      }
      return content;
    }).join("");
  };

  // import a list of modules into the list
  list.i = function i(modules, media, dedupe, supports, layer) {
    if (typeof modules === "string") {
      modules = [[null, modules, undefined]];
    }
    var alreadyImportedModules = {};
    if (dedupe) {
      for (var k = 0; k < this.length; k++) {
        var id = this[k][0];
        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }
    for (var _k = 0; _k < modules.length; _k++) {
      var item = [].concat(modules[_k]);
      if (dedupe && alreadyImportedModules[item[0]]) {
        continue;
      }
      if (typeof layer !== "undefined") {
        if (typeof item[5] === "undefined") {
          item[5] = layer;
        } else {
          item[1] = "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {").concat(item[1], "}");
          item[5] = layer;
        }
      }
      if (media) {
        if (!item[2]) {
          item[2] = media;
        } else {
          item[1] = "@media ".concat(item[2], " {").concat(item[1], "}");
          item[2] = media;
        }
      }
      if (supports) {
        if (!item[4]) {
          item[4] = "".concat(supports);
        } else {
          item[1] = "@supports (".concat(item[4], ") {").concat(item[1], "}");
          item[4] = supports;
        }
      }
      list.push(item);
    }
  };
  return list;
};

/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/getUrl.js":
/*!********************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/getUrl.js ***!
  \********************************************************/
/***/ ((module) => {

"use strict";


module.exports = function (url, options) {
  if (!options) {
    options = {};
  }
  if (!url) {
    return url;
  }
  url = String(url.__esModule ? url.default : url);

  // If url is already wrapped in quotes, remove them
  if (/^['"].*['"]$/.test(url)) {
    url = url.slice(1, -1);
  }
  if (options.hash) {
    url += options.hash;
  }

  // Should url be wrapped?
  // See https://drafts.csswg.org/css-values-3/#urls
  if (/["'() \t\n]|(%20)/.test(url) || options.needQuotes) {
    return "\"".concat(url.replace(/"/g, '\\"').replace(/\n/g, "\\n"), "\"");
  }
  return url;
};

/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/sourceMaps.js":
/*!************************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/sourceMaps.js ***!
  \************************************************************/
/***/ ((module) => {

"use strict";


module.exports = function (item) {
  var content = item[1];
  var cssMapping = item[3];
  if (!cssMapping) {
    return content;
  }
  if (typeof btoa === "function") {
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(cssMapping))));
    var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
    var sourceMapping = "/*# ".concat(data, " */");
    return [content].concat([sourceMapping]).join("\n");
  }
  return [content].join("\n");
};

/***/ }),

/***/ "./src/menu.csv":
/*!**********************!*\
  !*** ./src/menu.csv ***!
  \**********************/
/***/ ((module) => {

module.exports = [["Name","HP restored","Rads","Weight","Value"],["Angler Meat","35","10","0.5","20"],["Baked bloatfly","40","0","0.5","15"],["Deathclaw Egg omelette","115","0","0.1","80"],["Deathclaw Steak","185","0","1","130"],["Grilled Radroach","30","0","0.5","7"],["Happy Birthday Sweetroll","20","4","0","0"],["Iguana on a stick","40","0","0.1","33"],["Mirelurk cake","140","0","0.1","35"],["Mole rat chunks","50","0","0.5","8"],["Radscoprian steak","150","0","1","65"],["Noodle cup","20","0","0.5","10"]]

/***/ }),

/***/ "./node_modules/electron-to-chromium/versions.js":
/*!*******************************************************!*\
  !*** ./node_modules/electron-to-chromium/versions.js ***!
  \*******************************************************/
/***/ ((module) => {

module.exports = {
	"0.20": "39",
	"0.21": "41",
	"0.22": "41",
	"0.23": "41",
	"0.24": "41",
	"0.25": "42",
	"0.26": "42",
	"0.27": "43",
	"0.28": "43",
	"0.29": "43",
	"0.30": "44",
	"0.31": "45",
	"0.32": "45",
	"0.33": "45",
	"0.34": "45",
	"0.35": "45",
	"0.36": "47",
	"0.37": "49",
	"1.0": "49",
	"1.1": "50",
	"1.2": "51",
	"1.3": "52",
	"1.4": "53",
	"1.5": "54",
	"1.6": "56",
	"1.7": "58",
	"1.8": "59",
	"2.0": "61",
	"2.1": "61",
	"3.0": "66",
	"3.1": "66",
	"4.0": "69",
	"4.1": "69",
	"4.2": "69",
	"5.0": "73",
	"6.0": "76",
	"6.1": "76",
	"7.0": "78",
	"7.1": "78",
	"7.2": "78",
	"7.3": "78",
	"8.0": "80",
	"8.1": "80",
	"8.2": "80",
	"8.3": "80",
	"8.4": "80",
	"8.5": "80",
	"9.0": "83",
	"9.1": "83",
	"9.2": "83",
	"9.3": "83",
	"9.4": "83",
	"10.0": "85",
	"10.1": "85",
	"10.2": "85",
	"10.3": "85",
	"10.4": "85",
	"11.0": "87",
	"11.1": "87",
	"11.2": "87",
	"11.3": "87",
	"11.4": "87",
	"11.5": "87",
	"12.0": "89",
	"12.1": "89",
	"12.2": "89",
	"13.0": "91",
	"13.1": "91",
	"13.2": "91",
	"13.3": "91",
	"13.4": "91",
	"13.5": "91",
	"13.6": "91",
	"14.0": "93",
	"14.1": "93",
	"14.2": "93",
	"15.0": "94",
	"15.1": "94",
	"15.2": "94",
	"15.3": "94",
	"15.4": "94",
	"15.5": "94",
	"16.0": "96",
	"16.1": "96",
	"16.2": "96",
	"17.0": "98",
	"17.1": "98",
	"17.2": "98",
	"17.3": "98",
	"17.4": "98",
	"18.0": "100",
	"18.1": "100",
	"18.2": "100",
	"18.3": "100",
	"19.0": "102",
	"19.1": "102",
	"20.0": "104",
	"20.1": "104",
	"20.2": "104",
	"20.3": "104",
	"21.0": "106",
	"21.1": "106",
	"22.0": "108"
};

/***/ }),

/***/ "./node_modules/function-bind/implementation.js":
/*!******************************************************!*\
  !*** ./node_modules/function-bind/implementation.js ***!
  \******************************************************/
/***/ ((module) => {

"use strict";


/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};


/***/ }),

/***/ "./node_modules/function-bind/index.js":
/*!*********************************************!*\
  !*** ./node_modules/function-bind/index.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var implementation = __webpack_require__(/*! ./implementation */ "./node_modules/function-bind/implementation.js");

module.exports = Function.prototype.bind || implementation;


/***/ }),

/***/ "./node_modules/get-intrinsic/index.js":
/*!*********************************************!*\
  !*** ./node_modules/get-intrinsic/index.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var undefined;

var $SyntaxError = SyntaxError;
var $Function = Function;
var $TypeError = TypeError;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD = Object.getOwnPropertyDescriptor;
if ($gOPD) {
	try {
		$gOPD({}, '');
	} catch (e) {
		$gOPD = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = __webpack_require__(/*! has-symbols */ "./node_modules/has-symbols/index.js")();

var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols ? getProto([][Symbol.iterator]()) : undefined,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined : BigInt,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': RangeError,
	'%ReferenceError%': ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols ? getProto(''[Symbol.iterator]()) : undefined,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%URIError%': URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet
};

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen) {
			value = getProto(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = __webpack_require__(/*! function-bind */ "./node_modules/function-bind/index.js");
var hasOwn = __webpack_require__(/*! has */ "./node_modules/has/src/index.js");
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);
var $exec = bind.call(Function.call, RegExp.prototype.exec);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	if ($exec(/^%?[^%]*%?$/, name) === null) {
		throw new $SyntaxError('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
	}
	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined;
			}
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};


/***/ }),

/***/ "./node_modules/has-symbols/index.js":
/*!*******************************************!*\
  !*** ./node_modules/has-symbols/index.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = __webpack_require__(/*! ./shams */ "./node_modules/has-symbols/shams.js");

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};


/***/ }),

/***/ "./node_modules/has-symbols/shams.js":
/*!*******************************************!*\
  !*** ./node_modules/has-symbols/shams.js ***!
  \*******************************************/
/***/ ((module) => {

"use strict";


/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};


/***/ }),

/***/ "./node_modules/has/src/index.js":
/*!***************************************!*\
  !*** ./node_modules/has/src/index.js ***!
  \***************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var bind = __webpack_require__(/*! function-bind */ "./node_modules/function-bind/index.js");

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);


/***/ }),

/***/ "./node_modules/internal-slot/index.js":
/*!*********************************************!*\
  !*** ./node_modules/internal-slot/index.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(/*! get-intrinsic */ "./node_modules/get-intrinsic/index.js");
var has = __webpack_require__(/*! has */ "./node_modules/has/src/index.js");
var channel = __webpack_require__(/*! side-channel */ "./node_modules/side-channel/index.js")();

var $TypeError = GetIntrinsic('%TypeError%');

var SLOT = {
	assert: function (O, slot) {
		if (!O || (typeof O !== 'object' && typeof O !== 'function')) {
			throw new $TypeError('`O` is not an object');
		}
		if (typeof slot !== 'string') {
			throw new $TypeError('`slot` must be a string');
		}
		channel.assert(O);
		if (!SLOT.has(O, slot)) {
			throw new $TypeError('`slot` is not present on `O`');
		}
	},
	get: function (O, slot) {
		if (!O || (typeof O !== 'object' && typeof O !== 'function')) {
			throw new $TypeError('`O` is not an object');
		}
		if (typeof slot !== 'string') {
			throw new $TypeError('`slot` must be a string');
		}
		var slots = channel.get(O);
		return slots && slots['$' + slot];
	},
	has: function (O, slot) {
		if (!O || (typeof O !== 'object' && typeof O !== 'function')) {
			throw new $TypeError('`O` is not an object');
		}
		if (typeof slot !== 'string') {
			throw new $TypeError('`slot` must be a string');
		}
		var slots = channel.get(O);
		return !!slots && has(slots, '$' + slot);
	},
	set: function (O, slot, V) {
		if (!O || (typeof O !== 'object' && typeof O !== 'function')) {
			throw new $TypeError('`O` is not an object');
		}
		if (typeof slot !== 'string') {
			throw new $TypeError('`slot` must be a string');
		}
		var slots = channel.get(O);
		if (!slots) {
			slots = {};
			channel.set(O, slots);
		}
		slots['$' + slot] = V;
	}
};

if (Object.freeze) {
	Object.freeze(SLOT);
}

module.exports = SLOT;


/***/ }),

/***/ "./node_modules/object-inspect/index.js":
/*!**********************************************!*\
  !*** ./node_modules/object-inspect/index.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var hasMap = typeof Map === 'function' && Map.prototype;
var mapSizeDescriptor = Object.getOwnPropertyDescriptor && hasMap ? Object.getOwnPropertyDescriptor(Map.prototype, 'size') : null;
var mapSize = hasMap && mapSizeDescriptor && typeof mapSizeDescriptor.get === 'function' ? mapSizeDescriptor.get : null;
var mapForEach = hasMap && Map.prototype.forEach;
var hasSet = typeof Set === 'function' && Set.prototype;
var setSizeDescriptor = Object.getOwnPropertyDescriptor && hasSet ? Object.getOwnPropertyDescriptor(Set.prototype, 'size') : null;
var setSize = hasSet && setSizeDescriptor && typeof setSizeDescriptor.get === 'function' ? setSizeDescriptor.get : null;
var setForEach = hasSet && Set.prototype.forEach;
var hasWeakMap = typeof WeakMap === 'function' && WeakMap.prototype;
var weakMapHas = hasWeakMap ? WeakMap.prototype.has : null;
var hasWeakSet = typeof WeakSet === 'function' && WeakSet.prototype;
var weakSetHas = hasWeakSet ? WeakSet.prototype.has : null;
var hasWeakRef = typeof WeakRef === 'function' && WeakRef.prototype;
var weakRefDeref = hasWeakRef ? WeakRef.prototype.deref : null;
var booleanValueOf = Boolean.prototype.valueOf;
var objectToString = Object.prototype.toString;
var functionToString = Function.prototype.toString;
var $match = String.prototype.match;
var $slice = String.prototype.slice;
var $replace = String.prototype.replace;
var $toUpperCase = String.prototype.toUpperCase;
var $toLowerCase = String.prototype.toLowerCase;
var $test = RegExp.prototype.test;
var $concat = Array.prototype.concat;
var $join = Array.prototype.join;
var $arrSlice = Array.prototype.slice;
var $floor = Math.floor;
var bigIntValueOf = typeof BigInt === 'function' ? BigInt.prototype.valueOf : null;
var gOPS = Object.getOwnPropertySymbols;
var symToString = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ? Symbol.prototype.toString : null;
var hasShammedSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'object';
// ie, `has-tostringtag/shams
var toStringTag = typeof Symbol === 'function' && Symbol.toStringTag && (typeof Symbol.toStringTag === hasShammedSymbols ? 'object' : 'symbol')
    ? Symbol.toStringTag
    : null;
var isEnumerable = Object.prototype.propertyIsEnumerable;

var gPO = (typeof Reflect === 'function' ? Reflect.getPrototypeOf : Object.getPrototypeOf) || (
    [].__proto__ === Array.prototype // eslint-disable-line no-proto
        ? function (O) {
            return O.__proto__; // eslint-disable-line no-proto
        }
        : null
);

function addNumericSeparator(num, str) {
    if (
        num === Infinity
        || num === -Infinity
        || num !== num
        || (num && num > -1000 && num < 1000)
        || $test.call(/e/, str)
    ) {
        return str;
    }
    var sepRegex = /[0-9](?=(?:[0-9]{3})+(?![0-9]))/g;
    if (typeof num === 'number') {
        var int = num < 0 ? -$floor(-num) : $floor(num); // trunc(num)
        if (int !== num) {
            var intStr = String(int);
            var dec = $slice.call(str, intStr.length + 1);
            return $replace.call(intStr, sepRegex, '$&_') + '.' + $replace.call($replace.call(dec, /([0-9]{3})/g, '$&_'), /_$/, '');
        }
    }
    return $replace.call(str, sepRegex, '$&_');
}

var utilInspect = __webpack_require__(/*! ./util.inspect */ "?4f7e");
var inspectCustom = utilInspect.custom;
var inspectSymbol = isSymbol(inspectCustom) ? inspectCustom : null;

module.exports = function inspect_(obj, options, depth, seen) {
    var opts = options || {};

    if (has(opts, 'quoteStyle') && (opts.quoteStyle !== 'single' && opts.quoteStyle !== 'double')) {
        throw new TypeError('option "quoteStyle" must be "single" or "double"');
    }
    if (
        has(opts, 'maxStringLength') && (typeof opts.maxStringLength === 'number'
            ? opts.maxStringLength < 0 && opts.maxStringLength !== Infinity
            : opts.maxStringLength !== null
        )
    ) {
        throw new TypeError('option "maxStringLength", if provided, must be a positive integer, Infinity, or `null`');
    }
    var customInspect = has(opts, 'customInspect') ? opts.customInspect : true;
    if (typeof customInspect !== 'boolean' && customInspect !== 'symbol') {
        throw new TypeError('option "customInspect", if provided, must be `true`, `false`, or `\'symbol\'`');
    }

    if (
        has(opts, 'indent')
        && opts.indent !== null
        && opts.indent !== '\t'
        && !(parseInt(opts.indent, 10) === opts.indent && opts.indent > 0)
    ) {
        throw new TypeError('option "indent" must be "\\t", an integer > 0, or `null`');
    }
    if (has(opts, 'numericSeparator') && typeof opts.numericSeparator !== 'boolean') {
        throw new TypeError('option "numericSeparator", if provided, must be `true` or `false`');
    }
    var numericSeparator = opts.numericSeparator;

    if (typeof obj === 'undefined') {
        return 'undefined';
    }
    if (obj === null) {
        return 'null';
    }
    if (typeof obj === 'boolean') {
        return obj ? 'true' : 'false';
    }

    if (typeof obj === 'string') {
        return inspectString(obj, opts);
    }
    if (typeof obj === 'number') {
        if (obj === 0) {
            return Infinity / obj > 0 ? '0' : '-0';
        }
        var str = String(obj);
        return numericSeparator ? addNumericSeparator(obj, str) : str;
    }
    if (typeof obj === 'bigint') {
        var bigIntStr = String(obj) + 'n';
        return numericSeparator ? addNumericSeparator(obj, bigIntStr) : bigIntStr;
    }

    var maxDepth = typeof opts.depth === 'undefined' ? 5 : opts.depth;
    if (typeof depth === 'undefined') { depth = 0; }
    if (depth >= maxDepth && maxDepth > 0 && typeof obj === 'object') {
        return isArray(obj) ? '[Array]' : '[Object]';
    }

    var indent = getIndent(opts, depth);

    if (typeof seen === 'undefined') {
        seen = [];
    } else if (indexOf(seen, obj) >= 0) {
        return '[Circular]';
    }

    function inspect(value, from, noIndent) {
        if (from) {
            seen = $arrSlice.call(seen);
            seen.push(from);
        }
        if (noIndent) {
            var newOpts = {
                depth: opts.depth
            };
            if (has(opts, 'quoteStyle')) {
                newOpts.quoteStyle = opts.quoteStyle;
            }
            return inspect_(value, newOpts, depth + 1, seen);
        }
        return inspect_(value, opts, depth + 1, seen);
    }

    if (typeof obj === 'function' && !isRegExp(obj)) { // in older engines, regexes are callable
        var name = nameOf(obj);
        var keys = arrObjKeys(obj, inspect);
        return '[Function' + (name ? ': ' + name : ' (anonymous)') + ']' + (keys.length > 0 ? ' { ' + $join.call(keys, ', ') + ' }' : '');
    }
    if (isSymbol(obj)) {
        var symString = hasShammedSymbols ? $replace.call(String(obj), /^(Symbol\(.*\))_[^)]*$/, '$1') : symToString.call(obj);
        return typeof obj === 'object' && !hasShammedSymbols ? markBoxed(symString) : symString;
    }
    if (isElement(obj)) {
        var s = '<' + $toLowerCase.call(String(obj.nodeName));
        var attrs = obj.attributes || [];
        for (var i = 0; i < attrs.length; i++) {
            s += ' ' + attrs[i].name + '=' + wrapQuotes(quote(attrs[i].value), 'double', opts);
        }
        s += '>';
        if (obj.childNodes && obj.childNodes.length) { s += '...'; }
        s += '</' + $toLowerCase.call(String(obj.nodeName)) + '>';
        return s;
    }
    if (isArray(obj)) {
        if (obj.length === 0) { return '[]'; }
        var xs = arrObjKeys(obj, inspect);
        if (indent && !singleLineValues(xs)) {
            return '[' + indentedJoin(xs, indent) + ']';
        }
        return '[ ' + $join.call(xs, ', ') + ' ]';
    }
    if (isError(obj)) {
        var parts = arrObjKeys(obj, inspect);
        if (!('cause' in Error.prototype) && 'cause' in obj && !isEnumerable.call(obj, 'cause')) {
            return '{ [' + String(obj) + '] ' + $join.call($concat.call('[cause]: ' + inspect(obj.cause), parts), ', ') + ' }';
        }
        if (parts.length === 0) { return '[' + String(obj) + ']'; }
        return '{ [' + String(obj) + '] ' + $join.call(parts, ', ') + ' }';
    }
    if (typeof obj === 'object' && customInspect) {
        if (inspectSymbol && typeof obj[inspectSymbol] === 'function' && utilInspect) {
            return utilInspect(obj, { depth: maxDepth - depth });
        } else if (customInspect !== 'symbol' && typeof obj.inspect === 'function') {
            return obj.inspect();
        }
    }
    if (isMap(obj)) {
        var mapParts = [];
        mapForEach.call(obj, function (value, key) {
            mapParts.push(inspect(key, obj, true) + ' => ' + inspect(value, obj));
        });
        return collectionOf('Map', mapSize.call(obj), mapParts, indent);
    }
    if (isSet(obj)) {
        var setParts = [];
        setForEach.call(obj, function (value) {
            setParts.push(inspect(value, obj));
        });
        return collectionOf('Set', setSize.call(obj), setParts, indent);
    }
    if (isWeakMap(obj)) {
        return weakCollectionOf('WeakMap');
    }
    if (isWeakSet(obj)) {
        return weakCollectionOf('WeakSet');
    }
    if (isWeakRef(obj)) {
        return weakCollectionOf('WeakRef');
    }
    if (isNumber(obj)) {
        return markBoxed(inspect(Number(obj)));
    }
    if (isBigInt(obj)) {
        return markBoxed(inspect(bigIntValueOf.call(obj)));
    }
    if (isBoolean(obj)) {
        return markBoxed(booleanValueOf.call(obj));
    }
    if (isString(obj)) {
        return markBoxed(inspect(String(obj)));
    }
    if (!isDate(obj) && !isRegExp(obj)) {
        var ys = arrObjKeys(obj, inspect);
        var isPlainObject = gPO ? gPO(obj) === Object.prototype : obj instanceof Object || obj.constructor === Object;
        var protoTag = obj instanceof Object ? '' : 'null prototype';
        var stringTag = !isPlainObject && toStringTag && Object(obj) === obj && toStringTag in obj ? $slice.call(toStr(obj), 8, -1) : protoTag ? 'Object' : '';
        var constructorTag = isPlainObject || typeof obj.constructor !== 'function' ? '' : obj.constructor.name ? obj.constructor.name + ' ' : '';
        var tag = constructorTag + (stringTag || protoTag ? '[' + $join.call($concat.call([], stringTag || [], protoTag || []), ': ') + '] ' : '');
        if (ys.length === 0) { return tag + '{}'; }
        if (indent) {
            return tag + '{' + indentedJoin(ys, indent) + '}';
        }
        return tag + '{ ' + $join.call(ys, ', ') + ' }';
    }
    return String(obj);
};

function wrapQuotes(s, defaultStyle, opts) {
    var quoteChar = (opts.quoteStyle || defaultStyle) === 'double' ? '"' : "'";
    return quoteChar + s + quoteChar;
}

function quote(s) {
    return $replace.call(String(s), /"/g, '&quot;');
}

function isArray(obj) { return toStr(obj) === '[object Array]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isDate(obj) { return toStr(obj) === '[object Date]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isRegExp(obj) { return toStr(obj) === '[object RegExp]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isError(obj) { return toStr(obj) === '[object Error]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isString(obj) { return toStr(obj) === '[object String]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isNumber(obj) { return toStr(obj) === '[object Number]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isBoolean(obj) { return toStr(obj) === '[object Boolean]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }

// Symbol and BigInt do have Symbol.toStringTag by spec, so that can't be used to eliminate false positives
function isSymbol(obj) {
    if (hasShammedSymbols) {
        return obj && typeof obj === 'object' && obj instanceof Symbol;
    }
    if (typeof obj === 'symbol') {
        return true;
    }
    if (!obj || typeof obj !== 'object' || !symToString) {
        return false;
    }
    try {
        symToString.call(obj);
        return true;
    } catch (e) {}
    return false;
}

function isBigInt(obj) {
    if (!obj || typeof obj !== 'object' || !bigIntValueOf) {
        return false;
    }
    try {
        bigIntValueOf.call(obj);
        return true;
    } catch (e) {}
    return false;
}

var hasOwn = Object.prototype.hasOwnProperty || function (key) { return key in this; };
function has(obj, key) {
    return hasOwn.call(obj, key);
}

function toStr(obj) {
    return objectToString.call(obj);
}

function nameOf(f) {
    if (f.name) { return f.name; }
    var m = $match.call(functionToString.call(f), /^function\s*([\w$]+)/);
    if (m) { return m[1]; }
    return null;
}

function indexOf(xs, x) {
    if (xs.indexOf) { return xs.indexOf(x); }
    for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) { return i; }
    }
    return -1;
}

function isMap(x) {
    if (!mapSize || !x || typeof x !== 'object') {
        return false;
    }
    try {
        mapSize.call(x);
        try {
            setSize.call(x);
        } catch (s) {
            return true;
        }
        return x instanceof Map; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakMap(x) {
    if (!weakMapHas || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakMapHas.call(x, weakMapHas);
        try {
            weakSetHas.call(x, weakSetHas);
        } catch (s) {
            return true;
        }
        return x instanceof WeakMap; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakRef(x) {
    if (!weakRefDeref || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakRefDeref.call(x);
        return true;
    } catch (e) {}
    return false;
}

function isSet(x) {
    if (!setSize || !x || typeof x !== 'object') {
        return false;
    }
    try {
        setSize.call(x);
        try {
            mapSize.call(x);
        } catch (m) {
            return true;
        }
        return x instanceof Set; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakSet(x) {
    if (!weakSetHas || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakSetHas.call(x, weakSetHas);
        try {
            weakMapHas.call(x, weakMapHas);
        } catch (s) {
            return true;
        }
        return x instanceof WeakSet; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isElement(x) {
    if (!x || typeof x !== 'object') { return false; }
    if (typeof HTMLElement !== 'undefined' && x instanceof HTMLElement) {
        return true;
    }
    return typeof x.nodeName === 'string' && typeof x.getAttribute === 'function';
}

function inspectString(str, opts) {
    if (str.length > opts.maxStringLength) {
        var remaining = str.length - opts.maxStringLength;
        var trailer = '... ' + remaining + ' more character' + (remaining > 1 ? 's' : '');
        return inspectString($slice.call(str, 0, opts.maxStringLength), opts) + trailer;
    }
    // eslint-disable-next-line no-control-regex
    var s = $replace.call($replace.call(str, /(['\\])/g, '\\$1'), /[\x00-\x1f]/g, lowbyte);
    return wrapQuotes(s, 'single', opts);
}

function lowbyte(c) {
    var n = c.charCodeAt(0);
    var x = {
        8: 'b',
        9: 't',
        10: 'n',
        12: 'f',
        13: 'r'
    }[n];
    if (x) { return '\\' + x; }
    return '\\x' + (n < 0x10 ? '0' : '') + $toUpperCase.call(n.toString(16));
}

function markBoxed(str) {
    return 'Object(' + str + ')';
}

function weakCollectionOf(type) {
    return type + ' { ? }';
}

function collectionOf(type, size, entries, indent) {
    var joinedEntries = indent ? indentedJoin(entries, indent) : $join.call(entries, ', ');
    return type + ' (' + size + ') {' + joinedEntries + '}';
}

function singleLineValues(xs) {
    for (var i = 0; i < xs.length; i++) {
        if (indexOf(xs[i], '\n') >= 0) {
            return false;
        }
    }
    return true;
}

function getIndent(opts, depth) {
    var baseIndent;
    if (opts.indent === '\t') {
        baseIndent = '\t';
    } else if (typeof opts.indent === 'number' && opts.indent > 0) {
        baseIndent = $join.call(Array(opts.indent + 1), ' ');
    } else {
        return null;
    }
    return {
        base: baseIndent,
        prev: $join.call(Array(depth + 1), baseIndent)
    };
}

function indentedJoin(xs, indent) {
    if (xs.length === 0) { return ''; }
    var lineJoiner = '\n' + indent.prev + indent.base;
    return lineJoiner + $join.call(xs, ',' + lineJoiner) + '\n' + indent.prev;
}

function arrObjKeys(obj, inspect) {
    var isArr = isArray(obj);
    var xs = [];
    if (isArr) {
        xs.length = obj.length;
        for (var i = 0; i < obj.length; i++) {
            xs[i] = has(obj, i) ? inspect(obj[i], obj) : '';
        }
    }
    var syms = typeof gOPS === 'function' ? gOPS(obj) : [];
    var symMap;
    if (hasShammedSymbols) {
        symMap = {};
        for (var k = 0; k < syms.length; k++) {
            symMap['$' + syms[k]] = syms[k];
        }
    }

    for (var key in obj) { // eslint-disable-line no-restricted-syntax
        if (!has(obj, key)) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
        if (isArr && String(Number(key)) === key && key < obj.length) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
        if (hasShammedSymbols && symMap['$' + key] instanceof Symbol) {
            // this is to prevent shammed Symbols, which are stored as strings, from being included in the string key section
            continue; // eslint-disable-line no-restricted-syntax, no-continue
        } else if ($test.call(/[^\w$]/, key)) {
            xs.push(inspect(key, obj) + ': ' + inspect(obj[key], obj));
        } else {
            xs.push(key + ': ' + inspect(obj[key], obj));
        }
    }
    if (typeof gOPS === 'function') {
        for (var j = 0; j < syms.length; j++) {
            if (isEnumerable.call(obj, syms[j])) {
                xs.push('[' + inspect(syms[j]) + ']: ' + inspect(obj[syms[j]], obj));
            }
        }
    }
    return xs;
}


/***/ }),

/***/ "./src/about.txt":
/*!***********************!*\
  !*** ./src/about.txt ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ("\"Noodles. We all eat them. We all love them. And Diamond City's Power Noodles has supplied this sustenance for the past fifteen years. From the stilted mechanical cadence of Takahashi's programmed Japanese, to the fragrant steam that wafts from each bowl, to the scalding tang of each delicious mouthful - the ordering and eating of noodles is but one of many shared human experiences. Or is it?\" \n-The Synthetic Truth\n\nThis structure directly opposite the city's main entrance in the center of the market is a small outdoor restaurant. Counters encircle a central pillar, with Takahashi behind one of them. A cooking station sits nearby. The pillar features a functional power reactor, supplying the surrounding buildings with electricity.\n\nApproximately 43 years before Power Noodles was established, a bar that occupied the same space in the market was the scene of the Broken Mask incident. This violent event resulted in the death of ten individuals at the hand of a malfunctioning Institute synth in May 2229.\n\nUpon meeting Takahashi for the first time and hearing his signature question (\"Nan-ni shimasko-ka?\"), a nearby resident will say \"Just say yes, it's all he understands.\"\n\nCompanions will try to talk to Takahashi when arriving in the Diamond City market for the first time.\n\nMacCready enjoys Takahashi's noodles immensely. If he is the Sole Survivor's current companion, he accepts a bowl from the robotic chef, and when finished, enthusiastically asks for more.\n\nIf visiting Diamond City on Halloween, Power Noodles is decorated with red skull cutouts on the counter and \"Happy Halloween\" banners stretched across the canopy.\n\nIf visiting Diamond City on Christmas, Power Noodles is decorated with Christmas trees and lights connected to surrounding buildings.\n\nThe Far Harbor note Taste test found in the Nucleus makes a reference to Power Noodles.\n");

/***/ }),

/***/ "./node_modules/side-channel/index.js":
/*!********************************************!*\
  !*** ./node_modules/side-channel/index.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(/*! get-intrinsic */ "./node_modules/get-intrinsic/index.js");
var callBound = __webpack_require__(/*! call-bind/callBound */ "./node_modules/call-bind/callBound.js");
var inspect = __webpack_require__(/*! object-inspect */ "./node_modules/object-inspect/index.js");

var $TypeError = GetIntrinsic('%TypeError%');
var $WeakMap = GetIntrinsic('%WeakMap%', true);
var $Map = GetIntrinsic('%Map%', true);

var $weakMapGet = callBound('WeakMap.prototype.get', true);
var $weakMapSet = callBound('WeakMap.prototype.set', true);
var $weakMapHas = callBound('WeakMap.prototype.has', true);
var $mapGet = callBound('Map.prototype.get', true);
var $mapSet = callBound('Map.prototype.set', true);
var $mapHas = callBound('Map.prototype.has', true);

/*
 * This function traverses the list returning the node corresponding to the
 * given key.
 *
 * That node is also moved to the head of the list, so that if it's accessed
 * again we don't need to traverse the whole list. By doing so, all the recently
 * used nodes can be accessed relatively quickly.
 */
var listGetNode = function (list, key) { // eslint-disable-line consistent-return
	for (var prev = list, curr; (curr = prev.next) !== null; prev = curr) {
		if (curr.key === key) {
			prev.next = curr.next;
			curr.next = list.next;
			list.next = curr; // eslint-disable-line no-param-reassign
			return curr;
		}
	}
};

var listGet = function (objects, key) {
	var node = listGetNode(objects, key);
	return node && node.value;
};
var listSet = function (objects, key, value) {
	var node = listGetNode(objects, key);
	if (node) {
		node.value = value;
	} else {
		// Prepend the new node to the beginning of the list
		objects.next = { // eslint-disable-line no-param-reassign
			key: key,
			next: objects.next,
			value: value
		};
	}
};
var listHas = function (objects, key) {
	return !!listGetNode(objects, key);
};

module.exports = function getSideChannel() {
	var $wm;
	var $m;
	var $o;
	var channel = {
		assert: function (key) {
			if (!channel.has(key)) {
				throw new $TypeError('Side channel does not contain ' + inspect(key));
			}
		},
		get: function (key) { // eslint-disable-line consistent-return
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapGet($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapGet($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					return listGet($o, key);
				}
			}
		},
		has: function (key) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapHas($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapHas($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					return listHas($o, key);
				}
			}
			return false;
		},
		set: function (key, value) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if (!$wm) {
					$wm = new $WeakMap();
				}
				$weakMapSet($wm, key, value);
			} else if ($Map) {
				if (!$m) {
					$m = new $Map();
				}
				$mapSet($m, key, value);
			} else {
				if (!$o) {
					/*
					 * Initialize the linked list as an empty node, so that we don't have
					 * to special-case handling of the first node: we can always refer to
					 * it as (previous node).next, instead of something like (list).head
					 */
					$o = { key: {}, next: null };
				}
				listSet($o, key, value);
			}
		}
	};
	return channel;
};


/***/ }),

/***/ "./src/global.css":
/*!************************!*\
  !*** ./src/global.css ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_global_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../node_modules/css-loader/dist/cjs.js!./global.css */ "./node_modules/css-loader/dist/cjs.js!./src/global.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_global_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_global_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_global_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_global_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./src/initialPage.css":
/*!*****************************!*\
  !*** ./src/initialPage.css ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_initialPage_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../node_modules/css-loader/dist/cjs.js!./initialPage.css */ "./node_modules/css-loader/dist/cjs.js!./src/initialPage.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_initialPage_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_initialPage_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_initialPage_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_initialPage_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./src/menu.css":
/*!**********************!*\
  !*** ./src/menu.css ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_menu_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../node_modules/css-loader/dist/cjs.js!./menu.css */ "./node_modules/css-loader/dist/cjs.js!./src/menu.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_menu_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_menu_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_menu_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_menu_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!****************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \****************************************************************************/
/***/ ((module) => {

"use strict";


var stylesInDOM = [];

function getIndexByIdentifier(identifier) {
  var result = -1;

  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }

  return result;
}

function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };

    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }

    identifiers.push(identifier);
  }

  return identifiers;
}

function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);

  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }

      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };

  return updater;
}

module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];

    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }

    var newLastIdentifiers = modulesToDom(newList, options);

    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];

      var _index = getIndexByIdentifier(_identifier);

      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();

        stylesInDOM.splice(_index, 1);
      }
    }

    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertBySelector.js":
/*!********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertBySelector.js ***!
  \********************************************************************/
/***/ ((module) => {

"use strict";


var memo = {};
/* istanbul ignore next  */

function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target); // Special case to return head of iframe instead of iframe itself

    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }

    memo[target] = styleTarget;
  }

  return memo[target];
}
/* istanbul ignore next  */


function insertBySelector(insert, style) {
  var target = getTarget(insert);

  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }

  target.appendChild(style);
}

module.exports = insertBySelector;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertStyleElement.js":
/*!**********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertStyleElement.js ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}

module.exports = insertStyleElement;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js ***!
  \**********************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;

  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}

module.exports = setAttributesWithoutAttributes;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleDomAPI.js":
/*!***************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleDomAPI.js ***!
  \***************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";

  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }

  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }

  var needLayer = typeof obj.layer !== "undefined";

  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }

  css += obj.css;

  if (needLayer) {
    css += "}";
  }

  if (obj.media) {
    css += "}";
  }

  if (obj.supports) {
    css += "}";
  }

  var sourceMap = obj.sourceMap;

  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  } // For old IE

  /* istanbul ignore if  */


  options.styleTagTransform(css, styleElement, options.options);
}

function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }

  styleElement.parentNode.removeChild(styleElement);
}
/* istanbul ignore next  */


function domAPI(options) {
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}

module.exports = domAPI;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleTagTransform.js":
/*!*********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleTagTransform.js ***!
  \*********************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }

    styleElement.appendChild(document.createTextNode(css));
  }
}

module.exports = styleTagTransform;

/***/ }),

/***/ "./src/footer.js":
/*!***********************!*\
  !*** ./src/footer.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ createFooter)
/* harmony export */ });
/* harmony import */ var _imgs_github_png__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./imgs/github.png */ "./src/imgs/github.png");
/* harmony import */ var _global_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./global.css */ "./src/global.css");



function createFooter(element) {
  const footer = document.createElement('footer');
  footer.classList.add('footer');
  footer.classList.add('glow');

  const icon = document.createElement('img');
  icon.src = _imgs_github_png__WEBPACK_IMPORTED_MODULE_0__;

  const author = document.createElement('h2');
  author.innerText = 'jortega2';

  footer.append(icon);
  footer.append(author);

  element.appendChild(footer);
}


/***/ }),

/***/ "./src/initialpage.js":
/*!****************************!*\
  !*** ./src/initialpage.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ initialPage)
/* harmony export */ });
/* harmony import */ var _initialPage_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./initialPage.css */ "./src/initialPage.css");
/* harmony import */ var _global_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./global.css */ "./src/global.css");
/* harmony import */ var _imgs_fallout_png__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./imgs/fallout.png */ "./src/imgs/fallout.png");
/* harmony import */ var _imgs_diamondcity_jpg__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./imgs/diamondcity.jpg */ "./src/imgs/diamondcity.jpg");
/* harmony import */ var _about_txt__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./about.txt */ "./src/about.txt");






function createHeader() {
  const header = document.createElement('div');
  header.classList.add('header');
  header.classList.add('glow');

  const titleBG = document.createElement('div');
  titleBG.classList.add('opaque');
  titleBG.textContent = 'Power Noodles';

  const nav = document.createElement('div');
  nav.classList.add('navBar');

  const fallout = document.createElement('img');
  fallout.src = _imgs_fallout_png__WEBPACK_IMPORTED_MODULE_2__;
  fallout.classList.add('titleImg');

  const button = document.createElement('button');
  button.classList.add('navButton');
  button.textContent = 'View the Menu';

  nav.appendChild(fallout);
  nav.appendChild(button);

  header.append(nav);
  header.append(titleBG);

  return header;
}

function createMap() {
  const map = document.createElement('img');
  map.src = _imgs_diamondcity_jpg__WEBPACK_IMPORTED_MODULE_3__;
  map.classList.add('map');
  map.classList.add('glow');

  return map;
}

function createHoursTable() {
  const element = document.createElement('table');

  const caption = document.createElement('caption');
  caption.textContent = 'OPENING HOURS';
  element.appendChild(caption);
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  for (let i = 0; i < 7; i += 1) {
    const day = document.createElement('tr');

    const label = document.createElement('th');
    label.innerText = days[i];

    const hours = document.createElement('td');
    hours.innerText = '8:00 a.m. - 10:00 p.m.';

    day.append(label);
    day.append(hours);
    element.append(day);
  }
  return element;
}

function createHours() {
  const storeHours = document.createElement('div');
  storeHours.classList.add('storeHours');
  storeHours.classList.add('glow');

  const hoursTable = createHoursTable();

  storeHours.append(hoursTable);

  return storeHours;
}

function createInformation() {
  const information = document.createElement('div');
  information.classList.add('information');
  information.classList.add('glow');

  const title = document.createElement('h2');
  title.innerText = 'From the Wiki';

  const info = document.createElement('p');
  info.innerText = _about_txt__WEBPACK_IMPORTED_MODULE_4__["default"];

  information.append(title);
  information.append(info);

  return information;
}

function createCredits() {
  const credits = document.createElement('div');
  credits.classList.add('glow');
  credits.classList.add('credits');

  const title = document.createElement('h2');
  title.innerText = 'Credits';

  const restaurantImage = document.createElement('a');
  restaurantImage.href = 'https://fallout.fandom.com/wiki/Power_Noodles?file=FO4_P_Noodles_TV.png';
  restaurantImage.innerText = 'Kdarrow for the main Power Noodles screenshot.';

  const logo = document.createElement('a');
  logo.href = 'https://www.pngfind.com/mpng/ohxJRi_allout-fallout-2-fallout-shelter-fallout-4-fallout/';
  logo.innerText = 'pngfind for the Fallout logo';

  const location = document.createElement('a');
  location.href = 'https://fallout-archive.fandom.com/wiki/Diamond_City_market';
  location.innerText = 'Fallout 4 fandom page for the location image used on the home page';

  const wikiInfo = document.createElement('a');
  wikiInfo.href = 'https://fallout.fandom.com/wiki/Power_Noodles';
  wikiInfo.innerText = 'Fallout 4 fandom page for their notes that were used in the information section';

  const consumables = document.createElement('a');
  consumables.href = 'https://fallout.fandom.com/wiki/Fallout_4_consumables';
  consumables.innerText = 'Fallout 4 fandom page for the food information used in the menu page';

  const bethesda = document.createElement('a');
  bethesda.href = 'https://fallout.bethesda.net/en/games/fallout-4';
  bethesda.innerText = 'Bethesda for creating Fallout 4';

  credits.appendChild(title);
  credits.appendChild(bethesda);
  credits.appendChild(restaurantImage);
  credits.appendChild(location);
  credits.appendChild(wikiInfo);
  credits.appendChild(consumables);
  credits.appendChild(logo);

  return credits;
}

function initialPage(element) {
  element.append(createHeader());
  element.append(createMap());
  element.append(createHours());
  element.append(createInformation());
  element.append(createCredits());
}


/***/ }),

/***/ "./src/menu.js":
/*!*********************!*\
  !*** ./src/menu.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ createMenuPage)
/* harmony export */ });
/* harmony import */ var _global_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./global.css */ "./src/global.css");
/* harmony import */ var _menu_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./menu.css */ "./src/menu.css");
/* harmony import */ var browserslist__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! browserslist */ "./node_modules/browserslist/index.js");
/* harmony import */ var browserslist__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(browserslist__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _menu_csv__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./menu.csv */ "./src/menu.csv");
/* harmony import */ var _menu_csv__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_menu_csv__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _imgs_fallout_png__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./imgs/fallout.png */ "./src/imgs/fallout.png");






function addMenu(element) {
  // table caption
  const caption = document.createElement('caption');
  caption.innerText = 'Our Menu';

  element.appendChild(caption);
  // create rows of table
  for (let i = 0; i < (_menu_csv__WEBPACK_IMPORTED_MODULE_3___default().length); i += 1) {
    const row = document.createElement('tr');
    element.appendChild(row);
  }

  const { children } = element;

  // create header row
  for (let i = 0; i < (_menu_csv__WEBPACK_IMPORTED_MODULE_3___default()[0].length); i += 1) {
    const tableHeader = document.createElement('th');
    tableHeader.innerText = (_menu_csv__WEBPACK_IMPORTED_MODULE_3___default()[0])[i];

    children[1].append(tableHeader);
  }

  // create data cells
  for (let i = 1; i < (_menu_csv__WEBPACK_IMPORTED_MODULE_3___default().length); i += 1) {
    for (let j = 0; j < (_menu_csv__WEBPACK_IMPORTED_MODULE_3___default())[i].length; j += 1) {
      const dataCell = document.createElement('td');
      dataCell.innerText = (_menu_csv__WEBPACK_IMPORTED_MODULE_3___default())[i][j];
      children[i + 1].append(dataCell);
    }
  }
}

function createBody() {
  const menuContainer = document.createElement('div');
  menuContainer.classList.add('menuContainer');
  menuContainer.classList.add('glow');

  const nav = document.createElement('div');
  nav.classList.add('navBar');

  const fallout = document.createElement('img');
  fallout.src = _imgs_fallout_png__WEBPACK_IMPORTED_MODULE_4__;
  fallout.classList.add('titleImg');

  const button = document.createElement('button');
  button.classList.add('navButton');
  button.textContent = 'Return to Home';

  const menu = document.createElement('table');
  menu.classList.add('menu');
  addMenu(menu);

  nav.appendChild(fallout);
  nav.appendChild(button);

  menuContainer.append(nav);
  menuContainer.append(menu);

  return menuContainer;
}

function createMenuPage(element) {
  element.appendChild(createBody());
}


/***/ }),

/***/ "./src/imgs/diamondcity.jpg":
/*!**********************************!*\
  !*** ./src/imgs/diamondcity.jpg ***!
  \**********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "c33958543c42dc1cf835.jpg";

/***/ }),

/***/ "./src/imgs/fallout.png":
/*!******************************!*\
  !*** ./src/imgs/fallout.png ***!
  \******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "4aeb98fb30ddd7146e99.png";

/***/ }),

/***/ "./src/imgs/github.png":
/*!*****************************!*\
  !*** ./src/imgs/github.png ***!
  \*****************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "fb6263f28d98fb675616.png";

/***/ }),

/***/ "./src/imgs/noodlestv.png":
/*!********************************!*\
  !*** ./src/imgs/noodlestv.png ***!
  \********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "07c09504dd0d52c5b263.png";

/***/ }),

/***/ "?3465":
/*!**********************!*\
  !*** path (ignored) ***!
  \**********************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?4f7e":
/*!********************************!*\
  !*** ./util.inspect (ignored) ***!
  \********************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "./node_modules/es-module-lexer/dist/lexer.js":
/*!****************************************************!*\
  !*** ./node_modules/es-module-lexer/dist/lexer.js ***!
  \****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "init": () => (/* binding */ init),
/* harmony export */   "parse": () => (/* binding */ parse)
/* harmony export */ });
/* es-module-lexer 0.9.3 */
const A=1===new Uint8Array(new Uint16Array([1]).buffer)[0];function parse(E,I="@"){if(!B)return init.then(()=>parse(E));const g=E.length+1,D=(B.__heap_base.value||B.__heap_base)+4*g-B.memory.buffer.byteLength;D>0&&B.memory.grow(Math.ceil(D/65536));const w=B.sa(g-1);if((A?C:Q)(E,new Uint16Array(B.memory.buffer,w,g)),!B.parse())throw Object.assign(new Error(`Parse error ${I}:${E.slice(0,B.e()).split("\n").length}:${B.e()-E.lastIndexOf("\n",B.e()-1)}`),{idx:B.e()});const L=[],k=[];for(;B.ri();){const A=B.is(),Q=B.ie(),C=B.ai(),I=B.id(),g=B.ss(),D=B.se();let w;B.ip()&&(w=J(E.slice(-1===I?A-1:A,-1===I?Q+1:Q))),L.push({n:w,s:A,e:Q,ss:g,se:D,d:I,a:C})}for(;B.re();){const A=E.slice(B.es(),B.ee()),Q=A[0];k.push('"'===Q||"'"===Q?J(A):A)}function J(A){try{return(0,eval)(A)}catch(A){}}return[L,k,!!B.f()]}function Q(A,Q){const C=A.length;let B=0;for(;B<C;){const C=A.charCodeAt(B);Q[B++]=(255&C)<<8|C>>>8}}function C(A,Q){const C=A.length;let B=0;for(;B<C;)Q[B]=A.charCodeAt(B++)}let B;const init=WebAssembly.compile((E="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","undefined"!=typeof Buffer?Buffer.from(E,"base64"):Uint8Array.from(atob(E),A=>A.charCodeAt(0)))).then(WebAssembly.instantiate).then(({exports:A})=>{B=A});var E;

/***/ }),

/***/ "./node_modules/node-releases/data/processed/envs.json":
/*!*************************************************************!*\
  !*** ./node_modules/node-releases/data/processed/envs.json ***!
  \*************************************************************/
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('[{"name":"nodejs","version":"0.2.0","date":"2011-08-26","lts":false,"security":false},{"name":"nodejs","version":"0.3.0","date":"2011-08-26","lts":false,"security":false},{"name":"nodejs","version":"0.4.0","date":"2011-08-26","lts":false,"security":false},{"name":"nodejs","version":"0.5.0","date":"2011-08-26","lts":false,"security":false},{"name":"nodejs","version":"0.6.0","date":"2011-11-04","lts":false,"security":false},{"name":"nodejs","version":"0.7.0","date":"2012-01-17","lts":false,"security":false},{"name":"nodejs","version":"0.8.0","date":"2012-06-22","lts":false,"security":false},{"name":"nodejs","version":"0.9.0","date":"2012-07-20","lts":false,"security":false},{"name":"nodejs","version":"0.10.0","date":"2013-03-11","lts":false,"security":false},{"name":"nodejs","version":"0.11.0","date":"2013-03-28","lts":false,"security":false},{"name":"nodejs","version":"0.12.0","date":"2015-02-06","lts":false,"security":false},{"name":"nodejs","version":"4.0.0","date":"2015-09-08","lts":false,"security":false},{"name":"nodejs","version":"4.1.0","date":"2015-09-17","lts":false,"security":false},{"name":"nodejs","version":"4.2.0","date":"2015-10-12","lts":"Argon","security":false},{"name":"nodejs","version":"4.3.0","date":"2016-02-09","lts":"Argon","security":false},{"name":"nodejs","version":"4.4.0","date":"2016-03-08","lts":"Argon","security":false},{"name":"nodejs","version":"4.5.0","date":"2016-08-16","lts":"Argon","security":false},{"name":"nodejs","version":"4.6.0","date":"2016-09-27","lts":"Argon","security":true},{"name":"nodejs","version":"4.7.0","date":"2016-12-06","lts":"Argon","security":false},{"name":"nodejs","version":"4.8.0","date":"2017-02-21","lts":"Argon","security":false},{"name":"nodejs","version":"4.9.0","date":"2018-03-28","lts":"Argon","security":true},{"name":"nodejs","version":"5.0.0","date":"2015-10-29","lts":false,"security":false},{"name":"nodejs","version":"5.1.0","date":"2015-11-17","lts":false,"security":false},{"name":"nodejs","version":"5.2.0","date":"2015-12-09","lts":false,"security":false},{"name":"nodejs","version":"5.3.0","date":"2015-12-15","lts":false,"security":false},{"name":"nodejs","version":"5.4.0","date":"2016-01-06","lts":false,"security":false},{"name":"nodejs","version":"5.5.0","date":"2016-01-21","lts":false,"security":false},{"name":"nodejs","version":"5.6.0","date":"2016-02-09","lts":false,"security":false},{"name":"nodejs","version":"5.7.0","date":"2016-02-23","lts":false,"security":false},{"name":"nodejs","version":"5.8.0","date":"2016-03-09","lts":false,"security":false},{"name":"nodejs","version":"5.9.0","date":"2016-03-16","lts":false,"security":false},{"name":"nodejs","version":"5.10.0","date":"2016-04-01","lts":false,"security":false},{"name":"nodejs","version":"5.11.0","date":"2016-04-21","lts":false,"security":false},{"name":"nodejs","version":"5.12.0","date":"2016-06-23","lts":false,"security":false},{"name":"nodejs","version":"6.0.0","date":"2016-04-26","lts":false,"security":false},{"name":"nodejs","version":"6.1.0","date":"2016-05-05","lts":false,"security":false},{"name":"nodejs","version":"6.2.0","date":"2016-05-17","lts":false,"security":false},{"name":"nodejs","version":"6.3.0","date":"2016-07-06","lts":false,"security":false},{"name":"nodejs","version":"6.4.0","date":"2016-08-12","lts":false,"security":false},{"name":"nodejs","version":"6.5.0","date":"2016-08-26","lts":false,"security":false},{"name":"nodejs","version":"6.6.0","date":"2016-09-14","lts":false,"security":false},{"name":"nodejs","version":"6.7.0","date":"2016-09-27","lts":false,"security":true},{"name":"nodejs","version":"6.8.0","date":"2016-10-12","lts":false,"security":false},{"name":"nodejs","version":"6.9.0","date":"2016-10-18","lts":"Boron","security":false},{"name":"nodejs","version":"6.10.0","date":"2017-02-21","lts":"Boron","security":false},{"name":"nodejs","version":"6.11.0","date":"2017-06-06","lts":"Boron","security":false},{"name":"nodejs","version":"6.12.0","date":"2017-11-06","lts":"Boron","security":false},{"name":"nodejs","version":"6.13.0","date":"2018-02-10","lts":"Boron","security":false},{"name":"nodejs","version":"6.14.0","date":"2018-03-28","lts":"Boron","security":true},{"name":"nodejs","version":"6.15.0","date":"2018-11-27","lts":"Boron","security":true},{"name":"nodejs","version":"6.16.0","date":"2018-12-26","lts":"Boron","security":false},{"name":"nodejs","version":"6.17.0","date":"2019-02-28","lts":"Boron","security":true},{"name":"nodejs","version":"7.0.0","date":"2016-10-25","lts":false,"security":false},{"name":"nodejs","version":"7.1.0","date":"2016-11-08","lts":false,"security":false},{"name":"nodejs","version":"7.2.0","date":"2016-11-22","lts":false,"security":false},{"name":"nodejs","version":"7.3.0","date":"2016-12-20","lts":false,"security":false},{"name":"nodejs","version":"7.4.0","date":"2017-01-04","lts":false,"security":false},{"name":"nodejs","version":"7.5.0","date":"2017-01-31","lts":false,"security":false},{"name":"nodejs","version":"7.6.0","date":"2017-02-21","lts":false,"security":false},{"name":"nodejs","version":"7.7.0","date":"2017-02-28","lts":false,"security":false},{"name":"nodejs","version":"7.8.0","date":"2017-03-29","lts":false,"security":false},{"name":"nodejs","version":"7.9.0","date":"2017-04-11","lts":false,"security":false},{"name":"nodejs","version":"7.10.0","date":"2017-05-02","lts":false,"security":false},{"name":"nodejs","version":"8.0.0","date":"2017-05-30","lts":false,"security":false},{"name":"nodejs","version":"8.1.0","date":"2017-06-08","lts":false,"security":false},{"name":"nodejs","version":"8.2.0","date":"2017-07-19","lts":false,"security":false},{"name":"nodejs","version":"8.3.0","date":"2017-08-08","lts":false,"security":false},{"name":"nodejs","version":"8.4.0","date":"2017-08-15","lts":false,"security":false},{"name":"nodejs","version":"8.5.0","date":"2017-09-12","lts":false,"security":false},{"name":"nodejs","version":"8.6.0","date":"2017-09-26","lts":false,"security":false},{"name":"nodejs","version":"8.7.0","date":"2017-10-11","lts":false,"security":false},{"name":"nodejs","version":"8.8.0","date":"2017-10-24","lts":false,"security":false},{"name":"nodejs","version":"8.9.0","date":"2017-10-31","lts":"Carbon","security":false},{"name":"nodejs","version":"8.10.0","date":"2018-03-06","lts":"Carbon","security":false},{"name":"nodejs","version":"8.11.0","date":"2018-03-28","lts":"Carbon","security":true},{"name":"nodejs","version":"8.12.0","date":"2018-09-10","lts":"Carbon","security":false},{"name":"nodejs","version":"8.13.0","date":"2018-11-20","lts":"Carbon","security":false},{"name":"nodejs","version":"8.14.0","date":"2018-11-27","lts":"Carbon","security":true},{"name":"nodejs","version":"8.15.0","date":"2018-12-26","lts":"Carbon","security":false},{"name":"nodejs","version":"8.16.0","date":"2019-04-16","lts":"Carbon","security":false},{"name":"nodejs","version":"8.17.0","date":"2019-12-17","lts":"Carbon","security":true},{"name":"nodejs","version":"9.0.0","date":"2017-10-31","lts":false,"security":false},{"name":"nodejs","version":"9.1.0","date":"2017-11-07","lts":false,"security":false},{"name":"nodejs","version":"9.2.0","date":"2017-11-14","lts":false,"security":false},{"name":"nodejs","version":"9.3.0","date":"2017-12-12","lts":false,"security":false},{"name":"nodejs","version":"9.4.0","date":"2018-01-10","lts":false,"security":false},{"name":"nodejs","version":"9.5.0","date":"2018-01-31","lts":false,"security":false},{"name":"nodejs","version":"9.6.0","date":"2018-02-21","lts":false,"security":false},{"name":"nodejs","version":"9.7.0","date":"2018-03-01","lts":false,"security":false},{"name":"nodejs","version":"9.8.0","date":"2018-03-07","lts":false,"security":false},{"name":"nodejs","version":"9.9.0","date":"2018-03-21","lts":false,"security":false},{"name":"nodejs","version":"9.10.0","date":"2018-03-28","lts":false,"security":true},{"name":"nodejs","version":"9.11.0","date":"2018-04-04","lts":false,"security":false},{"name":"nodejs","version":"10.0.0","date":"2018-04-24","lts":false,"security":false},{"name":"nodejs","version":"10.1.0","date":"2018-05-08","lts":false,"security":false},{"name":"nodejs","version":"10.2.0","date":"2018-05-23","lts":false,"security":false},{"name":"nodejs","version":"10.3.0","date":"2018-05-29","lts":false,"security":false},{"name":"nodejs","version":"10.4.0","date":"2018-06-06","lts":false,"security":false},{"name":"nodejs","version":"10.5.0","date":"2018-06-20","lts":false,"security":false},{"name":"nodejs","version":"10.6.0","date":"2018-07-04","lts":false,"security":false},{"name":"nodejs","version":"10.7.0","date":"2018-07-18","lts":false,"security":false},{"name":"nodejs","version":"10.8.0","date":"2018-08-01","lts":false,"security":false},{"name":"nodejs","version":"10.9.0","date":"2018-08-15","lts":false,"security":false},{"name":"nodejs","version":"10.10.0","date":"2018-09-06","lts":false,"security":false},{"name":"nodejs","version":"10.11.0","date":"2018-09-19","lts":false,"security":false},{"name":"nodejs","version":"10.12.0","date":"2018-10-10","lts":false,"security":false},{"name":"nodejs","version":"10.13.0","date":"2018-10-30","lts":"Dubnium","security":false},{"name":"nodejs","version":"10.14.0","date":"2018-11-27","lts":"Dubnium","security":true},{"name":"nodejs","version":"10.15.0","date":"2018-12-26","lts":"Dubnium","security":false},{"name":"nodejs","version":"10.16.0","date":"2019-05-28","lts":"Dubnium","security":false},{"name":"nodejs","version":"10.17.0","date":"2019-10-22","lts":"Dubnium","security":false},{"name":"nodejs","version":"10.18.0","date":"2019-12-17","lts":"Dubnium","security":true},{"name":"nodejs","version":"10.19.0","date":"2020-02-05","lts":"Dubnium","security":true},{"name":"nodejs","version":"10.20.0","date":"2020-03-26","lts":"Dubnium","security":false},{"name":"nodejs","version":"10.21.0","date":"2020-06-02","lts":"Dubnium","security":true},{"name":"nodejs","version":"10.22.0","date":"2020-07-21","lts":"Dubnium","security":false},{"name":"nodejs","version":"10.23.0","date":"2020-10-27","lts":"Dubnium","security":false},{"name":"nodejs","version":"10.24.0","date":"2021-02-23","lts":"Dubnium","security":true},{"name":"nodejs","version":"11.0.0","date":"2018-10-23","lts":false,"security":false},{"name":"nodejs","version":"11.1.0","date":"2018-10-30","lts":false,"security":false},{"name":"nodejs","version":"11.2.0","date":"2018-11-15","lts":false,"security":false},{"name":"nodejs","version":"11.3.0","date":"2018-11-27","lts":false,"security":true},{"name":"nodejs","version":"11.4.0","date":"2018-12-07","lts":false,"security":false},{"name":"nodejs","version":"11.5.0","date":"2018-12-18","lts":false,"security":false},{"name":"nodejs","version":"11.6.0","date":"2018-12-26","lts":false,"security":false},{"name":"nodejs","version":"11.7.0","date":"2019-01-17","lts":false,"security":false},{"name":"nodejs","version":"11.8.0","date":"2019-01-24","lts":false,"security":false},{"name":"nodejs","version":"11.9.0","date":"2019-01-30","lts":false,"security":false},{"name":"nodejs","version":"11.10.0","date":"2019-02-14","lts":false,"security":false},{"name":"nodejs","version":"11.11.0","date":"2019-03-05","lts":false,"security":false},{"name":"nodejs","version":"11.12.0","date":"2019-03-14","lts":false,"security":false},{"name":"nodejs","version":"11.13.0","date":"2019-03-28","lts":false,"security":false},{"name":"nodejs","version":"11.14.0","date":"2019-04-10","lts":false,"security":false},{"name":"nodejs","version":"11.15.0","date":"2019-04-30","lts":false,"security":false},{"name":"nodejs","version":"12.0.0","date":"2019-04-23","lts":false,"security":false},{"name":"nodejs","version":"12.1.0","date":"2019-04-29","lts":false,"security":false},{"name":"nodejs","version":"12.2.0","date":"2019-05-07","lts":false,"security":false},{"name":"nodejs","version":"12.3.0","date":"2019-05-21","lts":false,"security":false},{"name":"nodejs","version":"12.4.0","date":"2019-06-04","lts":false,"security":false},{"name":"nodejs","version":"12.5.0","date":"2019-06-26","lts":false,"security":false},{"name":"nodejs","version":"12.6.0","date":"2019-07-03","lts":false,"security":false},{"name":"nodejs","version":"12.7.0","date":"2019-07-23","lts":false,"security":false},{"name":"nodejs","version":"12.8.0","date":"2019-08-06","lts":false,"security":false},{"name":"nodejs","version":"12.9.0","date":"2019-08-20","lts":false,"security":false},{"name":"nodejs","version":"12.10.0","date":"2019-09-04","lts":false,"security":false},{"name":"nodejs","version":"12.11.0","date":"2019-09-25","lts":false,"security":false},{"name":"nodejs","version":"12.12.0","date":"2019-10-11","lts":false,"security":false},{"name":"nodejs","version":"12.13.0","date":"2019-10-21","lts":"Erbium","security":false},{"name":"nodejs","version":"12.14.0","date":"2019-12-17","lts":"Erbium","security":true},{"name":"nodejs","version":"12.15.0","date":"2020-02-05","lts":"Erbium","security":true},{"name":"nodejs","version":"12.16.0","date":"2020-02-11","lts":"Erbium","security":false},{"name":"nodejs","version":"12.17.0","date":"2020-05-26","lts":"Erbium","security":false},{"name":"nodejs","version":"12.18.0","date":"2020-06-02","lts":"Erbium","security":true},{"name":"nodejs","version":"12.19.0","date":"2020-10-06","lts":"Erbium","security":false},{"name":"nodejs","version":"12.20.0","date":"2020-11-24","lts":"Erbium","security":false},{"name":"nodejs","version":"12.21.0","date":"2021-02-23","lts":"Erbium","security":true},{"name":"nodejs","version":"12.22.0","date":"2021-03-30","lts":"Erbium","security":false},{"name":"nodejs","version":"13.0.0","date":"2019-10-22","lts":false,"security":false},{"name":"nodejs","version":"13.1.0","date":"2019-11-05","lts":false,"security":false},{"name":"nodejs","version":"13.2.0","date":"2019-11-21","lts":false,"security":false},{"name":"nodejs","version":"13.3.0","date":"2019-12-03","lts":false,"security":false},{"name":"nodejs","version":"13.4.0","date":"2019-12-17","lts":false,"security":true},{"name":"nodejs","version":"13.5.0","date":"2019-12-18","lts":false,"security":false},{"name":"nodejs","version":"13.6.0","date":"2020-01-07","lts":false,"security":false},{"name":"nodejs","version":"13.7.0","date":"2020-01-21","lts":false,"security":false},{"name":"nodejs","version":"13.8.0","date":"2020-02-05","lts":false,"security":true},{"name":"nodejs","version":"13.9.0","date":"2020-02-18","lts":false,"security":false},{"name":"nodejs","version":"13.10.0","date":"2020-03-04","lts":false,"security":false},{"name":"nodejs","version":"13.11.0","date":"2020-03-12","lts":false,"security":false},{"name":"nodejs","version":"13.12.0","date":"2020-03-26","lts":false,"security":false},{"name":"nodejs","version":"13.13.0","date":"2020-04-14","lts":false,"security":false},{"name":"nodejs","version":"13.14.0","date":"2020-04-29","lts":false,"security":false},{"name":"nodejs","version":"14.0.0","date":"2020-04-21","lts":false,"security":false},{"name":"nodejs","version":"14.1.0","date":"2020-04-29","lts":false,"security":false},{"name":"nodejs","version":"14.2.0","date":"2020-05-05","lts":false,"security":false},{"name":"nodejs","version":"14.3.0","date":"2020-05-19","lts":false,"security":false},{"name":"nodejs","version":"14.4.0","date":"2020-06-02","lts":false,"security":true},{"name":"nodejs","version":"14.5.0","date":"2020-06-30","lts":false,"security":false},{"name":"nodejs","version":"14.6.0","date":"2020-07-20","lts":false,"security":false},{"name":"nodejs","version":"14.7.0","date":"2020-07-29","lts":false,"security":false},{"name":"nodejs","version":"14.8.0","date":"2020-08-11","lts":false,"security":false},{"name":"nodejs","version":"14.9.0","date":"2020-08-27","lts":false,"security":false},{"name":"nodejs","version":"14.10.0","date":"2020-09-08","lts":false,"security":false},{"name":"nodejs","version":"14.11.0","date":"2020-09-15","lts":false,"security":true},{"name":"nodejs","version":"14.12.0","date":"2020-09-22","lts":false,"security":false},{"name":"nodejs","version":"14.13.0","date":"2020-09-29","lts":false,"security":false},{"name":"nodejs","version":"14.14.0","date":"2020-10-15","lts":false,"security":false},{"name":"nodejs","version":"14.15.0","date":"2020-10-27","lts":"Fermium","security":false},{"name":"nodejs","version":"14.16.0","date":"2021-02-23","lts":"Fermium","security":true},{"name":"nodejs","version":"14.17.0","date":"2021-05-11","lts":"Fermium","security":false},{"name":"nodejs","version":"14.18.0","date":"2021-09-28","lts":"Fermium","security":false},{"name":"nodejs","version":"14.19.0","date":"2022-02-01","lts":"Fermium","security":false},{"name":"nodejs","version":"14.20.0","date":"2022-07-07","lts":"Fermium","security":true},{"name":"nodejs","version":"14.21.0","date":"2022-11-01","lts":"Fermium","security":false},{"name":"nodejs","version":"15.0.0","date":"2020-10-20","lts":false,"security":false},{"name":"nodejs","version":"15.1.0","date":"2020-11-04","lts":false,"security":false},{"name":"nodejs","version":"15.2.0","date":"2020-11-10","lts":false,"security":false},{"name":"nodejs","version":"15.3.0","date":"2020-11-24","lts":false,"security":false},{"name":"nodejs","version":"15.4.0","date":"2020-12-09","lts":false,"security":false},{"name":"nodejs","version":"15.5.0","date":"2020-12-22","lts":false,"security":false},{"name":"nodejs","version":"15.6.0","date":"2021-01-14","lts":false,"security":false},{"name":"nodejs","version":"15.7.0","date":"2021-01-25","lts":false,"security":false},{"name":"nodejs","version":"15.8.0","date":"2021-02-02","lts":false,"security":false},{"name":"nodejs","version":"15.9.0","date":"2021-02-18","lts":false,"security":false},{"name":"nodejs","version":"15.10.0","date":"2021-02-23","lts":false,"security":true},{"name":"nodejs","version":"15.11.0","date":"2021-03-03","lts":false,"security":false},{"name":"nodejs","version":"15.12.0","date":"2021-03-17","lts":false,"security":false},{"name":"nodejs","version":"15.13.0","date":"2021-03-31","lts":false,"security":false},{"name":"nodejs","version":"15.14.0","date":"2021-04-06","lts":false,"security":false},{"name":"nodejs","version":"16.0.0","date":"2021-04-20","lts":false,"security":false},{"name":"nodejs","version":"16.1.0","date":"2021-05-04","lts":false,"security":false},{"name":"nodejs","version":"16.2.0","date":"2021-05-19","lts":false,"security":false},{"name":"nodejs","version":"16.3.0","date":"2021-06-03","lts":false,"security":false},{"name":"nodejs","version":"16.4.0","date":"2021-06-23","lts":false,"security":false},{"name":"nodejs","version":"16.5.0","date":"2021-07-14","lts":false,"security":false},{"name":"nodejs","version":"16.6.0","date":"2021-07-29","lts":false,"security":true},{"name":"nodejs","version":"16.7.0","date":"2021-08-18","lts":false,"security":false},{"name":"nodejs","version":"16.8.0","date":"2021-08-25","lts":false,"security":false},{"name":"nodejs","version":"16.9.0","date":"2021-09-07","lts":false,"security":false},{"name":"nodejs","version":"16.10.0","date":"2021-09-22","lts":false,"security":false},{"name":"nodejs","version":"16.11.0","date":"2021-10-08","lts":false,"security":false},{"name":"nodejs","version":"16.12.0","date":"2021-10-20","lts":false,"security":false},{"name":"nodejs","version":"16.13.0","date":"2021-10-26","lts":"Gallium","security":false},{"name":"nodejs","version":"16.14.0","date":"2022-02-08","lts":"Gallium","security":false},{"name":"nodejs","version":"16.15.0","date":"2022-04-26","lts":"Gallium","security":false},{"name":"nodejs","version":"16.16.0","date":"2022-07-07","lts":"Gallium","security":true},{"name":"nodejs","version":"16.17.0","date":"2022-08-16","lts":"Gallium","security":false},{"name":"nodejs","version":"16.18.0","date":"2022-10-12","lts":"Gallium","security":false},{"name":"nodejs","version":"16.19.0","date":"2022-12-13","lts":"Gallium","security":false},{"name":"nodejs","version":"17.0.0","date":"2021-10-19","lts":false,"security":false},{"name":"nodejs","version":"17.1.0","date":"2021-11-09","lts":false,"security":false},{"name":"nodejs","version":"17.2.0","date":"2021-11-30","lts":false,"security":false},{"name":"nodejs","version":"17.3.0","date":"2021-12-17","lts":false,"security":false},{"name":"nodejs","version":"17.4.0","date":"2022-01-18","lts":false,"security":false},{"name":"nodejs","version":"17.5.0","date":"2022-02-10","lts":false,"security":false},{"name":"nodejs","version":"17.6.0","date":"2022-02-22","lts":false,"security":false},{"name":"nodejs","version":"17.7.0","date":"2022-03-09","lts":false,"security":false},{"name":"nodejs","version":"17.8.0","date":"2022-03-22","lts":false,"security":false},{"name":"nodejs","version":"17.9.0","date":"2022-04-07","lts":false,"security":false},{"name":"nodejs","version":"18.0.0","date":"2022-04-18","lts":false,"security":false},{"name":"nodejs","version":"18.1.0","date":"2022-05-03","lts":false,"security":false},{"name":"nodejs","version":"18.2.0","date":"2022-05-17","lts":false,"security":false},{"name":"nodejs","version":"18.3.0","date":"2022-06-02","lts":false,"security":false},{"name":"nodejs","version":"18.4.0","date":"2022-06-16","lts":false,"security":false},{"name":"nodejs","version":"18.5.0","date":"2022-07-06","lts":false,"security":true},{"name":"nodejs","version":"18.6.0","date":"2022-07-13","lts":false,"security":false},{"name":"nodejs","version":"18.7.0","date":"2022-07-26","lts":false,"security":false},{"name":"nodejs","version":"18.8.0","date":"2022-08-24","lts":false,"security":false},{"name":"nodejs","version":"18.9.0","date":"2022-09-07","lts":false,"security":false},{"name":"nodejs","version":"18.10.0","date":"2022-09-28","lts":false,"security":false},{"name":"nodejs","version":"18.11.0","date":"2022-10-13","lts":false,"security":false},{"name":"nodejs","version":"18.12.0","date":"2022-10-25","lts":"Hydrogen","security":false},{"name":"nodejs","version":"19.0.0","date":"2022-10-17","lts":false,"security":false},{"name":"nodejs","version":"19.1.0","date":"2022-11-14","lts":false,"security":false},{"name":"nodejs","version":"19.2.0","date":"2022-11-29","lts":false,"security":false},{"name":"nodejs","version":"19.3.0","date":"2022-12-14","lts":false,"security":false}]');

/***/ }),

/***/ "./node_modules/node-releases/data/release-schedule/release-schedule.json":
/*!********************************************************************************!*\
  !*** ./node_modules/node-releases/data/release-schedule/release-schedule.json ***!
  \********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"v0.8":{"start":"2012-06-25","end":"2014-07-31"},"v0.10":{"start":"2013-03-11","end":"2016-10-31"},"v0.12":{"start":"2015-02-06","end":"2016-12-31"},"v4":{"start":"2015-09-08","lts":"2015-10-12","maintenance":"2017-04-01","end":"2018-04-30","codename":"Argon"},"v5":{"start":"2015-10-29","maintenance":"2016-04-30","end":"2016-06-30"},"v6":{"start":"2016-04-26","lts":"2016-10-18","maintenance":"2018-04-30","end":"2019-04-30","codename":"Boron"},"v7":{"start":"2016-10-25","maintenance":"2017-04-30","end":"2017-06-30"},"v8":{"start":"2017-05-30","lts":"2017-10-31","maintenance":"2019-01-01","end":"2019-12-31","codename":"Carbon"},"v9":{"start":"2017-10-01","maintenance":"2018-04-01","end":"2018-06-30"},"v10":{"start":"2018-04-24","lts":"2018-10-30","maintenance":"2020-05-19","end":"2021-04-30","codename":"Dubnium"},"v11":{"start":"2018-10-23","maintenance":"2019-04-22","end":"2019-06-01"},"v12":{"start":"2019-04-23","lts":"2019-10-21","maintenance":"2020-11-30","end":"2022-04-30","codename":"Erbium"},"v13":{"start":"2019-10-22","maintenance":"2020-04-01","end":"2020-06-01"},"v14":{"start":"2020-04-21","lts":"2020-10-27","maintenance":"2021-10-19","end":"2023-04-30","codename":"Fermium"},"v15":{"start":"2020-10-20","maintenance":"2021-04-01","end":"2021-06-01"},"v16":{"start":"2021-04-20","lts":"2021-10-26","maintenance":"2022-10-18","end":"2023-09-11","codename":"Gallium"},"v17":{"start":"2021-10-19","maintenance":"2022-04-01","end":"2022-06-01"},"v18":{"start":"2022-04-19","lts":"2022-10-25","maintenance":"2023-10-18","end":"2025-04-30","codename":"Hydrogen"},"v19":{"start":"2022-10-18","maintenance":"2023-04-01","end":"2023-06-01"},"v20":{"start":"2023-04-18","lts":"2023-10-24","maintenance":"2024-10-22","end":"2026-04-30","codename":""}}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) scriptUrl = scripts[scripts.length - 1].src
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = document.baseURI || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"main": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no jsonp function
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var es_module_lexer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! es-module-lexer */ "./node_modules/es-module-lexer/dist/lexer.js");
/* harmony import */ var internal_slot__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! internal-slot */ "./node_modules/internal-slot/index.js");
/* harmony import */ var internal_slot__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(internal_slot__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _initialpage__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./initialpage */ "./src/initialpage.js");
/* harmony import */ var _footer__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./footer */ "./src/footer.js");
/* harmony import */ var _menu__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./menu */ "./src/menu.js");






const webPage = (() => {
  const content = document.querySelector('#content');
  let button;

  const clear = function () {
    content.innerText = '';
  };

  const setHomePage = function () {
    clear();
    (0,_initialpage__WEBPACK_IMPORTED_MODULE_2__["default"])(content);
    (0,_footer__WEBPACK_IMPORTED_MODULE_3__["default"])(content);
    buttonToggle(true);
  };

  const setMenuPage = function () {
    clear();
    (0,_menu__WEBPACK_IMPORTED_MODULE_4__["default"])(content);
    (0,_footer__WEBPACK_IMPORTED_MODULE_3__["default"])(content);
    buttonToggle(false);
  };

  const buttonToggle = function (fromHome) {
    button = document.querySelector('.navButton');
    if (fromHome) {
      button.addEventListener('click', setMenuPage);
    } else {
      button.addEventListener('click', setHomePage);
    }
  };

  // default
  setHomePage();

  button = document.querySelector('.navButton');
  button.addEventListener('click', setMenuPage);
})();

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSx3QkFBd0IsbUJBQU8sQ0FBQyxxREFBUzs7QUFFekM7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBLEdBQUc7O0FBRUg7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7Ozs7Ozs7Ozs7QUNYQSxpQkFBaUIsbUJBQU8sQ0FBQyxxR0FBd0M7QUFDakUsYUFBYSw0SEFBbUQ7QUFDaEUsWUFBWSxtQkFBTyxDQUFDLDJJQUEyRDtBQUMvRSxXQUFXLG1CQUFPLENBQUMsbUJBQU07QUFDekIsVUFBVSxtQkFBTyxDQUFDLHNGQUErQjs7QUFFakQsd0JBQXdCLG1CQUFPLENBQUMscURBQVM7QUFDekMsWUFBWSxtQkFBTyxDQUFDLHFEQUFTO0FBQzdCLFVBQVUsbUJBQU8sQ0FBQyxzREFBUTs7QUFFMUI7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQ0FBb0MsUUFBUTtBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxrQkFBa0Isa0JBQWtCO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQSx1Q0FBdUMsbUJBQW1CO0FBQzFEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULFFBQVE7QUFDUjtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQixxQkFBcUI7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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N0Q7Ozs7O1dDTkE7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7Ozs7O1dDZkE7O1dBRUE7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBOztXQUVBOztXQUVBOztXQUVBOztXQUVBOztXQUVBOztXQUVBOztXQUVBOzs7OztXQ3JCQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDQXVDO0FBQ0g7QUFDSTtBQUNKO0FBQ0o7O0FBRWhDO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUksd0RBQVc7QUFDZixJQUFJLG1EQUFZO0FBQ2hCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUksaURBQVU7QUFDZCxJQUFJLG1EQUFZO0FBQ2hCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9icm93c2Vyc2xpc3QvYnJvd3Nlci5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9icm93c2Vyc2xpc3QvZXJyb3IuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvYnJvd3NlcnNsaXN0L2luZGV4LmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJzbGlzdC9wYXJzZS5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYWxsLWJpbmQvY2FsbEJvdW5kLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2NhbGwtYmluZC9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYW5pdXNlLWxpdGUvZGF0YS9hZ2VudHMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY2FuaXVzZS1saXRlL2RhdGEvYnJvd3NlclZlcnNpb25zLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nhbml1c2UtbGl0ZS9kYXRhL2Jyb3dzZXJzLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nhbml1c2UtbGl0ZS9kaXN0L3VucGFja2VyL2FnZW50cy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYW5pdXNlLWxpdGUvZGlzdC91bnBhY2tlci9icm93c2VyVmVyc2lvbnMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY2FuaXVzZS1saXRlL2Rpc3QvdW5wYWNrZXIvYnJvd3NlcnMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvZ2xvYmFsLmNzcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9pbml0aWFsUGFnZS5jc3MiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvbWVudS5jc3MiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2dldFVybC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL21lbnUuY3N2Iiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2VsZWN0cm9uLXRvLWNocm9taXVtL3ZlcnNpb25zLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Z1bmN0aW9uLWJpbmQvaW1wbGVtZW50YXRpb24uanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvZnVuY3Rpb24tYmluZC9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9nZXQtaW50cmluc2ljL2luZGV4LmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2hhcy1zeW1ib2xzL2luZGV4LmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2hhcy1zeW1ib2xzL3NoYW1zLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2hhcy9zcmMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvaW50ZXJuYWwtc2xvdC9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9vYmplY3QtaW5zcGVjdC9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9hYm91dC50eHQiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvc2lkZS1jaGFubmVsL2luZGV4LmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL2dsb2JhbC5jc3M/ZDNiYyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9pbml0aWFsUGFnZS5jc3M/YTlhMyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9tZW51LmNzcz8xMTBiIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvZm9vdGVyLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL2luaXRpYWxwYWdlLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL21lbnUuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvaWdub3JlZHwvVXNlcnMvam9ydGVnYS9Eb2N1bWVudHMvRGV2L09kaW4vcmVzdGF1cmFudFBhZ2Uvbm9kZV9tb2R1bGVzL2Jyb3dzZXJzbGlzdHxwYXRoIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL2lnbm9yZWR8L1VzZXJzL2pvcnRlZ2EvRG9jdW1lbnRzL0Rldi9PZGluL3Jlc3RhdXJhbnRQYWdlL25vZGVfbW9kdWxlcy9vYmplY3QtaW5zcGVjdHwuL3V0aWwuaW5zcGVjdCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9lcy1tb2R1bGUtbGV4ZXIvZGlzdC9sZXhlci5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS93ZWJwYWNrL3J1bnRpbWUvY29tcGF0IGdldCBkZWZhdWx0IGV4cG9ydCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL2dsb2JhbCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL3B1YmxpY1BhdGgiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL2pzb25wIGNodW5rIGxvYWRpbmciLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL25vbmNlIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBCcm93c2Vyc2xpc3RFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKVxuXG5mdW5jdGlvbiBub29wKCkge31cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGxvYWRRdWVyaWVzOiBmdW5jdGlvbiBsb2FkUXVlcmllcygpIHtcbiAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAnU2hhcmFibGUgY29uZmlncyBhcmUgbm90IHN1cHBvcnRlZCBpbiBjbGllbnQtc2lkZSBidWlsZCBvZiBCcm93c2Vyc2xpc3QnXG4gICAgKVxuICB9LFxuXG4gIGdldFN0YXQ6IGZ1bmN0aW9uIGdldFN0YXQob3B0cykge1xuICAgIHJldHVybiBvcHRzLnN0YXRzXG4gIH0sXG5cbiAgbG9hZENvbmZpZzogZnVuY3Rpb24gbG9hZENvbmZpZyhvcHRzKSB7XG4gICAgaWYgKG9wdHMuY29uZmlnKSB7XG4gICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAgICdCcm93c2Vyc2xpc3QgY29uZmlnIGFyZSBub3Qgc3VwcG9ydGVkIGluIGNsaWVudC1zaWRlIGJ1aWxkJ1xuICAgICAgKVxuICAgIH1cbiAgfSxcblxuICBsb2FkQ291bnRyeTogZnVuY3Rpb24gbG9hZENvdW50cnkoKSB7XG4gICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgJ0NvdW50cnkgc3RhdGlzdGljcyBhcmUgbm90IHN1cHBvcnRlZCAnICtcbiAgICAgICAgJ2luIGNsaWVudC1zaWRlIGJ1aWxkIG9mIEJyb3dzZXJzbGlzdCdcbiAgICApXG4gIH0sXG5cbiAgbG9hZEZlYXR1cmU6IGZ1bmN0aW9uIGxvYWRGZWF0dXJlKCkge1xuICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICdTdXBwb3J0cyBxdWVyaWVzIGFyZSBub3QgYXZhaWxhYmxlIGluIGNsaWVudC1zaWRlIGJ1aWxkIG9mIEJyb3dzZXJzbGlzdCdcbiAgICApXG4gIH0sXG5cbiAgY3VycmVudE5vZGU6IGZ1bmN0aW9uIGN1cnJlbnROb2RlKHJlc29sdmUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gcmVzb2x2ZShbJ21haW50YWluZWQgbm9kZSB2ZXJzaW9ucyddLCBjb250ZXh0KVswXVxuICB9LFxuXG4gIHBhcnNlQ29uZmlnOiBub29wLFxuXG4gIHJlYWRDb25maWc6IG5vb3AsXG5cbiAgZmluZENvbmZpZzogbm9vcCxcblxuICBjbGVhckNhY2hlczogbm9vcCxcblxuICBvbGREYXRhV2FybmluZzogbm9vcFxufVxuIiwiZnVuY3Rpb24gQnJvd3NlcnNsaXN0RXJyb3IobWVzc2FnZSkge1xuICB0aGlzLm5hbWUgPSAnQnJvd3NlcnNsaXN0RXJyb3InXG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2VcbiAgdGhpcy5icm93c2Vyc2xpc3QgPSB0cnVlXG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEJyb3dzZXJzbGlzdEVycm9yKVxuICB9XG59XG5cbkJyb3dzZXJzbGlzdEVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJyb3dzZXJzbGlzdEVycm9yXG4iLCJ2YXIganNSZWxlYXNlcyA9IHJlcXVpcmUoJ25vZGUtcmVsZWFzZXMvZGF0YS9wcm9jZXNzZWQvZW52cy5qc29uJylcbnZhciBhZ2VudHMgPSByZXF1aXJlKCdjYW5pdXNlLWxpdGUvZGlzdC91bnBhY2tlci9hZ2VudHMnKS5hZ2VudHNcbnZhciBqc0VPTCA9IHJlcXVpcmUoJ25vZGUtcmVsZWFzZXMvZGF0YS9yZWxlYXNlLXNjaGVkdWxlL3JlbGVhc2Utc2NoZWR1bGUuanNvbicpXG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxudmFyIGUyYyA9IHJlcXVpcmUoJ2VsZWN0cm9uLXRvLWNocm9taXVtL3ZlcnNpb25zJylcblxudmFyIEJyb3dzZXJzbGlzdEVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpXG52YXIgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlJylcbnZhciBlbnYgPSByZXF1aXJlKCcuL25vZGUnKSAvLyBXaWxsIGxvYWQgYnJvd3Nlci5qcyBpbiB3ZWJwYWNrXG5cbnZhciBZRUFSID0gMzY1LjI1OTY0MSAqIDI0ICogNjAgKiA2MCAqIDEwMDBcbnZhciBBTkRST0lEX0VWRVJHUkVFTl9GSVJTVCA9IDM3XG5cbi8vIEhlbHBlcnNcblxuZnVuY3Rpb24gaXNWZXJzaW9uc01hdGNoKHZlcnNpb25BLCB2ZXJzaW9uQikge1xuICByZXR1cm4gKHZlcnNpb25BICsgJy4nKS5pbmRleE9mKHZlcnNpb25CICsgJy4nKSA9PT0gMFxufVxuXG5mdW5jdGlvbiBpc0VvbFJlbGVhc2VkKG5hbWUpIHtcbiAgdmFyIHZlcnNpb24gPSBuYW1lLnNsaWNlKDEpXG4gIHJldHVybiBicm93c2Vyc2xpc3Qubm9kZVZlcnNpb25zLnNvbWUoZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gaXNWZXJzaW9uc01hdGNoKGksIHZlcnNpb24pXG4gIH0pXG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZSh2ZXJzaW9ucykge1xuICByZXR1cm4gdmVyc2lvbnMuZmlsdGVyKGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2ZXJzaW9uID09PSAnc3RyaW5nJ1xuICB9KVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVFbGVjdHJvbih2ZXJzaW9uKSB7XG4gIHZhciB2ZXJzaW9uVG9Vc2UgPSB2ZXJzaW9uXG4gIGlmICh2ZXJzaW9uLnNwbGl0KCcuJykubGVuZ3RoID09PSAzKSB7XG4gICAgdmVyc2lvblRvVXNlID0gdmVyc2lvbi5zcGxpdCgnLicpLnNsaWNlKDAsIC0xKS5qb2luKCcuJylcbiAgfVxuICByZXR1cm4gdmVyc2lvblRvVXNlXG59XG5cbmZ1bmN0aW9uIG5hbWVNYXBwZXIobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24gbWFwTmFtZSh2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIG5hbWUgKyAnICcgKyB2ZXJzaW9uXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0TWFqb3IodmVyc2lvbikge1xuICByZXR1cm4gcGFyc2VJbnQodmVyc2lvbi5zcGxpdCgnLicpWzBdKVxufVxuXG5mdW5jdGlvbiBnZXRNYWpvclZlcnNpb25zKHJlbGVhc2VkLCBudW1iZXIpIHtcbiAgaWYgKHJlbGVhc2VkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdXG4gIHZhciBtYWpvclZlcnNpb25zID0gdW5pcShyZWxlYXNlZC5tYXAoZ2V0TWFqb3IpKVxuICB2YXIgbWluaW11bSA9IG1ham9yVmVyc2lvbnNbbWFqb3JWZXJzaW9ucy5sZW5ndGggLSBudW1iZXJdXG4gIGlmICghbWluaW11bSkge1xuICAgIHJldHVybiByZWxlYXNlZFxuICB9XG4gIHZhciBzZWxlY3RlZCA9IFtdXG4gIGZvciAodmFyIGkgPSByZWxlYXNlZC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGlmIChtaW5pbXVtID4gZ2V0TWFqb3IocmVsZWFzZWRbaV0pKSBicmVha1xuICAgIHNlbGVjdGVkLnVuc2hpZnQocmVsZWFzZWRbaV0pXG4gIH1cbiAgcmV0dXJuIHNlbGVjdGVkXG59XG5cbmZ1bmN0aW9uIHVuaXEoYXJyYXkpIHtcbiAgdmFyIGZpbHRlcmVkID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIGlmIChmaWx0ZXJlZC5pbmRleE9mKGFycmF5W2ldKSA9PT0gLTEpIGZpbHRlcmVkLnB1c2goYXJyYXlbaV0pXG4gIH1cbiAgcmV0dXJuIGZpbHRlcmVkXG59XG5cbmZ1bmN0aW9uIGZpbGxVc2FnZShyZXN1bHQsIG5hbWUsIGRhdGEpIHtcbiAgZm9yICh2YXIgaSBpbiBkYXRhKSB7XG4gICAgcmVzdWx0W25hbWUgKyAnICcgKyBpXSA9IGRhdGFbaV1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUZpbHRlcihzaWduLCB2ZXJzaW9uKSB7XG4gIHZlcnNpb24gPSBwYXJzZUZsb2F0KHZlcnNpb24pXG4gIGlmIChzaWduID09PSAnPicpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHYpID4gdmVyc2lvblxuICAgIH1cbiAgfSBlbHNlIGlmIChzaWduID09PSAnPj0nKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdCh2KSA+PSB2ZXJzaW9uXG4gICAgfVxuICB9IGVsc2UgaWYgKHNpZ24gPT09ICc8Jykge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodikgPCB2ZXJzaW9uXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodikgPD0gdmVyc2lvblxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVNlbXZlckZpbHRlcihzaWduLCB2ZXJzaW9uKSB7XG4gIHZlcnNpb24gPSB2ZXJzaW9uLnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICB2ZXJzaW9uWzFdID0gdmVyc2lvblsxXSB8fCAwXG4gIHZlcnNpb25bMl0gPSB2ZXJzaW9uWzJdIHx8IDBcbiAgaWYgKHNpZ24gPT09ICc+Jykge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgdiA9IHYuc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gICAgICByZXR1cm4gY29tcGFyZVNlbXZlcih2LCB2ZXJzaW9uKSA+IDBcbiAgICB9XG4gIH0gZWxzZSBpZiAoc2lnbiA9PT0gJz49Jykge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgdiA9IHYuc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gICAgICByZXR1cm4gY29tcGFyZVNlbXZlcih2LCB2ZXJzaW9uKSA+PSAwXG4gICAgfVxuICB9IGVsc2UgaWYgKHNpZ24gPT09ICc8Jykge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgdiA9IHYuc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gICAgICByZXR1cm4gY29tcGFyZVNlbXZlcih2ZXJzaW9uLCB2KSA+IDBcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2KSB7XG4gICAgICB2ID0gdi5zcGxpdCgnLicpLm1hcChwYXJzZVNpbXBsZUludClcbiAgICAgIHJldHVybiBjb21wYXJlU2VtdmVyKHZlcnNpb24sIHYpID49IDBcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFyc2VTaW1wbGVJbnQoeCkge1xuICByZXR1cm4gcGFyc2VJbnQoeClcbn1cblxuZnVuY3Rpb24gY29tcGFyZShhLCBiKSB7XG4gIGlmIChhIDwgYikgcmV0dXJuIC0xXG4gIGlmIChhID4gYikgcmV0dXJuICsxXG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVTZW12ZXIoYSwgYikge1xuICByZXR1cm4gKFxuICAgIGNvbXBhcmUocGFyc2VJbnQoYVswXSksIHBhcnNlSW50KGJbMF0pKSB8fFxuICAgIGNvbXBhcmUocGFyc2VJbnQoYVsxXSB8fCAnMCcpLCBwYXJzZUludChiWzFdIHx8ICcwJykpIHx8XG4gICAgY29tcGFyZShwYXJzZUludChhWzJdIHx8ICcwJyksIHBhcnNlSW50KGJbMl0gfHwgJzAnKSlcbiAgKVxufVxuXG4vLyB0aGlzIGZvbGxvd3MgdGhlIG5wbS1saWtlIHNlbXZlciBiZWhhdmlvclxuZnVuY3Rpb24gc2VtdmVyRmlsdGVyTG9vc2Uob3BlcmF0b3IsIHJhbmdlKSB7XG4gIHJhbmdlID0gcmFuZ2Uuc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gIGlmICh0eXBlb2YgcmFuZ2VbMV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmFuZ2VbMV0gPSAneCdcbiAgfVxuICAvLyBpZ25vcmUgYW55IHBhdGNoIHZlcnNpb24gYmVjYXVzZSB3ZSBvbmx5IHJldHVybiBtaW5vciB2ZXJzaW9uc1xuICAvLyByYW5nZVsyXSA9ICd4J1xuICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgY2FzZSAnPD0nOlxuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICAgICAgICByZXR1cm4gY29tcGFyZVNlbXZlckxvb3NlKHZlcnNpb24sIHJhbmdlKSA8PSAwXG4gICAgICB9XG4gICAgY2FzZSAnPj0nOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKHZlcnNpb24pIHtcbiAgICAgICAgdmVyc2lvbiA9IHZlcnNpb24uc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gICAgICAgIHJldHVybiBjb21wYXJlU2VtdmVyTG9vc2UodmVyc2lvbiwgcmFuZ2UpID49IDBcbiAgICAgIH1cbiAgfVxufVxuXG4vLyB0aGlzIGZvbGxvd3MgdGhlIG5wbS1saWtlIHNlbXZlciBiZWhhdmlvclxuZnVuY3Rpb24gY29tcGFyZVNlbXZlckxvb3NlKHZlcnNpb24sIHJhbmdlKSB7XG4gIGlmICh2ZXJzaW9uWzBdICE9PSByYW5nZVswXSkge1xuICAgIHJldHVybiB2ZXJzaW9uWzBdIDwgcmFuZ2VbMF0gPyAtMSA6ICsxXG4gIH1cbiAgaWYgKHJhbmdlWzFdID09PSAneCcpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh2ZXJzaW9uWzFdICE9PSByYW5nZVsxXSkge1xuICAgIHJldHVybiB2ZXJzaW9uWzFdIDwgcmFuZ2VbMV0gPyAtMSA6ICsxXG4gIH1cbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVZlcnNpb24oZGF0YSwgdmVyc2lvbikge1xuICBpZiAoZGF0YS52ZXJzaW9ucy5pbmRleE9mKHZlcnNpb24pICE9PSAtMSkge1xuICAgIHJldHVybiB2ZXJzaW9uXG4gIH0gZWxzZSBpZiAoYnJvd3NlcnNsaXN0LnZlcnNpb25BbGlhc2VzW2RhdGEubmFtZV1bdmVyc2lvbl0pIHtcbiAgICByZXR1cm4gYnJvd3NlcnNsaXN0LnZlcnNpb25BbGlhc2VzW2RhdGEubmFtZV1bdmVyc2lvbl1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVWZXJzaW9uKGRhdGEsIHZlcnNpb24pIHtcbiAgdmFyIHJlc29sdmVkID0gcmVzb2x2ZVZlcnNpb24oZGF0YSwgdmVyc2lvbilcbiAgaWYgKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkXG4gIH0gZWxzZSBpZiAoZGF0YS52ZXJzaW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZGF0YS52ZXJzaW9uc1swXVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpbHRlckJ5WWVhcihzaW5jZSwgY29udGV4dCkge1xuICBzaW5jZSA9IHNpbmNlIC8gMTAwMFxuICByZXR1cm4gT2JqZWN0LmtleXMoYWdlbnRzKS5yZWR1Y2UoZnVuY3Rpb24gKHNlbGVjdGVkLCBuYW1lKSB7XG4gICAgdmFyIGRhdGEgPSBieU5hbWUobmFtZSwgY29udGV4dClcbiAgICBpZiAoIWRhdGEpIHJldHVybiBzZWxlY3RlZFxuICAgIHZhciB2ZXJzaW9ucyA9IE9iamVjdC5rZXlzKGRhdGEucmVsZWFzZURhdGUpLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgdmFyIGRhdGUgPSBkYXRhLnJlbGVhc2VEYXRlW3ZdXG4gICAgICByZXR1cm4gZGF0ZSAhPT0gbnVsbCAmJiBkYXRlID49IHNpbmNlXG4gICAgfSlcbiAgICByZXR1cm4gc2VsZWN0ZWQuY29uY2F0KHZlcnNpb25zLm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpKVxuICB9LCBbXSlcbn1cblxuZnVuY3Rpb24gY2xvbmVEYXRhKGRhdGEpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBkYXRhLm5hbWUsXG4gICAgdmVyc2lvbnM6IGRhdGEudmVyc2lvbnMsXG4gICAgcmVsZWFzZWQ6IGRhdGEucmVsZWFzZWQsXG4gICAgcmVsZWFzZURhdGU6IGRhdGEucmVsZWFzZURhdGVcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXBWZXJzaW9ucyhkYXRhLCBtYXApIHtcbiAgZGF0YS52ZXJzaW9ucyA9IGRhdGEudmVyc2lvbnMubWFwKGZ1bmN0aW9uIChpKSB7XG4gICAgcmV0dXJuIG1hcFtpXSB8fCBpXG4gIH0pXG4gIGRhdGEucmVsZWFzZWQgPSBkYXRhLnJlbGVhc2VkLm1hcChmdW5jdGlvbiAoaSkge1xuICAgIHJldHVybiBtYXBbaV0gfHwgaVxuICB9KVxuICB2YXIgZml4ZWREYXRlID0ge31cbiAgZm9yICh2YXIgaSBpbiBkYXRhLnJlbGVhc2VEYXRlKSB7XG4gICAgZml4ZWREYXRlW21hcFtpXSB8fCBpXSA9IGRhdGEucmVsZWFzZURhdGVbaV1cbiAgfVxuICBkYXRhLnJlbGVhc2VEYXRlID0gZml4ZWREYXRlXG4gIHJldHVybiBkYXRhXG59XG5cbmZ1bmN0aW9uIGJ5TmFtZShuYW1lLCBjb250ZXh0KSB7XG4gIG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKClcbiAgbmFtZSA9IGJyb3dzZXJzbGlzdC5hbGlhc2VzW25hbWVdIHx8IG5hbWVcbiAgaWYgKGNvbnRleHQubW9iaWxlVG9EZXNrdG9wICYmIGJyb3dzZXJzbGlzdC5kZXNrdG9wTmFtZXNbbmFtZV0pIHtcbiAgICB2YXIgZGVza3RvcCA9IGJyb3dzZXJzbGlzdC5kYXRhW2Jyb3dzZXJzbGlzdC5kZXNrdG9wTmFtZXNbbmFtZV1dXG4gICAgaWYgKG5hbWUgPT09ICdhbmRyb2lkJykge1xuICAgICAgcmV0dXJuIG5vcm1hbGl6ZUFuZHJvaWREYXRhKGNsb25lRGF0YShicm93c2Vyc2xpc3QuZGF0YVtuYW1lXSksIGRlc2t0b3ApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBjbG9uZWQgPSBjbG9uZURhdGEoZGVza3RvcClcbiAgICAgIGNsb25lZC5uYW1lID0gbmFtZVxuICAgICAgaWYgKG5hbWUgPT09ICdvcF9tb2InKSB7XG4gICAgICAgIGNsb25lZCA9IG1hcFZlcnNpb25zKGNsb25lZCwgeyAnMTAuMC0xMC4xJzogJzEwJyB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIGNsb25lZFxuICAgIH1cbiAgfVxuICByZXR1cm4gYnJvd3NlcnNsaXN0LmRhdGFbbmFtZV1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQW5kcm9pZFZlcnNpb25zKGFuZHJvaWRWZXJzaW9ucywgY2hyb21lVmVyc2lvbnMpIHtcbiAgdmFyIGZpcnN0RXZlcmdyZWVuID0gQU5EUk9JRF9FVkVSR1JFRU5fRklSU1RcbiAgdmFyIGxhc3QgPSBjaHJvbWVWZXJzaW9uc1tjaHJvbWVWZXJzaW9ucy5sZW5ndGggLSAxXVxuICByZXR1cm4gYW5kcm9pZFZlcnNpb25zXG4gICAgLmZpbHRlcihmdW5jdGlvbiAodmVyc2lvbikge1xuICAgICAgcmV0dXJuIC9eKD86WzItNF1cXC58WzM0XSQpLy50ZXN0KHZlcnNpb24pXG4gICAgfSlcbiAgICAuY29uY2F0KGNocm9tZVZlcnNpb25zLnNsaWNlKGZpcnN0RXZlcmdyZWVuIC0gbGFzdCAtIDEpKVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVBbmRyb2lkRGF0YShhbmRyb2lkLCBjaHJvbWUpIHtcbiAgYW5kcm9pZC5yZWxlYXNlZCA9IG5vcm1hbGl6ZUFuZHJvaWRWZXJzaW9ucyhhbmRyb2lkLnJlbGVhc2VkLCBjaHJvbWUucmVsZWFzZWQpXG4gIGFuZHJvaWQudmVyc2lvbnMgPSBub3JtYWxpemVBbmRyb2lkVmVyc2lvbnMoYW5kcm9pZC52ZXJzaW9ucywgY2hyb21lLnZlcnNpb25zKVxuICByZXR1cm4gYW5kcm9pZFxufVxuXG5mdW5jdGlvbiBjaGVja05hbWUobmFtZSwgY29udGV4dCkge1xuICB2YXIgZGF0YSA9IGJ5TmFtZShuYW1lLCBjb250ZXh0KVxuICBpZiAoIWRhdGEpIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcignVW5rbm93biBicm93c2VyICcgKyBuYW1lKVxuICByZXR1cm4gZGF0YVxufVxuXG5mdW5jdGlvbiB1bmtub3duUXVlcnkocXVlcnkpIHtcbiAgcmV0dXJuIG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAnVW5rbm93biBicm93c2VyIHF1ZXJ5IGAnICtcbiAgICAgIHF1ZXJ5ICtcbiAgICAgICdgLiAnICtcbiAgICAgICdNYXliZSB5b3UgYXJlIHVzaW5nIG9sZCBCcm93c2Vyc2xpc3Qgb3IgbWFkZSB0eXBvIGluIHF1ZXJ5LidcbiAgKVxufVxuXG5mdW5jdGlvbiBmaWx0ZXJBbmRyb2lkKGxpc3QsIHZlcnNpb25zLCBjb250ZXh0KSB7XG4gIGlmIChjb250ZXh0Lm1vYmlsZVRvRGVza3RvcCkgcmV0dXJuIGxpc3RcbiAgdmFyIHJlbGVhc2VkID0gYnJvd3NlcnNsaXN0LmRhdGEuYW5kcm9pZC5yZWxlYXNlZFxuICB2YXIgbGFzdCA9IHJlbGVhc2VkW3JlbGVhc2VkLmxlbmd0aCAtIDFdXG4gIHZhciBkaWZmID0gbGFzdCAtIEFORFJPSURfRVZFUkdSRUVOX0ZJUlNUIC0gdmVyc2lvbnNcbiAgaWYgKGRpZmYgPiAwKSB7XG4gICAgcmV0dXJuIGxpc3Quc2xpY2UoLTEpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGxpc3Quc2xpY2UoZGlmZiAtIDEpXG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShxdWVyaWVzLCBjb250ZXh0KSB7XG4gIHJldHVybiBwYXJzZShRVUVSSUVTLCBxdWVyaWVzKS5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgbm9kZSwgaW5kZXgpIHtcbiAgICBpZiAobm9kZS5ub3QgJiYgaW5kZXggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICAgJ1dyaXRlIGFueSBicm93c2VycyBxdWVyeSAoZm9yIGluc3RhbmNlLCBgZGVmYXVsdHNgKSAnICtcbiAgICAgICAgICAnYmVmb3JlIGAnICtcbiAgICAgICAgICBub2RlLnF1ZXJ5ICtcbiAgICAgICAgICAnYCdcbiAgICAgIClcbiAgICB9XG4gICAgdmFyIHR5cGUgPSBRVUVSSUVTW25vZGUudHlwZV1cbiAgICB2YXIgYXJyYXkgPSB0eXBlLnNlbGVjdC5jYWxsKGJyb3dzZXJzbGlzdCwgY29udGV4dCwgbm9kZSkubWFwKGZ1bmN0aW9uIChqKSB7XG4gICAgICB2YXIgcGFydHMgPSBqLnNwbGl0KCcgJylcbiAgICAgIGlmIChwYXJ0c1sxXSA9PT0gJzAnKSB7XG4gICAgICAgIHJldHVybiBwYXJ0c1swXSArICcgJyArIGJ5TmFtZShwYXJ0c1swXSwgY29udGV4dCkudmVyc2lvbnNbMF1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBqXG4gICAgICB9XG4gICAgfSlcblxuICAgIGlmIChub2RlLmNvbXBvc2UgPT09ICdhbmQnKSB7XG4gICAgICBpZiAobm9kZS5ub3QpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5maWx0ZXIoZnVuY3Rpb24gKGopIHtcbiAgICAgICAgICByZXR1cm4gYXJyYXkuaW5kZXhPZihqKSA9PT0gLTFcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZXN1bHQuZmlsdGVyKGZ1bmN0aW9uIChqKSB7XG4gICAgICAgICAgcmV0dXJuIGFycmF5LmluZGV4T2YoaikgIT09IC0xXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChub2RlLm5vdCkge1xuICAgICAgICB2YXIgZmlsdGVyID0ge31cbiAgICAgICAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoaikge1xuICAgICAgICAgIGZpbHRlcltqXSA9IHRydWVcbiAgICAgICAgfSlcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5maWx0ZXIoZnVuY3Rpb24gKGopIHtcbiAgICAgICAgICByZXR1cm4gIWZpbHRlcltqXVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdC5jb25jYXQoYXJyYXkpXG4gICAgfVxuICB9LCBbXSlcbn1cblxuZnVuY3Rpb24gcHJlcGFyZU9wdHMob3B0cykge1xuICBpZiAodHlwZW9mIG9wdHMgPT09ICd1bmRlZmluZWQnKSBvcHRzID0ge31cblxuICBpZiAodHlwZW9mIG9wdHMucGF0aCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBvcHRzLnBhdGggPSBwYXRoLnJlc29sdmUgPyBwYXRoLnJlc29sdmUoJy4nKSA6ICcuJ1xuICB9XG5cbiAgcmV0dXJuIG9wdHNcbn1cblxuZnVuY3Rpb24gcHJlcGFyZVF1ZXJpZXMocXVlcmllcywgb3B0cykge1xuICBpZiAodHlwZW9mIHF1ZXJpZXMgPT09ICd1bmRlZmluZWQnIHx8IHF1ZXJpZXMgPT09IG51bGwpIHtcbiAgICB2YXIgY29uZmlnID0gYnJvd3NlcnNsaXN0LmxvYWRDb25maWcob3B0cylcbiAgICBpZiAoY29uZmlnKSB7XG4gICAgICBxdWVyaWVzID0gY29uZmlnXG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXJpZXMgPSBicm93c2Vyc2xpc3QuZGVmYXVsdHNcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcXVlcmllc1xufVxuXG5mdW5jdGlvbiBjaGVja1F1ZXJpZXMocXVlcmllcykge1xuICBpZiAoISh0eXBlb2YgcXVlcmllcyA9PT0gJ3N0cmluZycgfHwgQXJyYXkuaXNBcnJheShxdWVyaWVzKSkpIHtcbiAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAnQnJvd3NlciBxdWVyaWVzIG11c3QgYmUgYW4gYXJyYXkgb3Igc3RyaW5nLiBHb3QgJyArIHR5cGVvZiBxdWVyaWVzICsgJy4nXG4gICAgKVxuICB9XG59XG5cbnZhciBjYWNoZSA9IHt9XG5cbmZ1bmN0aW9uIGJyb3dzZXJzbGlzdChxdWVyaWVzLCBvcHRzKSB7XG4gIG9wdHMgPSBwcmVwYXJlT3B0cyhvcHRzKVxuICBxdWVyaWVzID0gcHJlcGFyZVF1ZXJpZXMocXVlcmllcywgb3B0cylcbiAgY2hlY2tRdWVyaWVzKHF1ZXJpZXMpXG5cbiAgdmFyIGNvbnRleHQgPSB7XG4gICAgaWdub3JlVW5rbm93blZlcnNpb25zOiBvcHRzLmlnbm9yZVVua25vd25WZXJzaW9ucyxcbiAgICBkYW5nZXJvdXNFeHRlbmQ6IG9wdHMuZGFuZ2Vyb3VzRXh0ZW5kLFxuICAgIG1vYmlsZVRvRGVza3RvcDogb3B0cy5tb2JpbGVUb0Rlc2t0b3AsXG4gICAgcGF0aDogb3B0cy5wYXRoLFxuICAgIGVudjogb3B0cy5lbnZcbiAgfVxuXG4gIGVudi5vbGREYXRhV2FybmluZyhicm93c2Vyc2xpc3QuZGF0YSlcbiAgdmFyIHN0YXRzID0gZW52LmdldFN0YXQob3B0cywgYnJvd3NlcnNsaXN0LmRhdGEpXG4gIGlmIChzdGF0cykge1xuICAgIGNvbnRleHQuY3VzdG9tVXNhZ2UgPSB7fVxuICAgIGZvciAodmFyIGJyb3dzZXIgaW4gc3RhdHMpIHtcbiAgICAgIGZpbGxVc2FnZShjb250ZXh0LmN1c3RvbVVzYWdlLCBicm93c2VyLCBzdGF0c1ticm93c2VyXSlcbiAgICB9XG4gIH1cblxuICB2YXIgY2FjaGVLZXkgPSBKU09OLnN0cmluZ2lmeShbcXVlcmllcywgY29udGV4dF0pXG4gIGlmIChjYWNoZVtjYWNoZUtleV0pIHJldHVybiBjYWNoZVtjYWNoZUtleV1cblxuICB2YXIgcmVzdWx0ID0gdW5pcShyZXNvbHZlKHF1ZXJpZXMsIGNvbnRleHQpKS5zb3J0KGZ1bmN0aW9uIChuYW1lMSwgbmFtZTIpIHtcbiAgICBuYW1lMSA9IG5hbWUxLnNwbGl0KCcgJylcbiAgICBuYW1lMiA9IG5hbWUyLnNwbGl0KCcgJylcbiAgICBpZiAobmFtZTFbMF0gPT09IG5hbWUyWzBdKSB7XG4gICAgICAvLyBhc3N1bXB0aW9ucyBvbiBjYW5pdXNlIGRhdGFcbiAgICAgIC8vIDEpIHZlcnNpb24gcmFuZ2VzIG5ldmVyIG92ZXJsYXBzXG4gICAgICAvLyAyKSBpZiB2ZXJzaW9uIGlzIG5vdCBhIHJhbmdlLCBpdCBuZXZlciBjb250YWlucyBgLWBcbiAgICAgIHZhciB2ZXJzaW9uMSA9IG5hbWUxWzFdLnNwbGl0KCctJylbMF1cbiAgICAgIHZhciB2ZXJzaW9uMiA9IG5hbWUyWzFdLnNwbGl0KCctJylbMF1cbiAgICAgIHJldHVybiBjb21wYXJlU2VtdmVyKHZlcnNpb24yLnNwbGl0KCcuJyksIHZlcnNpb24xLnNwbGl0KCcuJykpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjb21wYXJlKG5hbWUxWzBdLCBuYW1lMlswXSlcbiAgICB9XG4gIH0pXG4gIGlmICghcHJvY2Vzcy5lbnYuQlJPV1NFUlNMSVNUX0RJU0FCTEVfQ0FDSEUpIHtcbiAgICBjYWNoZVtjYWNoZUtleV0gPSByZXN1bHRcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbmJyb3dzZXJzbGlzdC5wYXJzZSA9IGZ1bmN0aW9uIChxdWVyaWVzLCBvcHRzKSB7XG4gIG9wdHMgPSBwcmVwYXJlT3B0cyhvcHRzKVxuICBxdWVyaWVzID0gcHJlcGFyZVF1ZXJpZXMocXVlcmllcywgb3B0cylcbiAgY2hlY2tRdWVyaWVzKHF1ZXJpZXMpXG4gIHJldHVybiBwYXJzZShRVUVSSUVTLCBxdWVyaWVzKVxufVxuXG4vLyBXaWxsIGJlIGZpbGxlZCBieSBDYW4gSSBVc2UgZGF0YSBiZWxvd1xuYnJvd3NlcnNsaXN0LmNhY2hlID0ge31cbmJyb3dzZXJzbGlzdC5kYXRhID0ge31cbmJyb3dzZXJzbGlzdC51c2FnZSA9IHtcbiAgZ2xvYmFsOiB7fSxcbiAgY3VzdG9tOiBudWxsXG59XG5cbi8vIERlZmF1bHQgYnJvd3NlcnMgcXVlcnlcbmJyb3dzZXJzbGlzdC5kZWZhdWx0cyA9IFsnPiAwLjUlJywgJ2xhc3QgMiB2ZXJzaW9ucycsICdGaXJlZm94IEVTUicsICdub3QgZGVhZCddXG5cbi8vIEJyb3dzZXIgbmFtZXMgYWxpYXNlc1xuYnJvd3NlcnNsaXN0LmFsaWFzZXMgPSB7XG4gIGZ4OiAnZmlyZWZveCcsXG4gIGZmOiAnZmlyZWZveCcsXG4gIGlvczogJ2lvc19zYWYnLFxuICBleHBsb3JlcjogJ2llJyxcbiAgYmxhY2tiZXJyeTogJ2JiJyxcbiAgZXhwbG9yZXJtb2JpbGU6ICdpZV9tb2InLFxuICBvcGVyYW1pbmk6ICdvcF9taW5pJyxcbiAgb3BlcmFtb2JpbGU6ICdvcF9tb2InLFxuICBjaHJvbWVhbmRyb2lkOiAnYW5kX2NocicsXG4gIGZpcmVmb3hhbmRyb2lkOiAnYW5kX2ZmJyxcbiAgdWNhbmRyb2lkOiAnYW5kX3VjJyxcbiAgcXFhbmRyb2lkOiAnYW5kX3FxJ1xufVxuXG4vLyBDYW4gSSBVc2Ugb25seSBwcm92aWRlcyBhIGZldyB2ZXJzaW9ucyBmb3Igc29tZSBicm93c2VycyAoZS5nLiBhbmRfY2hyKS5cbi8vIEZhbGxiYWNrIHRvIGEgc2ltaWxhciBicm93c2VyIGZvciB1bmtub3duIHZlcnNpb25zXG5icm93c2Vyc2xpc3QuZGVza3RvcE5hbWVzID0ge1xuICBhbmRfY2hyOiAnY2hyb21lJyxcbiAgYW5kX2ZmOiAnZmlyZWZveCcsXG4gIGllX21vYjogJ2llJyxcbiAgb3BfbW9iOiAnb3BlcmEnLFxuICBhbmRyb2lkOiAnY2hyb21lJyAvLyBoYXMgZXh0cmEgcHJvY2Vzc2luZyBsb2dpY1xufVxuXG4vLyBBbGlhc2VzIHRvIHdvcmsgd2l0aCBqb2luZWQgdmVyc2lvbnMgbGlrZSBgaW9zX3NhZiA3LjAtNy4xYFxuYnJvd3NlcnNsaXN0LnZlcnNpb25BbGlhc2VzID0ge31cblxuYnJvd3NlcnNsaXN0LmNsZWFyQ2FjaGVzID0gZW52LmNsZWFyQ2FjaGVzXG5icm93c2Vyc2xpc3QucGFyc2VDb25maWcgPSBlbnYucGFyc2VDb25maWdcbmJyb3dzZXJzbGlzdC5yZWFkQ29uZmlnID0gZW52LnJlYWRDb25maWdcbmJyb3dzZXJzbGlzdC5maW5kQ29uZmlnID0gZW52LmZpbmRDb25maWdcbmJyb3dzZXJzbGlzdC5sb2FkQ29uZmlnID0gZW52LmxvYWRDb25maWdcblxuYnJvd3NlcnNsaXN0LmNvdmVyYWdlID0gZnVuY3Rpb24gKGJyb3dzZXJzLCBzdGF0cykge1xuICB2YXIgZGF0YVxuICBpZiAodHlwZW9mIHN0YXRzID09PSAndW5kZWZpbmVkJykge1xuICAgIGRhdGEgPSBicm93c2Vyc2xpc3QudXNhZ2UuZ2xvYmFsXG4gIH0gZWxzZSBpZiAoc3RhdHMgPT09ICdteSBzdGF0cycpIHtcbiAgICB2YXIgb3B0cyA9IHt9XG4gICAgb3B0cy5wYXRoID0gcGF0aC5yZXNvbHZlID8gcGF0aC5yZXNvbHZlKCcuJykgOiAnLidcbiAgICB2YXIgY3VzdG9tU3RhdHMgPSBlbnYuZ2V0U3RhdChvcHRzKVxuICAgIGlmICghY3VzdG9tU3RhdHMpIHtcbiAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcignQ3VzdG9tIHVzYWdlIHN0YXRpc3RpY3Mgd2FzIG5vdCBwcm92aWRlZCcpXG4gICAgfVxuICAgIGRhdGEgPSB7fVxuICAgIGZvciAodmFyIGJyb3dzZXIgaW4gY3VzdG9tU3RhdHMpIHtcbiAgICAgIGZpbGxVc2FnZShkYXRhLCBicm93c2VyLCBjdXN0b21TdGF0c1ticm93c2VyXSlcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHN0YXRzID09PSAnc3RyaW5nJykge1xuICAgIGlmIChzdGF0cy5sZW5ndGggPiAyKSB7XG4gICAgICBzdGF0cyA9IHN0YXRzLnRvTG93ZXJDYXNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHMgPSBzdGF0cy50b1VwcGVyQ2FzZSgpXG4gICAgfVxuICAgIGVudi5sb2FkQ291bnRyeShicm93c2Vyc2xpc3QudXNhZ2UsIHN0YXRzLCBicm93c2Vyc2xpc3QuZGF0YSlcbiAgICBkYXRhID0gYnJvd3NlcnNsaXN0LnVzYWdlW3N0YXRzXVxuICB9IGVsc2Uge1xuICAgIGlmICgnZGF0YUJ5QnJvd3NlcicgaW4gc3RhdHMpIHtcbiAgICAgIHN0YXRzID0gc3RhdHMuZGF0YUJ5QnJvd3NlclxuICAgIH1cbiAgICBkYXRhID0ge31cbiAgICBmb3IgKHZhciBuYW1lIGluIHN0YXRzKSB7XG4gICAgICBmb3IgKHZhciB2ZXJzaW9uIGluIHN0YXRzW25hbWVdKSB7XG4gICAgICAgIGRhdGFbbmFtZSArICcgJyArIHZlcnNpb25dID0gc3RhdHNbbmFtZV1bdmVyc2lvbl1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnJvd3NlcnMucmVkdWNlKGZ1bmN0aW9uIChhbGwsIGkpIHtcbiAgICB2YXIgdXNhZ2UgPSBkYXRhW2ldXG4gICAgaWYgKHVzYWdlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHVzYWdlID0gZGF0YVtpLnJlcGxhY2UoLyBcXFMrJC8sICcgMCcpXVxuICAgIH1cbiAgICByZXR1cm4gYWxsICsgKHVzYWdlIHx8IDApXG4gIH0sIDApXG59XG5cbmZ1bmN0aW9uIG5vZGVRdWVyeShjb250ZXh0LCBub2RlKSB7XG4gIHZhciBtYXRjaGVkID0gYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9ucy5maWx0ZXIoZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gaXNWZXJzaW9uc01hdGNoKGksIG5vZGUudmVyc2lvbilcbiAgfSlcbiAgaWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGNvbnRleHQuaWdub3JlVW5rbm93blZlcnNpb25zKSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgICAnVW5rbm93biB2ZXJzaW9uICcgKyBub2RlLnZlcnNpb24gKyAnIG9mIE5vZGUuanMnXG4gICAgICApXG4gICAgfVxuICB9XG4gIHJldHVybiBbJ25vZGUgJyArIG1hdGNoZWRbbWF0Y2hlZC5sZW5ndGggLSAxXV1cbn1cblxuZnVuY3Rpb24gc2luY2VRdWVyeShjb250ZXh0LCBub2RlKSB7XG4gIHZhciB5ZWFyID0gcGFyc2VJbnQobm9kZS55ZWFyKVxuICB2YXIgbW9udGggPSBwYXJzZUludChub2RlLm1vbnRoIHx8ICcwMScpIC0gMVxuICB2YXIgZGF5ID0gcGFyc2VJbnQobm9kZS5kYXkgfHwgJzAxJylcbiAgcmV0dXJuIGZpbHRlckJ5WWVhcihEYXRlLlVUQyh5ZWFyLCBtb250aCwgZGF5LCAwLCAwLCAwKSwgY29udGV4dClcbn1cblxuZnVuY3Rpb24gY292ZXJRdWVyeShjb250ZXh0LCBub2RlKSB7XG4gIHZhciBjb3ZlcmFnZSA9IHBhcnNlRmxvYXQobm9kZS5jb3ZlcmFnZSlcbiAgdmFyIHVzYWdlID0gYnJvd3NlcnNsaXN0LnVzYWdlLmdsb2JhbFxuICBpZiAobm9kZS5wbGFjZSkge1xuICAgIGlmIChub2RlLnBsYWNlLm1hdGNoKC9ebXlcXHMrc3RhdHMkL2kpKSB7XG4gICAgICBpZiAoIWNvbnRleHQuY3VzdG9tVXNhZ2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKCdDdXN0b20gdXNhZ2Ugc3RhdGlzdGljcyB3YXMgbm90IHByb3ZpZGVkJylcbiAgICAgIH1cbiAgICAgIHVzYWdlID0gY29udGV4dC5jdXN0b21Vc2FnZVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcGxhY2VcbiAgICAgIGlmIChub2RlLnBsYWNlLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBwbGFjZSA9IG5vZGUucGxhY2UudG9VcHBlckNhc2UoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGxhY2UgPSBub2RlLnBsYWNlLnRvTG93ZXJDYXNlKClcbiAgICAgIH1cbiAgICAgIGVudi5sb2FkQ291bnRyeShicm93c2Vyc2xpc3QudXNhZ2UsIHBsYWNlLCBicm93c2Vyc2xpc3QuZGF0YSlcbiAgICAgIHVzYWdlID0gYnJvd3NlcnNsaXN0LnVzYWdlW3BsYWNlXVxuICAgIH1cbiAgfVxuICB2YXIgdmVyc2lvbnMgPSBPYmplY3Qua2V5cyh1c2FnZSkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiB1c2FnZVtiXSAtIHVzYWdlW2FdXG4gIH0pXG4gIHZhciBjb3ZlcmFnZWQgPSAwXG4gIHZhciByZXN1bHQgPSBbXVxuICB2YXIgdmVyc2lvblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnNpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmVyc2lvbiA9IHZlcnNpb25zW2ldXG4gICAgaWYgKHVzYWdlW3ZlcnNpb25dID09PSAwKSBicmVha1xuICAgIGNvdmVyYWdlZCArPSB1c2FnZVt2ZXJzaW9uXVxuICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgaWYgKGNvdmVyYWdlZCA+PSBjb3ZlcmFnZSkgYnJlYWtcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbnZhciBRVUVSSUVTID0ge1xuICBsYXN0X21ham9yX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccyttYWpvclxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGFnZW50cykucmVkdWNlKGZ1bmN0aW9uIChzZWxlY3RlZCwgbmFtZSkge1xuICAgICAgICB2YXIgZGF0YSA9IGJ5TmFtZShuYW1lLCBjb250ZXh0KVxuICAgICAgICBpZiAoIWRhdGEpIHJldHVybiBzZWxlY3RlZFxuICAgICAgICB2YXIgbGlzdCA9IGdldE1ham9yVmVyc2lvbnMoZGF0YS5yZWxlYXNlZCwgbm9kZS52ZXJzaW9ucylcbiAgICAgICAgbGlzdCA9IGxpc3QubWFwKG5hbWVNYXBwZXIoZGF0YS5uYW1lKSlcbiAgICAgICAgaWYgKGRhdGEubmFtZSA9PT0gJ2FuZHJvaWQnKSB7XG4gICAgICAgICAgbGlzdCA9IGZpbHRlckFuZHJvaWQobGlzdCwgbm9kZS52ZXJzaW9ucywgY29udGV4dClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWQuY29uY2F0KGxpc3QpXG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIGxhc3RfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb25zJ10sXG4gICAgcmVnZXhwOiAvXmxhc3RcXHMrKFxcZCspXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoYWdlbnRzKS5yZWR1Y2UoZnVuY3Rpb24gKHNlbGVjdGVkLCBuYW1lKSB7XG4gICAgICAgIHZhciBkYXRhID0gYnlOYW1lKG5hbWUsIGNvbnRleHQpXG4gICAgICAgIGlmICghZGF0YSkgcmV0dXJuIHNlbGVjdGVkXG4gICAgICAgIHZhciBsaXN0ID0gZGF0YS5yZWxlYXNlZC5zbGljZSgtbm9kZS52ZXJzaW9ucylcbiAgICAgICAgbGlzdCA9IGxpc3QubWFwKG5hbWVNYXBwZXIoZGF0YS5uYW1lKSlcbiAgICAgICAgaWYgKGRhdGEubmFtZSA9PT0gJ2FuZHJvaWQnKSB7XG4gICAgICAgICAgbGlzdCA9IGZpbHRlckFuZHJvaWQobGlzdCwgbm9kZS52ZXJzaW9ucywgY29udGV4dClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWQuY29uY2F0KGxpc3QpXG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIGxhc3RfZWxlY3Ryb25fbWFqb3JfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb25zJ10sXG4gICAgcmVnZXhwOiAvXmxhc3RcXHMrKFxcZCspXFxzK2VsZWN0cm9uXFxzK21ham9yXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgdmFsaWRWZXJzaW9ucyA9IGdldE1ham9yVmVyc2lvbnMoT2JqZWN0LmtleXMoZTJjKSwgbm9kZS52ZXJzaW9ucylcbiAgICAgIHJldHVybiB2YWxpZFZlcnNpb25zLm1hcChmdW5jdGlvbiAoaSkge1xuICAgICAgICByZXR1cm4gJ2Nocm9tZSAnICsgZTJjW2ldXG4gICAgICB9KVxuICAgIH1cbiAgfSxcbiAgbGFzdF9ub2RlX21ham9yX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccytub2RlXFxzK21ham9yXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gZ2V0TWFqb3JWZXJzaW9ucyhicm93c2Vyc2xpc3Qubm9kZVZlcnNpb25zLCBub2RlLnZlcnNpb25zKS5tYXAoXG4gICAgICAgIGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuICdub2RlICcgKyB2ZXJzaW9uXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9XG4gIH0sXG4gIGxhc3RfYnJvd3Nlcl9tYWpvcl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnLCAnYnJvd3NlciddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccysoXFx3KylcXHMrbWFqb3JcXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHZhciB2YWxpZFZlcnNpb25zID0gZ2V0TWFqb3JWZXJzaW9ucyhkYXRhLnJlbGVhc2VkLCBub2RlLnZlcnNpb25zKVxuICAgICAgdmFyIGxpc3QgPSB2YWxpZFZlcnNpb25zLm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpXG4gICAgICBpZiAoZGF0YS5uYW1lID09PSAnYW5kcm9pZCcpIHtcbiAgICAgICAgbGlzdCA9IGZpbHRlckFuZHJvaWQobGlzdCwgbm9kZS52ZXJzaW9ucywgY29udGV4dClcbiAgICAgIH1cbiAgICAgIHJldHVybiBsaXN0XG4gICAgfVxuICB9LFxuICBsYXN0X2VsZWN0cm9uX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccytlbGVjdHJvblxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGUyYylcbiAgICAgICAgLnNsaWNlKC1ub2RlLnZlcnNpb25zKVxuICAgICAgICAubWFwKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgcmV0dXJuICdjaHJvbWUgJyArIGUyY1tpXVxuICAgICAgICB9KVxuICAgIH1cbiAgfSxcbiAgbGFzdF9ub2RlX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccytub2RlXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9uc1xuICAgICAgICAuc2xpY2UoLW5vZGUudmVyc2lvbnMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKHZlcnNpb24pIHtcbiAgICAgICAgICByZXR1cm4gJ25vZGUgJyArIHZlcnNpb25cbiAgICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIGxhc3RfYnJvd3Nlcl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnLCAnYnJvd3NlciddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccysoXFx3KylcXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHZhciBsaXN0ID0gZGF0YS5yZWxlYXNlZC5zbGljZSgtbm9kZS52ZXJzaW9ucykubWFwKG5hbWVNYXBwZXIoZGF0YS5uYW1lKSlcbiAgICAgIGlmIChkYXRhLm5hbWUgPT09ICdhbmRyb2lkJykge1xuICAgICAgICBsaXN0ID0gZmlsdGVyQW5kcm9pZChsaXN0LCBub2RlLnZlcnNpb25zLCBjb250ZXh0KVxuICAgICAgfVxuICAgICAgcmV0dXJuIGxpc3RcbiAgICB9XG4gIH0sXG4gIHVucmVsZWFzZWRfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9edW5yZWxlYXNlZFxccyt2ZXJzaW9ucyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoYWdlbnRzKS5yZWR1Y2UoZnVuY3Rpb24gKHNlbGVjdGVkLCBuYW1lKSB7XG4gICAgICAgIHZhciBkYXRhID0gYnlOYW1lKG5hbWUsIGNvbnRleHQpXG4gICAgICAgIGlmICghZGF0YSkgcmV0dXJuIHNlbGVjdGVkXG4gICAgICAgIHZhciBsaXN0ID0gZGF0YS52ZXJzaW9ucy5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YS5yZWxlYXNlZC5pbmRleE9mKHYpID09PSAtMVxuICAgICAgICB9KVxuICAgICAgICBsaXN0ID0gbGlzdC5tYXAobmFtZU1hcHBlcihkYXRhLm5hbWUpKVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWQuY29uY2F0KGxpc3QpXG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIHVucmVsZWFzZWRfZWxlY3Ryb25fdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9edW5yZWxlYXNlZFxccytlbGVjdHJvblxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9XG4gIH0sXG4gIHVucmVsZWFzZWRfYnJvd3Nlcl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsnYnJvd3NlciddLFxuICAgIHJlZ2V4cDogL151bnJlbGVhc2VkXFxzKyhcXHcrKVxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIGRhdGEgPSBjaGVja05hbWUobm9kZS5icm93c2VyLCBjb250ZXh0KVxuICAgICAgcmV0dXJuIGRhdGEudmVyc2lvbnNcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgIHJldHVybiBkYXRhLnJlbGVhc2VkLmluZGV4T2YodikgPT09IC0xXG4gICAgICAgIH0pXG4gICAgICAgIC5tYXAobmFtZU1hcHBlcihkYXRhLm5hbWUpKVxuICAgIH1cbiAgfSxcbiAgbGFzdF95ZWFyczoge1xuICAgIG1hdGNoZXM6IFsneWVhcnMnXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKi4/XFxkKylcXHMreWVhcnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHJldHVybiBmaWx0ZXJCeVllYXIoRGF0ZS5ub3coKSAtIFlFQVIgKiBub2RlLnllYXJzLCBjb250ZXh0KVxuICAgIH1cbiAgfSxcbiAgc2luY2VfeToge1xuICAgIG1hdGNoZXM6IFsneWVhciddLFxuICAgIHJlZ2V4cDogL15zaW5jZSAoXFxkKykkL2ksXG4gICAgc2VsZWN0OiBzaW5jZVF1ZXJ5XG4gIH0sXG4gIHNpbmNlX3lfbToge1xuICAgIG1hdGNoZXM6IFsneWVhcicsICdtb250aCddLFxuICAgIHJlZ2V4cDogL15zaW5jZSAoXFxkKyktKFxcZCspJC9pLFxuICAgIHNlbGVjdDogc2luY2VRdWVyeVxuICB9LFxuICBzaW5jZV95X21fZDoge1xuICAgIG1hdGNoZXM6IFsneWVhcicsICdtb250aCcsICdkYXknXSxcbiAgICByZWdleHA6IC9ec2luY2UgKFxcZCspLShcXGQrKS0oXFxkKykkL2ksXG4gICAgc2VsZWN0OiBzaW5jZVF1ZXJ5XG4gIH0sXG4gIHBvcHVsYXJpdHk6IHtcbiAgICBtYXRjaGVzOiBbJ3NpZ24nLCAncG9wdWxhcml0eSddLFxuICAgIHJlZ2V4cDogL14oPj0/fDw9PylcXHMqKFxcZCt8XFxkK1xcLlxcZCt8XFwuXFxkKyklJC8sXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIHBvcHVsYXJpdHkgPSBwYXJzZUZsb2F0KG5vZGUucG9wdWxhcml0eSlcbiAgICAgIHZhciB1c2FnZSA9IGJyb3dzZXJzbGlzdC51c2FnZS5nbG9iYWxcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyh1c2FnZSkucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZlcnNpb24pIHtcbiAgICAgICAgaWYgKG5vZGUuc2lnbiA9PT0gJz4nKSB7XG4gICAgICAgICAgaWYgKHVzYWdlW3ZlcnNpb25dID4gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPCcpIHtcbiAgICAgICAgICBpZiAodXNhZ2VbdmVyc2lvbl0gPCBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLnNpZ24gPT09ICc8PScpIHtcbiAgICAgICAgICBpZiAodXNhZ2VbdmVyc2lvbl0gPD0gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodXNhZ2VbdmVyc2lvbl0gPj0gcG9wdWxhcml0eSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICBwb3B1bGFyaXR5X2luX215X3N0YXRzOiB7XG4gICAgbWF0Y2hlczogWydzaWduJywgJ3BvcHVsYXJpdHknXSxcbiAgICByZWdleHA6IC9eKD49P3w8PT8pXFxzKihcXGQrfFxcZCtcXC5cXGQrfFxcLlxcZCspJVxccytpblxccytteVxccytzdGF0cyQvLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBwb3B1bGFyaXR5ID0gcGFyc2VGbG9hdChub2RlLnBvcHVsYXJpdHkpXG4gICAgICBpZiAoIWNvbnRleHQuY3VzdG9tVXNhZ2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKCdDdXN0b20gdXNhZ2Ugc3RhdGlzdGljcyB3YXMgbm90IHByb3ZpZGVkJylcbiAgICAgIH1cbiAgICAgIHZhciB1c2FnZSA9IGNvbnRleHQuY3VzdG9tVXNhZ2VcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyh1c2FnZSkucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZlcnNpb24pIHtcbiAgICAgICAgdmFyIHBlcmNlbnRhZ2UgPSB1c2FnZVt2ZXJzaW9uXVxuICAgICAgICBpZiAocGVyY2VudGFnZSA9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuc2lnbiA9PT0gJz4nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPiBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLnNpZ24gPT09ICc8Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlIDwgcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPD0nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPD0gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocGVyY2VudGFnZSA+PSBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIHBvcHVsYXJpdHlfaW5fY29uZmlnX3N0YXRzOiB7XG4gICAgbWF0Y2hlczogWydzaWduJywgJ3BvcHVsYXJpdHknLCAnY29uZmlnJ10sXG4gICAgcmVnZXhwOiAvXig+PT98PD0/KVxccyooXFxkK3xcXGQrXFwuXFxkK3xcXC5cXGQrKSVcXHMraW5cXHMrKFxcUyspXFxzK3N0YXRzJC8sXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIHBvcHVsYXJpdHkgPSBwYXJzZUZsb2F0KG5vZGUucG9wdWxhcml0eSlcbiAgICAgIHZhciBzdGF0cyA9IGVudi5sb2FkU3RhdChjb250ZXh0LCBub2RlLmNvbmZpZywgYnJvd3NlcnNsaXN0LmRhdGEpXG4gICAgICBpZiAoc3RhdHMpIHtcbiAgICAgICAgY29udGV4dC5jdXN0b21Vc2FnZSA9IHt9XG4gICAgICAgIGZvciAodmFyIGJyb3dzZXIgaW4gc3RhdHMpIHtcbiAgICAgICAgICBmaWxsVXNhZ2UoY29udGV4dC5jdXN0b21Vc2FnZSwgYnJvd3Nlciwgc3RhdHNbYnJvd3Nlcl0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghY29udGV4dC5jdXN0b21Vc2FnZSkge1xuICAgICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoJ0N1c3RvbSB1c2FnZSBzdGF0aXN0aWNzIHdhcyBub3QgcHJvdmlkZWQnKVxuICAgICAgfVxuICAgICAgdmFyIHVzYWdlID0gY29udGV4dC5jdXN0b21Vc2FnZVxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHVzYWdlKS5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgdmVyc2lvbikge1xuICAgICAgICB2YXIgcGVyY2VudGFnZSA9IHVzYWdlW3ZlcnNpb25dXG4gICAgICAgIGlmIChwZXJjZW50YWdlID09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5zaWduID09PSAnPicpIHtcbiAgICAgICAgICBpZiAocGVyY2VudGFnZSA+IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuc2lnbiA9PT0gJzwnKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPCBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLnNpZ24gPT09ICc8PScpIHtcbiAgICAgICAgICBpZiAocGVyY2VudGFnZSA8PSBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChwZXJjZW50YWdlID49IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgIH0sIFtdKVxuICAgIH1cbiAgfSxcbiAgcG9wdWxhcml0eV9pbl9wbGFjZToge1xuICAgIG1hdGNoZXM6IFsnc2lnbicsICdwb3B1bGFyaXR5JywgJ3BsYWNlJ10sXG4gICAgcmVnZXhwOiAvXig+PT98PD0/KVxccyooXFxkK3xcXGQrXFwuXFxkK3xcXC5cXGQrKSVcXHMraW5cXHMrKChhbHQtKT9cXHdcXHcpJC8sXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIHBvcHVsYXJpdHkgPSBwYXJzZUZsb2F0KG5vZGUucG9wdWxhcml0eSlcbiAgICAgIHZhciBwbGFjZSA9IG5vZGUucGxhY2VcbiAgICAgIGlmIChwbGFjZS5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgcGxhY2UgPSBwbGFjZS50b1VwcGVyQ2FzZSgpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwbGFjZSA9IHBsYWNlLnRvTG93ZXJDYXNlKClcbiAgICAgIH1cbiAgICAgIGVudi5sb2FkQ291bnRyeShicm93c2Vyc2xpc3QudXNhZ2UsIHBsYWNlLCBicm93c2Vyc2xpc3QuZGF0YSlcbiAgICAgIHZhciB1c2FnZSA9IGJyb3dzZXJzbGlzdC51c2FnZVtwbGFjZV1cbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyh1c2FnZSkucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZlcnNpb24pIHtcbiAgICAgICAgdmFyIHBlcmNlbnRhZ2UgPSB1c2FnZVt2ZXJzaW9uXVxuICAgICAgICBpZiAocGVyY2VudGFnZSA9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuc2lnbiA9PT0gJz4nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPiBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLnNpZ24gPT09ICc8Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlIDwgcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPD0nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPD0gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocGVyY2VudGFnZSA+PSBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIGNvdmVyOiB7XG4gICAgbWF0Y2hlczogWydjb3ZlcmFnZSddLFxuICAgIHJlZ2V4cDogL15jb3ZlclxccysoXFxkK3xcXGQrXFwuXFxkK3xcXC5cXGQrKSUkL2ksXG4gICAgc2VsZWN0OiBjb3ZlclF1ZXJ5XG4gIH0sXG4gIGNvdmVyX2luOiB7XG4gICAgbWF0Y2hlczogWydjb3ZlcmFnZScsICdwbGFjZSddLFxuICAgIHJlZ2V4cDogL15jb3ZlclxccysoXFxkK3xcXGQrXFwuXFxkK3xcXC5cXGQrKSVcXHMraW5cXHMrKG15XFxzK3N0YXRzfChhbHQtKT9cXHdcXHcpJC9pLFxuICAgIHNlbGVjdDogY292ZXJRdWVyeVxuICB9LFxuICBzdXBwb3J0czoge1xuICAgIG1hdGNoZXM6IFsnZmVhdHVyZSddLFxuICAgIHJlZ2V4cDogL15zdXBwb3J0c1xccysoW1xcdy1dKykkLyxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICBlbnYubG9hZEZlYXR1cmUoYnJvd3NlcnNsaXN0LmNhY2hlLCBub2RlLmZlYXR1cmUpXG4gICAgICB2YXIgZmVhdHVyZXMgPSBicm93c2Vyc2xpc3QuY2FjaGVbbm9kZS5mZWF0dXJlXVxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGZlYXR1cmVzKS5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgdmVyc2lvbikge1xuICAgICAgICB2YXIgZmxhZ3MgPSBmZWF0dXJlc1t2ZXJzaW9uXVxuICAgICAgICBpZiAoZmxhZ3MuaW5kZXhPZigneScpID49IDAgfHwgZmxhZ3MuaW5kZXhPZignYScpID49IDApIHtcbiAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgIH0sIFtdKVxuICAgIH1cbiAgfSxcbiAgZWxlY3Ryb25fcmFuZ2U6IHtcbiAgICBtYXRjaGVzOiBbJ2Zyb20nLCAndG8nXSxcbiAgICByZWdleHA6IC9eZWxlY3Ryb25cXHMrKFtcXGQuXSspXFxzKi1cXHMqKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBmcm9tVG9Vc2UgPSBub3JtYWxpemVFbGVjdHJvbihub2RlLmZyb20pXG4gICAgICB2YXIgdG9Ub1VzZSA9IG5vcm1hbGl6ZUVsZWN0cm9uKG5vZGUudG8pXG4gICAgICB2YXIgZnJvbSA9IHBhcnNlRmxvYXQobm9kZS5mcm9tKVxuICAgICAgdmFyIHRvID0gcGFyc2VGbG9hdChub2RlLnRvKVxuICAgICAgaWYgKCFlMmNbZnJvbVRvVXNlXSkge1xuICAgICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoJ1Vua25vd24gdmVyc2lvbiAnICsgZnJvbSArICcgb2YgZWxlY3Ryb24nKVxuICAgICAgfVxuICAgICAgaWYgKCFlMmNbdG9Ub1VzZV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKCdVbmtub3duIHZlcnNpb24gJyArIHRvICsgJyBvZiBlbGVjdHJvbicpXG4gICAgICB9XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoZTJjKVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgdmFyIHBhcnNlZCA9IHBhcnNlRmxvYXQoaSlcbiAgICAgICAgICByZXR1cm4gcGFyc2VkID49IGZyb20gJiYgcGFyc2VkIDw9IHRvXG4gICAgICAgIH0pXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICByZXR1cm4gJ2Nocm9tZSAnICsgZTJjW2ldXG4gICAgICAgIH0pXG4gICAgfVxuICB9LFxuICBub2RlX3JhbmdlOiB7XG4gICAgbWF0Y2hlczogWydmcm9tJywgJ3RvJ10sXG4gICAgcmVnZXhwOiAvXm5vZGVcXHMrKFtcXGQuXSspXFxzKi1cXHMqKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHJldHVybiBicm93c2Vyc2xpc3Qubm9kZVZlcnNpb25zXG4gICAgICAgIC5maWx0ZXIoc2VtdmVyRmlsdGVyTG9vc2UoJz49Jywgbm9kZS5mcm9tKSlcbiAgICAgICAgLmZpbHRlcihzZW12ZXJGaWx0ZXJMb29zZSgnPD0nLCBub2RlLnRvKSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAodikge1xuICAgICAgICAgIHJldHVybiAnbm9kZSAnICsgdlxuICAgICAgICB9KVxuICAgIH1cbiAgfSxcbiAgYnJvd3Nlcl9yYW5nZToge1xuICAgIG1hdGNoZXM6IFsnYnJvd3NlcicsICdmcm9tJywgJ3RvJ10sXG4gICAgcmVnZXhwOiAvXihcXHcrKVxccysoW1xcZC5dKylcXHMqLVxccyooW1xcZC5dKykkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIGRhdGEgPSBjaGVja05hbWUobm9kZS5icm93c2VyLCBjb250ZXh0KVxuICAgICAgdmFyIGZyb20gPSBwYXJzZUZsb2F0KG5vcm1hbGl6ZVZlcnNpb24oZGF0YSwgbm9kZS5mcm9tKSB8fCBub2RlLmZyb20pXG4gICAgICB2YXIgdG8gPSBwYXJzZUZsb2F0KG5vcm1hbGl6ZVZlcnNpb24oZGF0YSwgbm9kZS50bykgfHwgbm9kZS50bylcbiAgICAgIGZ1bmN0aW9uIGZpbHRlcih2KSB7XG4gICAgICAgIHZhciBwYXJzZWQgPSBwYXJzZUZsb2F0KHYpXG4gICAgICAgIHJldHVybiBwYXJzZWQgPj0gZnJvbSAmJiBwYXJzZWQgPD0gdG9cbiAgICAgIH1cbiAgICAgIHJldHVybiBkYXRhLnJlbGVhc2VkLmZpbHRlcihmaWx0ZXIpLm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpXG4gICAgfVxuICB9LFxuICBlbGVjdHJvbl9yYXk6IHtcbiAgICBtYXRjaGVzOiBbJ3NpZ24nLCAndmVyc2lvbiddLFxuICAgIHJlZ2V4cDogL15lbGVjdHJvblxccyooPj0/fDw9PylcXHMqKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciB2ZXJzaW9uVG9Vc2UgPSBub3JtYWxpemVFbGVjdHJvbihub2RlLnZlcnNpb24pXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoZTJjKVxuICAgICAgICAuZmlsdGVyKGdlbmVyYXRlRmlsdGVyKG5vZGUuc2lnbiwgdmVyc2lvblRvVXNlKSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoaSkge1xuICAgICAgICAgIHJldHVybiAnY2hyb21lICcgKyBlMmNbaV1cbiAgICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIG5vZGVfcmF5OiB7XG4gICAgbWF0Y2hlczogWydzaWduJywgJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9ebm9kZVxccyooPj0/fDw9PylcXHMqKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHJldHVybiBicm93c2Vyc2xpc3Qubm9kZVZlcnNpb25zXG4gICAgICAgIC5maWx0ZXIoZ2VuZXJhdGVTZW12ZXJGaWx0ZXIobm9kZS5zaWduLCBub2RlLnZlcnNpb24pKVxuICAgICAgICAubWFwKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgcmV0dXJuICdub2RlICcgKyB2XG4gICAgICAgIH0pXG4gICAgfVxuICB9LFxuICBicm93c2VyX3JheToge1xuICAgIG1hdGNoZXM6IFsnYnJvd3NlcicsICdzaWduJywgJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9eKFxcdyspXFxzKig+PT98PD0/KVxccyooW1xcZC5dKykkLyxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgdmVyc2lvbiA9IG5vZGUudmVyc2lvblxuICAgICAgdmFyIGRhdGEgPSBjaGVja05hbWUobm9kZS5icm93c2VyLCBjb250ZXh0KVxuICAgICAgdmFyIGFsaWFzID0gYnJvd3NlcnNsaXN0LnZlcnNpb25BbGlhc2VzW2RhdGEubmFtZV1bdmVyc2lvbl1cbiAgICAgIGlmIChhbGlhcykgdmVyc2lvbiA9IGFsaWFzXG4gICAgICByZXR1cm4gZGF0YS5yZWxlYXNlZFxuICAgICAgICAuZmlsdGVyKGdlbmVyYXRlRmlsdGVyKG5vZGUuc2lnbiwgdmVyc2lvbikpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YS5uYW1lICsgJyAnICsgdlxuICAgICAgICB9KVxuICAgIH1cbiAgfSxcbiAgZmlyZWZveF9lc3I6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eKGZpcmVmb3h8ZmZ8ZngpXFxzK2VzciQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBbJ2ZpcmVmb3ggMTAyJ11cbiAgICB9XG4gIH0sXG4gIG9wZXJhX21pbmlfYWxsOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvKG9wZXJhbWluaXxvcF9taW5pKVxccythbGwvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBbJ29wX21pbmkgYWxsJ11cbiAgICB9XG4gIH0sXG4gIGVsZWN0cm9uX3ZlcnNpb246IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9eZWxlY3Ryb25cXHMrKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciB2ZXJzaW9uVG9Vc2UgPSBub3JtYWxpemVFbGVjdHJvbihub2RlLnZlcnNpb24pXG4gICAgICB2YXIgY2hyb21lID0gZTJjW3ZlcnNpb25Ub1VzZV1cbiAgICAgIGlmICghY2hyb21lKSB7XG4gICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICAgICAnVW5rbm93biB2ZXJzaW9uICcgKyBub2RlLnZlcnNpb24gKyAnIG9mIGVsZWN0cm9uJ1xuICAgICAgICApXG4gICAgICB9XG4gICAgICByZXR1cm4gWydjaHJvbWUgJyArIGNocm9tZV1cbiAgICB9XG4gIH0sXG4gIG5vZGVfbWFqb3JfdmVyc2lvbjoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbiddLFxuICAgIHJlZ2V4cDogL15ub2RlXFxzKyhcXGQrKSQvaSxcbiAgICBzZWxlY3Q6IG5vZGVRdWVyeVxuICB9LFxuICBub2RlX21pbm9yX3ZlcnNpb246IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9ebm9kZVxccysoXFxkK1xcLlxcZCspJC9pLFxuICAgIHNlbGVjdDogbm9kZVF1ZXJ5XG4gIH0sXG4gIG5vZGVfcGF0Y2hfdmVyc2lvbjoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbiddLFxuICAgIHJlZ2V4cDogL15ub2RlXFxzKyhcXGQrXFwuXFxkK1xcLlxcZCspJC9pLFxuICAgIHNlbGVjdDogbm9kZVF1ZXJ5XG4gIH0sXG4gIGN1cnJlbnRfbm9kZToge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogL15jdXJyZW50XFxzK25vZGUkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgcmV0dXJuIFtlbnYuY3VycmVudE5vZGUocmVzb2x2ZSwgY29udGV4dCldXG4gICAgfVxuICB9LFxuICBtYWludGFpbmVkX25vZGU6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9ebWFpbnRhaW5lZFxccytub2RlXFxzK3ZlcnNpb25zJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpXG4gICAgICB2YXIgcXVlcmllcyA9IE9iamVjdC5rZXlzKGpzRU9MKVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgbm93IDwgRGF0ZS5wYXJzZShqc0VPTFtrZXldLmVuZCkgJiZcbiAgICAgICAgICAgIG5vdyA+IERhdGUucGFyc2UoanNFT0xba2V5XS5zdGFydCkgJiZcbiAgICAgICAgICAgIGlzRW9sUmVsZWFzZWQoa2V5KVxuICAgICAgICAgIClcbiAgICAgICAgfSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgcmV0dXJuICdub2RlICcgKyBrZXkuc2xpY2UoMSlcbiAgICAgICAgfSlcbiAgICAgIHJldHVybiByZXNvbHZlKHF1ZXJpZXMsIGNvbnRleHQpXG4gICAgfVxuICB9LFxuICBwaGFudG9tanNfMV85OiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXnBoYW50b21qc1xccysxLjkkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gWydzYWZhcmkgNSddXG4gICAgfVxuICB9LFxuICBwaGFudG9tanNfMl8xOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXnBoYW50b21qc1xccysyLjEkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gWydzYWZhcmkgNiddXG4gICAgfVxuICB9LFxuICBicm93c2VyX3ZlcnNpb246IHtcbiAgICBtYXRjaGVzOiBbJ2Jyb3dzZXInLCAndmVyc2lvbiddLFxuICAgIHJlZ2V4cDogL14oXFx3KylcXHMrKHRwfFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciB2ZXJzaW9uID0gbm9kZS52ZXJzaW9uXG4gICAgICBpZiAoL150cCQvaS50ZXN0KHZlcnNpb24pKSB2ZXJzaW9uID0gJ1RQJ1xuICAgICAgdmFyIGRhdGEgPSBjaGVja05hbWUobm9kZS5icm93c2VyLCBjb250ZXh0KVxuICAgICAgdmFyIGFsaWFzID0gbm9ybWFsaXplVmVyc2lvbihkYXRhLCB2ZXJzaW9uKVxuICAgICAgaWYgKGFsaWFzKSB7XG4gICAgICAgIHZlcnNpb24gPSBhbGlhc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHZlcnNpb24uaW5kZXhPZignLicpID09PSAtMSkge1xuICAgICAgICAgIGFsaWFzID0gdmVyc2lvbiArICcuMCdcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhbGlhcyA9IHZlcnNpb24ucmVwbGFjZSgvXFwuMCQvLCAnJylcbiAgICAgICAgfVxuICAgICAgICBhbGlhcyA9IG5vcm1hbGl6ZVZlcnNpb24oZGF0YSwgYWxpYXMpXG4gICAgICAgIGlmIChhbGlhcykge1xuICAgICAgICAgIHZlcnNpb24gPSBhbGlhc1xuICAgICAgICB9IGVsc2UgaWYgKGNvbnRleHQuaWdub3JlVW5rbm93blZlcnNpb25zKSB7XG4gICAgICAgICAgcmV0dXJuIFtdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgICAgICAgJ1Vua25vd24gdmVyc2lvbiAnICsgdmVyc2lvbiArICcgb2YgJyArIG5vZGUuYnJvd3NlclxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIFtkYXRhLm5hbWUgKyAnICcgKyB2ZXJzaW9uXVxuICAgIH1cbiAgfSxcbiAgYnJvd3NlcnNsaXN0X2NvbmZpZzoge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogL15icm93c2Vyc2xpc3QgY29uZmlnJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgIHJldHVybiBicm93c2Vyc2xpc3QodW5kZWZpbmVkLCBjb250ZXh0KVxuICAgIH1cbiAgfSxcbiAgZXh0ZW5kczoge1xuICAgIG1hdGNoZXM6IFsnY29uZmlnJ10sXG4gICAgcmVnZXhwOiAvXmV4dGVuZHMgKC4rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZShlbnYubG9hZFF1ZXJpZXMoY29udGV4dCwgbm9kZS5jb25maWcpLCBjb250ZXh0KVxuICAgIH1cbiAgfSxcbiAgZGVmYXVsdHM6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eZGVmYXVsdHMkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgcmV0dXJuIHJlc29sdmUoYnJvd3NlcnNsaXN0LmRlZmF1bHRzLCBjb250ZXh0KVxuICAgIH1cbiAgfSxcbiAgZGVhZDoge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogL15kZWFkJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgIHZhciBkZWFkID0gW1xuICAgICAgICAnQmFpZHUgPj0gMCcsXG4gICAgICAgICdpZSA8PSAxMScsXG4gICAgICAgICdpZV9tb2IgPD0gMTEnLFxuICAgICAgICAnYmIgPD0gMTAnLFxuICAgICAgICAnb3BfbW9iIDw9IDEyLjEnLFxuICAgICAgICAnc2Ftc3VuZyA0J1xuICAgICAgXVxuICAgICAgcmV0dXJuIHJlc29sdmUoZGVhZCwgY29udGV4dClcbiAgICB9XG4gIH0sXG4gIHVua25vd246IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eKFxcdyspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIGlmIChieU5hbWUobm9kZS5xdWVyeSwgY29udGV4dCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgICAgICdTcGVjaWZ5IHZlcnNpb25zIGluIEJyb3dzZXJzbGlzdCBxdWVyeSBmb3IgYnJvd3NlciAnICsgbm9kZS5xdWVyeVxuICAgICAgICApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyB1bmtub3duUXVlcnkobm9kZS5xdWVyeSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gR2V0IGFuZCBjb252ZXJ0IENhbiBJIFVzZSBkYXRhXG5cbjsoZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBuYW1lIGluIGFnZW50cykge1xuICAgIHZhciBicm93c2VyID0gYWdlbnRzW25hbWVdXG4gICAgYnJvd3NlcnNsaXN0LmRhdGFbbmFtZV0gPSB7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgdmVyc2lvbnM6IG5vcm1hbGl6ZShhZ2VudHNbbmFtZV0udmVyc2lvbnMpLFxuICAgICAgcmVsZWFzZWQ6IG5vcm1hbGl6ZShhZ2VudHNbbmFtZV0udmVyc2lvbnMuc2xpY2UoMCwgLTMpKSxcbiAgICAgIHJlbGVhc2VEYXRlOiBhZ2VudHNbbmFtZV0ucmVsZWFzZV9kYXRlXG4gICAgfVxuICAgIGZpbGxVc2FnZShicm93c2Vyc2xpc3QudXNhZ2UuZ2xvYmFsLCBuYW1lLCBicm93c2VyLnVzYWdlX2dsb2JhbClcblxuICAgIGJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlc1tuYW1lXSA9IHt9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBicm93c2VyLnZlcnNpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZnVsbCA9IGJyb3dzZXIudmVyc2lvbnNbaV1cbiAgICAgIGlmICghZnVsbCkgY29udGludWVcblxuICAgICAgaWYgKGZ1bGwuaW5kZXhPZignLScpICE9PSAtMSkge1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBmdWxsLnNwbGl0KCctJylcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBpbnRlcnZhbC5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlc1tuYW1lXVtpbnRlcnZhbFtqXV0gPSBmdWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBicm93c2Vyc2xpc3QudmVyc2lvbkFsaWFzZXMub3BfbW9iWyc1OSddID0gJzU4J1xuXG4gIGJyb3dzZXJzbGlzdC5ub2RlVmVyc2lvbnMgPSBqc1JlbGVhc2VzLm1hcChmdW5jdGlvbiAocmVsZWFzZSkge1xuICAgIHJldHVybiByZWxlYXNlLnZlcnNpb25cbiAgfSlcbn0pKClcblxubW9kdWxlLmV4cG9ydHMgPSBicm93c2Vyc2xpc3RcbiIsInZhciBBTkRfUkVHRVhQID0gL15cXHMrYW5kXFxzKyguKikvaVxudmFyIE9SX1JFR0VYUCA9IC9eKD86LFxccyp8XFxzK29yXFxzKykoLiopL2lcblxuZnVuY3Rpb24gZmxhdHRlbihhcnJheSkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyYXkpKSByZXR1cm4gW2FycmF5XVxuICByZXR1cm4gYXJyYXkucmVkdWNlKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuIGEuY29uY2F0KGZsYXR0ZW4oYikpXG4gIH0sIFtdKVxufVxuXG5mdW5jdGlvbiBmaW5kKHN0cmluZywgcHJlZGljYXRlKSB7XG4gIGZvciAodmFyIG4gPSAxLCBtYXggPSBzdHJpbmcubGVuZ3RoOyBuIDw9IG1heDsgbisrKSB7XG4gICAgdmFyIHBhcnNlZCA9IHN0cmluZy5zdWJzdHIoLW4sIG4pXG4gICAgaWYgKHByZWRpY2F0ZShwYXJzZWQsIG4sIG1heCkpIHtcbiAgICAgIHJldHVybiBzdHJpbmcuc2xpY2UoMCwgLW4pXG4gICAgfVxuICB9XG4gIHJldHVybiAnJ1xufVxuXG5mdW5jdGlvbiBtYXRjaFF1ZXJ5KGFsbCwgcXVlcnkpIHtcbiAgdmFyIG5vZGUgPSB7IHF1ZXJ5OiBxdWVyeSB9XG4gIGlmIChxdWVyeS5pbmRleE9mKCdub3QgJykgPT09IDApIHtcbiAgICBub2RlLm5vdCA9IHRydWVcbiAgICBxdWVyeSA9IHF1ZXJ5LnNsaWNlKDQpXG4gIH1cblxuICBmb3IgKHZhciBuYW1lIGluIGFsbCkge1xuICAgIHZhciB0eXBlID0gYWxsW25hbWVdXG4gICAgdmFyIG1hdGNoID0gcXVlcnkubWF0Y2godHlwZS5yZWdleHApXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBub2RlLnR5cGUgPSBuYW1lXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGUubWF0Y2hlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBub2RlW3R5cGUubWF0Y2hlc1tpXV0gPSBtYXRjaFtpICsgMV1cbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlXG4gICAgfVxuICB9XG5cbiAgbm9kZS50eXBlID0gJ3Vua25vd24nXG4gIHJldHVybiBub2RlXG59XG5cbmZ1bmN0aW9uIG1hdGNoQmxvY2soYWxsLCBzdHJpbmcsIHFzKSB7XG4gIHZhciBub2RlXG4gIHJldHVybiBmaW5kKHN0cmluZywgZnVuY3Rpb24gKHBhcnNlZCwgbiwgbWF4KSB7XG4gICAgaWYgKEFORF9SRUdFWFAudGVzdChwYXJzZWQpKSB7XG4gICAgICBub2RlID0gbWF0Y2hRdWVyeShhbGwsIHBhcnNlZC5tYXRjaChBTkRfUkVHRVhQKVsxXSlcbiAgICAgIG5vZGUuY29tcG9zZSA9ICdhbmQnXG4gICAgICBxcy51bnNoaWZ0KG5vZGUpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0gZWxzZSBpZiAoT1JfUkVHRVhQLnRlc3QocGFyc2VkKSkge1xuICAgICAgbm9kZSA9IG1hdGNoUXVlcnkoYWxsLCBwYXJzZWQubWF0Y2goT1JfUkVHRVhQKVsxXSlcbiAgICAgIG5vZGUuY29tcG9zZSA9ICdvcidcbiAgICAgIHFzLnVuc2hpZnQobm9kZSlcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSBlbHNlIGlmIChuID09PSBtYXgpIHtcbiAgICAgIG5vZGUgPSBtYXRjaFF1ZXJ5KGFsbCwgcGFyc2VkLnRyaW0oKSlcbiAgICAgIG5vZGUuY29tcG9zZSA9ICdvcidcbiAgICAgIHFzLnVuc2hpZnQobm9kZSlcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHJldHVybiBmYWxzZVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlKGFsbCwgcXVlcmllcykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkocXVlcmllcykpIHF1ZXJpZXMgPSBbcXVlcmllc11cbiAgcmV0dXJuIGZsYXR0ZW4oXG4gICAgcXVlcmllcy5tYXAoZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICB2YXIgcXMgPSBbXVxuICAgICAgZG8ge1xuICAgICAgICBibG9jayA9IG1hdGNoQmxvY2soYWxsLCBibG9jaywgcXMpXG4gICAgICB9IHdoaWxlIChibG9jaylcbiAgICAgIHJldHVybiBxc1xuICAgIH0pXG4gIClcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEdldEludHJpbnNpYyA9IHJlcXVpcmUoJ2dldC1pbnRyaW5zaWMnKTtcblxudmFyIGNhbGxCaW5kID0gcmVxdWlyZSgnLi8nKTtcblxudmFyICRpbmRleE9mID0gY2FsbEJpbmQoR2V0SW50cmluc2ljKCdTdHJpbmcucHJvdG90eXBlLmluZGV4T2YnKSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY2FsbEJvdW5kSW50cmluc2ljKG5hbWUsIGFsbG93TWlzc2luZykge1xuXHR2YXIgaW50cmluc2ljID0gR2V0SW50cmluc2ljKG5hbWUsICEhYWxsb3dNaXNzaW5nKTtcblx0aWYgKHR5cGVvZiBpbnRyaW5zaWMgPT09ICdmdW5jdGlvbicgJiYgJGluZGV4T2YobmFtZSwgJy5wcm90b3R5cGUuJykgPiAtMSkge1xuXHRcdHJldHVybiBjYWxsQmluZChpbnRyaW5zaWMpO1xuXHR9XG5cdHJldHVybiBpbnRyaW5zaWM7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJ2Z1bmN0aW9uLWJpbmQnKTtcbnZhciBHZXRJbnRyaW5zaWMgPSByZXF1aXJlKCdnZXQtaW50cmluc2ljJyk7XG5cbnZhciAkYXBwbHkgPSBHZXRJbnRyaW5zaWMoJyVGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHklJyk7XG52YXIgJGNhbGwgPSBHZXRJbnRyaW5zaWMoJyVGdW5jdGlvbi5wcm90b3R5cGUuY2FsbCUnKTtcbnZhciAkcmVmbGVjdEFwcGx5ID0gR2V0SW50cmluc2ljKCclUmVmbGVjdC5hcHBseSUnLCB0cnVlKSB8fCBiaW5kLmNhbGwoJGNhbGwsICRhcHBseSk7XG5cbnZhciAkZ09QRCA9IEdldEludHJpbnNpYygnJU9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IlJywgdHJ1ZSk7XG52YXIgJGRlZmluZVByb3BlcnR5ID0gR2V0SW50cmluc2ljKCclT2JqZWN0LmRlZmluZVByb3BlcnR5JScsIHRydWUpO1xudmFyICRtYXggPSBHZXRJbnRyaW5zaWMoJyVNYXRoLm1heCUnKTtcblxuaWYgKCRkZWZpbmVQcm9wZXJ0eSkge1xuXHR0cnkge1xuXHRcdCRkZWZpbmVQcm9wZXJ0eSh7fSwgJ2EnLCB7IHZhbHVlOiAxIH0pO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0Ly8gSUUgOCBoYXMgYSBicm9rZW4gZGVmaW5lUHJvcGVydHlcblx0XHQkZGVmaW5lUHJvcGVydHkgPSBudWxsO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY2FsbEJpbmQob3JpZ2luYWxGdW5jdGlvbikge1xuXHR2YXIgZnVuYyA9ICRyZWZsZWN0QXBwbHkoYmluZCwgJGNhbGwsIGFyZ3VtZW50cyk7XG5cdGlmICgkZ09QRCAmJiAkZGVmaW5lUHJvcGVydHkpIHtcblx0XHR2YXIgZGVzYyA9ICRnT1BEKGZ1bmMsICdsZW5ndGgnKTtcblx0XHRpZiAoZGVzYy5jb25maWd1cmFibGUpIHtcblx0XHRcdC8vIG9yaWdpbmFsIGxlbmd0aCwgcGx1cyB0aGUgcmVjZWl2ZXIsIG1pbnVzIGFueSBhZGRpdGlvbmFsIGFyZ3VtZW50cyAoYWZ0ZXIgdGhlIHJlY2VpdmVyKVxuXHRcdFx0JGRlZmluZVByb3BlcnR5KFxuXHRcdFx0XHRmdW5jLFxuXHRcdFx0XHQnbGVuZ3RoJyxcblx0XHRcdFx0eyB2YWx1ZTogMSArICRtYXgoMCwgb3JpZ2luYWxGdW5jdGlvbi5sZW5ndGggLSAoYXJndW1lbnRzLmxlbmd0aCAtIDEpKSB9XG5cdFx0XHQpO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gZnVuYztcbn07XG5cbnZhciBhcHBseUJpbmQgPSBmdW5jdGlvbiBhcHBseUJpbmQoKSB7XG5cdHJldHVybiAkcmVmbGVjdEFwcGx5KGJpbmQsICRhcHBseSwgYXJndW1lbnRzKTtcbn07XG5cbmlmICgkZGVmaW5lUHJvcGVydHkpIHtcblx0JGRlZmluZVByb3BlcnR5KG1vZHVsZS5leHBvcnRzLCAnYXBwbHknLCB7IHZhbHVlOiBhcHBseUJpbmQgfSk7XG59IGVsc2Uge1xuXHRtb2R1bGUuZXhwb3J0cy5hcHBseSA9IGFwcGx5QmluZDtcbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtBOntBOntKOjAuMDEzMTIxNyxEOjAuMDA2MjExNTIsRTowLjA1ODEyNDYsRjowLjA3NzQ5OTUsQTowLjAwOTY4NzQzLEI6MC41NzE1NTksXCI5QlwiOjAuMDA5Mjk4fSxCOlwibXNcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIjlCXCIsXCJKXCIsXCJEXCIsXCJFXCIsXCJGXCIsXCJBXCIsXCJCXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJJRVwiLEY6e1wiOUJcIjo5NjIzMjMyMDAsSjo5OTg4NzA0MDAsRDoxMTYxMTI5NjAwLEU6MTIzNzQyMDgwMCxGOjEzMDAwNjA4MDAsQToxMzQ2NzE2ODAwLEI6MTM4MTk2ODAwMH19LEI6e0E6e0M6MC4wMDM3NzMsSzowLjAwNDI2NyxMOjAuMDA0MjY4LEc6MC4wMDM3NzMsTTowLjAwMzcwMixOOjAuMDAzNzczLE86MC4wMTUwOTIsUDowLFE6MC4wMDQyOTgsUjowLjAwOTQ0LFM6MC4wMDQwNDMsVDowLjAwMzc3MyxVOjAuMDAzNzczLFY6MC4wMDM5NzQsVzowLjAwMzkwMSxYOjAuMDA0MzE4LFk6MC4wMDM3NzMsWjowLjAwNDExOCxhOjAuMDAzOTM5LGI6MC4wMDc1NDYsZTowLjAwNDExOCxmOjAuMDAzOTM5LGc6MC4wMDM4MDEsaDowLjAwMzkwMSxpOjAuMDAzODU1LGo6MC4wMDM5MjksazowLjAwMzkwMSxsOjAuMDAzNzczLG06MC4wMDc1NDYsbjowLjAwMzc3MyxvOjAuMDExMzE5LHA6MC4wMTEzMTkscTowLjAxODg2NSxyOjAuMDMzOTU3LGM6MS4xMzk0NSxIOjIuODUyMzl9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiQ1wiLFwiS1wiLFwiTFwiLFwiR1wiLFwiTVwiLFwiTlwiLFwiT1wiLFwiUFwiLFwiUVwiLFwiUlwiLFwiU1wiLFwiVFwiLFwiVVwiLFwiVlwiLFwiV1wiLFwiWFwiLFwiWVwiLFwiWlwiLFwiYVwiLFwiYlwiLFwiZVwiLFwiZlwiLFwiZ1wiLFwiaFwiLFwiaVwiLFwialwiLFwia1wiLFwibFwiLFwibVwiLFwiblwiLFwib1wiLFwicFwiLFwicVwiLFwiclwiLFwiY1wiLFwiSFwiLFwiXCIsXCJcIixcIlwiXSxFOlwiRWRnZVwiLEY6e0M6MTQzODEyODAwMCxLOjE0NDcyODY0MDAsTDoxNDcwMDk2MDAwLEc6MTQ5MTg2ODgwMCxNOjE1MDgxOTg0MDAsTjoxNTI1MDQ2NDAwLE86MTU0MjA2NzIwMCxQOjE1NzkwNDY0MDAsUToxNTgxMDMzNjAwLFI6MTU4NjczNjAwMCxTOjE1OTAwMTkyMDAsVDoxNTk0ODU3NjAwLFU6MTU5ODQ4NjQwMCxWOjE2MDIyMDE2MDAsVzoxNjA1ODMwNDAwLFg6MTYxMTM2MDAwMCxZOjE2MTQ4MTYwMDAsWjoxNjE4MzU4NDAwLGE6MTYyMjA3MzYwMCxiOjE2MjY5MTIwMDAsZToxNjMwNjI3MjAwLGY6MTYzMjQ0MTYwMCxnOjE2MzQ3NzQ0MDAsaDoxNjM3NTM5MjAwLGk6MTY0MTQyNzIwMCxqOjE2NDM5MzI4MDAsazoxNjQ2MjY1NjAwLGw6MTY0OTYzNTIwMCxtOjE2NTExOTA0MDAsbjoxNjUzOTU1MjAwLG86MTY1NTk0MjQwMCxwOjE2NTk2NTc2MDAscToxNjYxOTkwNDAwLHI6MTY2NDc1NTIwMCxjOjE2NjY5MTUyMDAsSDoxNjcwMTk4NDAwfSxEOntDOlwibXNcIixLOlwibXNcIixMOlwibXNcIixHOlwibXNcIixNOlwibXNcIixOOlwibXNcIixPOlwibXNcIn19LEM6e0E6e1wiMFwiOjAuMDA0MzE3LFwiMVwiOjAuMDA0MzkzLFwiMlwiOjAuMDA0NDE4LFwiM1wiOjAuMDA4ODM0LFwiNFwiOjAuMDA4MzIyLFwiNVwiOjAuMDA4OTI4LFwiNlwiOjAuMDA0NDcxLFwiN1wiOjAuMDA5Mjg0LFwiOFwiOjAuMDA0NzA3LFwiOVwiOjAuMDA5MDc2LEFDOjAuMDA0MTE4LHJCOjAuMDA0MjcxLEk6MC4wMTE3MDMsczowLjAwNDg3OSxKOjAuMDIwMTM2LEQ6MC4wMDU3MjUsRTowLjAwNDUyNSxGOjAuMDA1MzMsQTowLjAwNDI4MyxCOjAuMDA3NTQ2LEM6MC4wMDQ0NzEsSzowLjAwNDQ4NixMOjAuMDA0NTMsRzowLjAwODMyMixNOjAuMDA0NDE3LE46MC4wMDQ0MjUsTzowLjAwNDE2MSx0OjAuMDA0NDQzLHU6MC4wMDQyODMsdjowLjAwODMyMix3OjAuMDEzNjk4LHg6MC4wMDQxNjEseTowLjAwODc4Nix6OjAuMDA0MTE4LEFCOjAuMDA3NTQ2LEJCOjAuMDA0NzgzLENCOjAuMDAzOTI5LERCOjAuMDA0NzgzLEVCOjAuMDA0ODcsRkI6MC4wMDUwMjksR0I6MC4wMDQ3LEhCOjAuMDk0MzI1LElCOjAuMDA3NTQ2LEpCOjAuMDAzODY3LEtCOjAuMDA0NTI1LExCOjAuMDA0MjkzLE1COjAuMDAzNzczLE5COjAuMDA0NTM4LE9COjAuMDA4MjgyLFBCOjAuMDExNjAxLFFCOjAuMDUyODIyLFJCOjAuMDExNjAxLFNCOjAuMDAzOTI5LFRCOjAuMDAzOTc0LFVCOjAuMDA3NTQ2LFZCOjAuMDExNjAxLFdCOjAuMDAzOTM5LHNCOjAuMDAzNzczLFhCOjAuMDAzOTI5LHRCOjAuMDA0MzU2LFlCOjAuMDA0NDI1LFpCOjAuMDA4MzIyLGFCOjAuMDA0MTUsYkI6MC4wMDQyNjcsY0I6MC4wMDM4MDEsZEI6MC4wMDQyNjcsZUI6MC4wMDM3NzMsZkI6MC4wMDQxNSxnQjowLjAwNDI5MyxoQjowLjAwNDQyNSxkOjAuMDAzNzczLGlCOjAuMDA0MTUsakI6MC4wMDQxNSxrQjowLjAwNDMxOCxsQjowLjAwNDM1NixtQjowLjAwMzk3NCxuQjowLjAzMzk1NyxQOjAuMDAzNzczLFE6MC4wMDM3NzMsUjowLjAwMzc3Myx1QjowLjAwMzc3MyxTOjAuMDAzNzczLFQ6MC4wMDM5MjksVTowLjAwNDI2OCxWOjAuMDAzODAxLFc6MC4wMTEzMTksWDowLjAwNzU0NixZOjAuMDAzNzczLFo6MC4wMDM3NzMsYTowLjAxODg2NSxiOjAuMDAzODAxLGU6MC4wMDM4NTUsZjowLjAxODg2NSxnOjAuMDAzNzczLGg6MC4wMDM3NzMsaTowLjAwMzkwMSxqOjAuMDAzOTAxLGs6MC4wMDc1NDYsbDowLjAwNzU0NixtOjAuMDA3NTQ2LG46MC4wODMwMDYsbzowLjAzMDE4NCxwOjAuMDE1MDkyLHE6MC4wMzAxODQscjowLjA0OTA0OSxjOjEuMTIwNTgsSDowLjkzOTQ3Nyx2QjowLjAxMTMxOSx3QjowLEJDOjAuMDA4Nzg2LENDOjAuMDA0ODd9LEI6XCJtb3pcIixDOltcIkFDXCIsXCJyQlwiLFwiQkNcIixcIkNDXCIsXCJJXCIsXCJzXCIsXCJKXCIsXCJEXCIsXCJFXCIsXCJGXCIsXCJBXCIsXCJCXCIsXCJDXCIsXCJLXCIsXCJMXCIsXCJHXCIsXCJNXCIsXCJOXCIsXCJPXCIsXCJ0XCIsXCJ1XCIsXCJ2XCIsXCJ3XCIsXCJ4XCIsXCJ5XCIsXCJ6XCIsXCIwXCIsXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCJBQlwiLFwiQkJcIixcIkNCXCIsXCJEQlwiLFwiRUJcIixcIkZCXCIsXCJHQlwiLFwiSEJcIixcIklCXCIsXCJKQlwiLFwiS0JcIixcIkxCXCIsXCJNQlwiLFwiTkJcIixcIk9CXCIsXCJQQlwiLFwiUUJcIixcIlJCXCIsXCJTQlwiLFwiVEJcIixcIlVCXCIsXCJWQlwiLFwiV0JcIixcInNCXCIsXCJYQlwiLFwidEJcIixcIllCXCIsXCJaQlwiLFwiYUJcIixcImJCXCIsXCJjQlwiLFwiZEJcIixcImVCXCIsXCJmQlwiLFwiZ0JcIixcImhCXCIsXCJkXCIsXCJpQlwiLFwiakJcIixcImtCXCIsXCJsQlwiLFwibUJcIixcIm5CXCIsXCJQXCIsXCJRXCIsXCJSXCIsXCJ1QlwiLFwiU1wiLFwiVFwiLFwiVVwiLFwiVlwiLFwiV1wiLFwiWFwiLFwiWVwiLFwiWlwiLFwiYVwiLFwiYlwiLFwiZVwiLFwiZlwiLFwiZ1wiLFwiaFwiLFwiaVwiLFwialwiLFwia1wiLFwibFwiLFwibVwiLFwiblwiLFwib1wiLFwicFwiLFwicVwiLFwiclwiLFwiY1wiLFwiSFwiLFwidkJcIixcIndCXCIsXCJcIl0sRTpcIkZpcmVmb3hcIixGOntcIjBcIjoxMzg2NjMzNjAwLFwiMVwiOjEzOTE0NzIwMDAsXCIyXCI6MTM5NTEwMDgwMCxcIjNcIjoxMzk4NzI5NjAwLFwiNFwiOjE0MDIzNTg0MDAsXCI1XCI6MTQwNTk4NzIwMCxcIjZcIjoxNDA5NjE2MDAwLFwiN1wiOjE0MTMyNDQ4MDAsXCI4XCI6MTQxNzM5MjAwMCxcIjlcIjoxNDIxMTA3MjAwLEFDOjExNjE2NDgwMDAsckI6MTIxMzY2MDgwMCxCQzoxMjQ2MzIwMDAwLENDOjEyNjQwMzIwMDAsSToxMzAwNzUyMDAwLHM6MTMwODYxNDQwMCxKOjEzMTM0NTI4MDAsRDoxMzE3MDgxNjAwLEU6MTMxNzA4MTYwMCxGOjEzMjA3MTA0MDAsQToxMzI0MzM5MjAwLEI6MTMyNzk2ODAwMCxDOjEzMzE1OTY4MDAsSzoxMzM1MjI1NjAwLEw6MTMzODg1NDQwMCxHOjEzNDI0ODMyMDAsTToxMzQ2MTEyMDAwLE46MTM0OTc0MDgwMCxPOjEzNTM2Mjg4MDAsdDoxMzU3NjAzMjAwLHU6MTM2MTIzMjAwMCx2OjEzNjQ4NjA4MDAsdzoxMzY4NDg5NjAwLHg6MTM3MjExODQwMCx5OjEzNzU3NDcyMDAsejoxMzc5Mzc2MDAwLEFCOjE0MjQ3MzYwMDAsQkI6MTQyODI3ODQwMCxDQjoxNDMxNDc1MjAwLERCOjE0MzU4ODE2MDAsRUI6MTQzOTI1MTIwMCxGQjoxNDQyODgwMDAwLEdCOjE0NDY1MDg4MDAsSEI6MTQ1MDEzNzYwMCxJQjoxNDUzODUyODAwLEpCOjE0NTczOTUyMDAsS0I6MTQ2MTYyODgwMCxMQjoxNDY1MjU3NjAwLE1COjE0NzAwOTYwMDAsTkI6MTQ3NDMyOTYwMCxPQjoxNDc5MTY4MDAwLFBCOjE0ODUyMTYwMDAsUUI6MTQ4ODg0NDgwMCxSQjoxNDkyNTYwMDAwLFNCOjE0OTczMTIwMDAsVEI6MTUwMjE1MDQwMCxVQjoxNTA2NTU2ODAwLFZCOjE1MTA2MTc2MDAsV0I6MTUxNjY2NTYwMCxzQjoxNTIwOTg1NjAwLFhCOjE1MjU4MjQwMDAsdEI6MTUyOTk3MTIwMCxZQjoxNTM2MTA1NjAwLFpCOjE1NDAyNTI4MDAsYUI6MTU0NDQ4NjQwMCxiQjoxNTQ4NzIwMDAwLGNCOjE1NTI5NTM2MDAsZEI6MTU1ODM5NjgwMCxlQjoxNTYyNjMwNDAwLGZCOjE1Njc0Njg4MDAsZ0I6MTU3MTc4ODgwMCxoQjoxNTc1MzMxMjAwLGQ6MTU3ODM1NTIwMCxpQjoxNTgxMzc5MjAwLGpCOjE1ODM3OTg0MDAsa0I6MTU4NjMwNDAwMCxsQjoxNTg4NjM2ODAwLG1COjE1OTEwNTYwMDAsbkI6MTU5MzQ3NTIwMCxQOjE1OTU4OTQ0MDAsUToxNTk4MzEzNjAwLFI6MTYwMDczMjgwMCx1QjoxNjAzMTUyMDAwLFM6MTYwNTU3MTIwMCxUOjE2MDc5OTA0MDAsVToxNjExNjE5MjAwLFY6MTYxNDAzODQwMCxXOjE2MTY0NTc2MDAsWDoxNjE4NzkwNDAwLFk6MTYyMjUwNTYwMCxaOjE2MjYxMzQ0MDAsYToxNjI4NTUzNjAwLGI6MTYzMDk3MjgwMCxlOjE2MzMzOTIwMDAsZjoxNjM1ODExMjAwLGc6MTYzODgzNTIwMCxoOjE2NDE4NTkyMDAsaToxNjQ0MzY0ODAwLGo6MTY0NjY5NzYwMCxrOjE2NDkxMTY4MDAsbDoxNjUxNTM2MDAwLG06MTY1Mzk1NTIwMCxuOjE2NTYzNzQ0MDAsbzoxNjU4NzkzNjAwLHA6MTY2MTIxMjgwMCxxOjE2NjM2MzIwMDAscjoxNjY2MDUxMjAwLGM6MTY2ODQ3MDQwMCxIOjE2NzA4ODk2MDAsdkI6bnVsbCx3QjpudWxsfX0sRDp7QTp7XCIwXCI6MC4wMDQxNDEsXCIxXCI6MC4wMDQzMjYsXCIyXCI6MC4wMDQ3LFwiM1wiOjAuMDA0NTM4LFwiNFwiOjAuMDA4MzIyLFwiNVwiOjAuMDA4NTk2LFwiNlwiOjAuMDA0NTY2LFwiN1wiOjAuMDA0MTE4LFwiOFwiOjAuMDA3NTQ2LFwiOVwiOjAuMDAzOTAxLEk6MC4wMDQ3MDYsczowLjAwNDg3OSxKOjAuMDA0ODc5LEQ6MC4wMDU1OTEsRTowLjAwNTU5MSxGOjAuMDA1NTkxLEE6MC4wMDQ1MzQsQjowLjAwNDQ2NCxDOjAuMDEwNDI0LEs6MC4wMDgzLEw6MC4wMDQ3MDYsRzowLjAxNTA4NyxNOjAuMDA0MzkzLE46MC4wMDQzOTMsTzowLjAwODY1Mix0OjAuMDA4MzIyLHU6MC4wMDQzOTMsdjowLjAwNDMxNyx3OjAuMDAzOTAxLHg6MC4wMDg3ODYseTowLjAwMzkzOSx6OjAuMDA0NDYxLEFCOjAuMDA0MzM1LEJCOjAuMDA0NDY0LENCOjAuMDE1MDkyLERCOjAuMDAzODY3LEVCOjAuMDE1MDkyLEZCOjAuMDAzNzczLEdCOjAuMDAzOTc0LEhCOjAuMDA3NTQ2LElCOjAuMDA3OTQ4LEpCOjAuMDAzOTc0LEtCOjAuMDAzODY3LExCOjAuMDA3NTQ2LE1COjAuMDIyNjM4LE5COjAuMDQ5MDQ5LE9COjAuMDAzODY3LFBCOjAuMDAzOTI5LFFCOjAuMDA3NTQ2LFJCOjAuMDExMzE5LFNCOjAuMDAzODY3LFRCOjAuMDA3NTQ2LFVCOjAuMDQ1Mjc2LFZCOjAuMDAzNzczLFdCOjAuMDAzNzczLHNCOjAuMDAzNzczLFhCOjAuMDExMzE5LHRCOjAuMDExMzE5LFlCOjAuMDAzNzczLFpCOjAuMDE1MDkyLGFCOjAuMDAzNzczLGJCOjAuMDExMzE5LGNCOjAuMDMwMTg0LGRCOjAuMDA3NTQ2LGVCOjAuMDA3NTQ2LGZCOjAuMDc5MjMzLGdCOjAuMDI2NDExLGhCOjAuMDExMzE5LGQ6MC4wMzc3MyxpQjowLjAxMTMxOSxqQjowLjA0NTI3NixrQjowLjA0MTUwMyxsQjowLjAyNjQxMSxtQjowLjAxMTMxOSxuQjowLjAzMzk1NyxQOjAuMTIwNzM2LFE6MC4wNDE1MDMsUjowLjA0MTUwMyxTOjAuMDc1NDYsVDowLjA0NTI3NixVOjAuMDk0MzI1LFY6MC4wNzU0NixXOjAuMDc5MjMzLFg6MC4wMTg4NjUsWTowLjAzMzk1NyxaOjAuMDI2NDExLGE6MC4wNTY1OTUsYjowLjA0MTUwMyxlOjAuMDQ5MDQ5LGY6MC4wMzM5NTcsZzowLjAyMjYzOCxoOjAuMDQxNTAzLGk6MC4wNTY1OTUsajowLjA5ODA5OCxrOjAuMDQ5MDQ5LGw6MC4wNzkyMzMsbTowLjA2MDM2OCxuOjAuMDk4MDk4LG86MC4yNzkyMDIscDowLjEyNDUwOSxxOjAuMTkyNDIzLHI6MC4yODY3NDgsYzozLjY0ODQ5LEg6MTYuODM4OSx2QjowLjAzMzk1Nyx3QjowLjAxODg2NSxEQzowLjAxMTMxOX0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIklcIixcInNcIixcIkpcIixcIkRcIixcIkVcIixcIkZcIixcIkFcIixcIkJcIixcIkNcIixcIktcIixcIkxcIixcIkdcIixcIk1cIixcIk5cIixcIk9cIixcInRcIixcInVcIixcInZcIixcIndcIixcInhcIixcInlcIixcInpcIixcIjBcIixcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIkFCXCIsXCJCQlwiLFwiQ0JcIixcIkRCXCIsXCJFQlwiLFwiRkJcIixcIkdCXCIsXCJIQlwiLFwiSUJcIixcIkpCXCIsXCJLQlwiLFwiTEJcIixcIk1CXCIsXCJOQlwiLFwiT0JcIixcIlBCXCIsXCJRQlwiLFwiUkJcIixcIlNCXCIsXCJUQlwiLFwiVUJcIixcIlZCXCIsXCJXQlwiLFwic0JcIixcIlhCXCIsXCJ0QlwiLFwiWUJcIixcIlpCXCIsXCJhQlwiLFwiYkJcIixcImNCXCIsXCJkQlwiLFwiZUJcIixcImZCXCIsXCJnQlwiLFwiaEJcIixcImRcIixcImlCXCIsXCJqQlwiLFwia0JcIixcImxCXCIsXCJtQlwiLFwibkJcIixcIlBcIixcIlFcIixcIlJcIixcIlNcIixcIlRcIixcIlVcIixcIlZcIixcIldcIixcIlhcIixcIllcIixcIlpcIixcImFcIixcImJcIixcImVcIixcImZcIixcImdcIixcImhcIixcImlcIixcImpcIixcImtcIixcImxcIixcIm1cIixcIm5cIixcIm9cIixcInBcIixcInFcIixcInJcIixcImNcIixcIkhcIixcInZCXCIsXCJ3QlwiLFwiRENcIl0sRTpcIkNocm9tZVwiLEY6e1wiMFwiOjEzNjE0MDQ4MDAsXCIxXCI6MTM2NDQyODgwMCxcIjJcIjoxMzY5MDk0NDAwLFwiM1wiOjEzNzQxMDU2MDAsXCI0XCI6MTM3Njk1NjgwMCxcIjVcIjoxMzg0MjE0NDAwLFwiNlwiOjEzODk2NTc2MDAsXCI3XCI6MTM5Mjk0MDgwMCxcIjhcIjoxMzk3MDAxNjAwLFwiOVwiOjE0MDA1NDQwMDAsSToxMjY0Mzc3NjAwLHM6MTI3NDc0NTYwMCxKOjEyODMzODU2MDAsRDoxMjg3NjE5MjAwLEU6MTI5MTI0ODAwMCxGOjEyOTY3Nzc2MDAsQToxMjk5NTQyNDAwLEI6MTMwMzg2MjQwMCxDOjEzMDc0MDQ4MDAsSzoxMzEyMjQzMjAwLEw6MTMxNjEzMTIwMCxHOjEzMTYxMzEyMDAsTToxMzE5NTAwODAwLE46MTMyMzczNDQwMCxPOjEzMjg2NTkyMDAsdDoxMzMyODkyODAwLHU6MTMzNzA0MDAwMCx2OjEzNDA2Njg4MDAsdzoxMzQzNjkyODAwLHg6MTM0ODUzMTIwMCx5OjEzNTIyNDY0MDAsejoxMzU3ODYyNDAwLEFCOjE0MDU0Njg4MDAsQkI6MTQwOTAxMTIwMCxDQjoxNDEyNjQwMDAwLERCOjE0MTYyNjg4MDAsRUI6MTQyMTc5ODQwMCxGQjoxNDI1NTEzNjAwLEdCOjE0Mjk0MDE2MDAsSEI6MTQzMjA4MDAwMCxJQjoxNDM3NTIzMjAwLEpCOjE0NDExNTIwMDAsS0I6MTQ0NDc4MDgwMCxMQjoxNDQ5MDE0NDAwLE1COjE0NTMyNDgwMDAsTkI6MTQ1Njk2MzIwMCxPQjoxNDYwNTkyMDAwLFBCOjE0NjQxMzQ0MDAsUUI6MTQ2OTA1OTIwMCxSQjoxNDcyNjAxNjAwLFNCOjE0NzYyMzA0MDAsVEI6MTQ4MDU1MDQwMCxVQjoxNDg1MzAyNDAwLFZCOjE0ODkwMTc2MDAsV0I6MTQ5MjU2MDAwMCxzQjoxNDk2NzA3MjAwLFhCOjE1MDA5NDA4MDAsdEI6MTUwNDU2OTYwMCxZQjoxNTA4MTk4NDAwLFpCOjE1MTI1MTg0MDAsYUI6MTUxNjc1MjAwMCxiQjoxNTIwMjk0NDAwLGNCOjE1MjM5MjMyMDAsZEI6MTUyNzU1MjAwMCxlQjoxNTMyMzkwNDAwLGZCOjE1MzYwMTkyMDAsZ0I6MTUzOTY0ODAwMCxoQjoxNTQzOTY4MDAwLGQ6MTU0ODcyMDAwMCxpQjoxNTUyMzQ4ODAwLGpCOjE1NTU5Nzc2MDAsa0I6MTU1OTYwNjQwMCxsQjoxNTY0NDQ0ODAwLG1COjE1NjgwNzM2MDAsbkI6MTU3MTcwMjQwMCxQOjE1NzU5MzYwMDAsUToxNTgwODYwODAwLFI6MTU4NjMwNDAwMCxTOjE1ODk4NDY0MDAsVDoxNTk0Njg0ODAwLFU6MTU5ODMxMzYwMCxWOjE2MDE5NDI0MDAsVzoxNjA1NTcxMjAwLFg6MTYxMTAxNDQwMCxZOjE2MTQ1NTY4MDAsWjoxNjE4MjcyMDAwLGE6MTYyMTk4NzIwMCxiOjE2MjY3MzkyMDAsZToxNjMwMzY4MDAwLGY6MTYzMjI2ODgwMCxnOjE2MzQ2MDE2MDAsaDoxNjM3MDIwODAwLGk6MTY0MTM0MDgwMCxqOjE2NDM2NzM2MDAsazoxNjQ2MDkyODAwLGw6MTY0ODUxMjAwMCxtOjE2NTA5MzEyMDAsbjoxNjUzMzUwNDAwLG86MTY1NTc2OTYwMCxwOjE2NTkzOTg0MDAscToxNjYxODE3NjAwLHI6MTY2NDIzNjgwMCxjOjE2NjY2NTYwMDAsSDoxNjY5NjgwMDAwLHZCOm51bGwsd0I6bnVsbCxEQzpudWxsfX0sRTp7QTp7STowLHM6MC4wMDgzMjIsSjowLjAwNDY1NixEOjAuMDA0NDY1LEU6MC4wMDM5NzQsRjowLjAwMzkyOSxBOjAuMDA0NDI1LEI6MC4wMDQzMTgsQzowLjAwMzgwMSxLOjAuMDE4ODY1LEw6MC4wOTQzMjUsRzowLjAyMjYzOCxFQzowLHhCOjAuMDA4NjkyLEZDOjAuMDExMzE5LEdDOjAuMDA0NTYsSEM6MC4wMDQyODMsSUM6MC4wMjI2MzgseUI6MC4wMDc4MDIsb0I6MC4wMDc1NDYscEI6MC4wMzM5NTcsekI6MC4xODg2NSxKQzowLjI1NjU2NCxLQzowLjA0MTUwMyxcIjBCXCI6MC4wMzc3MyxcIjFCXCI6MC4wOTQzMjUsXCIyQlwiOjAuMTkyNDIzLFwiM0JcIjoxLjMxMyxxQjowLjE2MjIzOSxcIjRCXCI6MC42NDE0MSxcIjVCXCI6MC4xNDMzNzQsXCI2QlwiOjAsTEM6MH0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiRUNcIixcInhCXCIsXCJJXCIsXCJzXCIsXCJGQ1wiLFwiSlwiLFwiR0NcIixcIkRcIixcIkhDXCIsXCJFXCIsXCJGXCIsXCJJQ1wiLFwiQVwiLFwieUJcIixcIkJcIixcIm9CXCIsXCJDXCIsXCJwQlwiLFwiS1wiLFwiekJcIixcIkxcIixcIkpDXCIsXCJHXCIsXCJLQ1wiLFwiMEJcIixcIjFCXCIsXCIyQlwiLFwiM0JcIixcInFCXCIsXCI0QlwiLFwiNUJcIixcIjZCXCIsXCJMQ1wiLFwiXCJdLEU6XCJTYWZhcmlcIixGOntFQzoxMjA1Nzk4NDAwLHhCOjEyMjY1MzQ0MDAsSToxMjQ0NDE5MjAwLHM6MTI3NTg2ODgwMCxGQzoxMzExMTIwMDAwLEo6MTM0MzE3NDQwMCxHQzoxMzgyNDAwMDAwLEQ6MTM4MjQwMDAwMCxIQzoxNDEwOTk4NDAwLEU6MTQxMzQxNzYwMCxGOjE0NDM2NTc2MDAsSUM6MTQ1ODUxODQwMCxBOjE0NzQzMjk2MDAseUI6MTQ5MDU3MjgwMCxCOjE1MDU3NzkyMDAsb0I6MTUyMjI4MTYwMCxDOjE1MzcxNDI0MDAscEI6MTU1MzQ3MjAwMCxLOjE1Njg4NTEyMDAsekI6MTU4NTAwODAwMCxMOjE2MDAyMTQ0MDAsSkM6MTYxOTM5NTIwMCxHOjE2MzIwOTYwMDAsS0M6MTYzNTI5MjgwMCxcIjBCXCI6MTYzOTM1MzYwMCxcIjFCXCI6MTY0NzIxNjAwMCxcIjJCXCI6MTY1Mjc0NTYwMCxcIjNCXCI6MTY1ODI3NTIwMCxxQjoxNjYyOTQwODAwLFwiNEJcIjoxNjY2NTY5NjAwLFwiNUJcIjoxNjcwODg5NjAwLFwiNkJcIjpudWxsLExDOm51bGx9fSxGOntBOntcIjBcIjowLjAwNTU5NSxcIjFcIjowLjAwNDM5MyxcIjJcIjowLjAwNzU0NixcIjNcIjowLjAwNDg3OSxcIjRcIjowLjAwNDg3OSxcIjVcIjowLjAwMzc3MyxcIjZcIjowLjAwNTE1MixcIjdcIjowLjAwNTAxNCxcIjhcIjowLjAwOTc1OCxcIjlcIjowLjAwNDg3OSxGOjAuMDA4MixCOjAuMDE2NTgxLEM6MC4wMDQzMTcsRzowLjAwNjg1LE06MC4wMDY4NSxOOjAuMDA2ODUsTzowLjAwNTAxNCx0OjAuMDA2MDE1LHU6MC4wMDQ4NzksdjowLjAwNjU5Nyx3OjAuMDA2NTk3LHg6MC4wMTM0MzQseTowLjAwNjcwMix6OjAuMDA2MDE1LEFCOjAuMDAzNzczLEJCOjAuMDA0MjgzLENCOjAuMDA0MzY3LERCOjAuMDA0NTM0LEVCOjAuMDA3NTQ2LEZCOjAuMDA0MjI3LEdCOjAuMDA0NDE4LEhCOjAuMDA0MTYxLElCOjAuMDA0MjI3LEpCOjAuMDA0NzI1LEtCOjAuMDE1MDkyLExCOjAuMDA4OTQyLE1COjAuMDA0NzA3LE5COjAuMDA0ODI3LE9COjAuMDA0NzA3LFBCOjAuMDA0NzA3LFFCOjAuMDA0MzI2LFJCOjAuMDA4OTIyLFNCOjAuMDE0MzQ5LFRCOjAuMDA0NDI1LFVCOjAuMDA0NzIsVkI6MC4wMDQ0MjUsV0I6MC4wMDQ0MjUsWEI6MC4wMDQ3MixZQjowLjAwNDUzMixaQjowLjAwNDU2NixhQjowLjAyMjgzLGJCOjAuMDA4NjcsY0I6MC4wMDQ2NTYsZEI6MC4wMDQ2NDIsZUI6MC4wMDM5MjksZkI6MC4wMDk0NCxnQjowLjAwNDI5MyxoQjowLjAwMzkyOSxkOjAuMDA0Mjk4LGlCOjAuMDk2NjkyLGpCOjAuMDA0MjAxLGtCOjAuMDA0MTQxLGxCOjAuMDA0MjU3LG1COjAuMDAzOTM5LG5COjAuMDA4MjM2LFA6MC4wMDM4NTUsUTowLjAwMzkzOSxSOjAuMDA4NTE0LHVCOjAuMDAzOTM5LFM6MC4wMDM5MzksVDowLjAwMzcwMixVOjAuMDA3NTQ2LFY6MC4wMDM4NTUsVzowLjAwMzg1NSxYOjAuMDAzOTI5LFk6MC4wMDc4MDIsWjowLjAxMTcwMyxhOjAuMDA3NTQ2LGI6MC4yMDc1MTUsTUM6MC4wMDY4NSxOQzowLE9DOjAuMDA4MzkyLFBDOjAuMDA0NzA2LG9COjAuMDA2MjI5LFwiN0JcIjowLjAwNDg3OSxRQzowLjAwODc4NixwQjowLjAwNDcyfSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIkZcIixcIk1DXCIsXCJOQ1wiLFwiT0NcIixcIlBDXCIsXCJCXCIsXCJvQlwiLFwiN0JcIixcIlFDXCIsXCJDXCIsXCJwQlwiLFwiR1wiLFwiTVwiLFwiTlwiLFwiT1wiLFwidFwiLFwidVwiLFwidlwiLFwid1wiLFwieFwiLFwieVwiLFwielwiLFwiMFwiLFwiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiQUJcIixcIkJCXCIsXCJDQlwiLFwiREJcIixcIkVCXCIsXCJGQlwiLFwiR0JcIixcIkhCXCIsXCJJQlwiLFwiSkJcIixcIktCXCIsXCJMQlwiLFwiTUJcIixcIk5CXCIsXCJPQlwiLFwiUEJcIixcIlFCXCIsXCJSQlwiLFwiU0JcIixcIlRCXCIsXCJVQlwiLFwiVkJcIixcIldCXCIsXCJYQlwiLFwiWUJcIixcIlpCXCIsXCJhQlwiLFwiYkJcIixcImNCXCIsXCJkQlwiLFwiZUJcIixcImZCXCIsXCJnQlwiLFwiaEJcIixcImRcIixcImlCXCIsXCJqQlwiLFwia0JcIixcImxCXCIsXCJtQlwiLFwibkJcIixcIlBcIixcIlFcIixcIlJcIixcInVCXCIsXCJTXCIsXCJUXCIsXCJVXCIsXCJWXCIsXCJXXCIsXCJYXCIsXCJZXCIsXCJaXCIsXCJhXCIsXCJiXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJPcGVyYVwiLEY6e1wiMFwiOjE0MTcxMzI4MDAsXCIxXCI6MTQyMjMxNjgwMCxcIjJcIjoxNDI1OTQ1NjAwLFwiM1wiOjE0MzAxNzkyMDAsXCI0XCI6MTQzMzgwODAwMCxcIjVcIjoxNDM4NjQ2NDAwLFwiNlwiOjE0NDI0NDgwMDAsXCI3XCI6MTQ0NTkwNDAwMCxcIjhcIjoxNDQ5MTAwODAwLFwiOVwiOjE0NTQzNzEyMDAsRjoxMTUwNzYxNjAwLE1DOjEyMjM0MjQwMDAsTkM6MTI1MTc2MzIwMCxPQzoxMjY3NDg4MDAwLFBDOjEyNzc5NDI0MDAsQjoxMjkyNDU3NjAwLG9COjEzMDI1NjY0MDAsXCI3QlwiOjEzMDkyMTkyMDAsUUM6MTMyMzEyOTYwMCxDOjEzMjMxMjk2MDAscEI6MTM1MjA3MzYwMCxHOjEzNzI3MjMyMDAsTToxMzc3NTYxNjAwLE46MTM4MTEwNDAwMCxPOjEzODYyODgwMDAsdDoxMzkwODY3MjAwLHU6MTM5Mzg5MTIwMCx2OjEzOTkzMzQ0MDAsdzoxNDAxNzUzNjAwLHg6MTQwNTk4NzIwMCx5OjE0MDk2MTYwMDAsejoxNDEzMzMxMjAwLEFCOjE0NTczMDg4MDAsQkI6MTQ2MjMyMDAwMCxDQjoxNDY1MzQ0MDAwLERCOjE0NzAwOTYwMDAsRUI6MTQ3NDMyOTYwMCxGQjoxNDc3MjY3MjAwLEdCOjE0ODE1ODcyMDAsSEI6MTQ4NjQyNTYwMCxJQjoxNDkwMDU0NDAwLEpCOjE0OTQzNzQ0MDAsS0I6MTQ5ODAwMzIwMCxMQjoxNTAyMjM2ODAwLE1COjE1MDY0NzA0MDAsTkI6MTUxMDA5OTIwMCxPQjoxNTE1MDI0MDAwLFBCOjE1MTc5NjE2MDAsUUI6MTUyMTY3NjgwMCxSQjoxNTI1OTEwNDAwLFNCOjE1MzAxNDQwMDAsVEI6MTUzNDk4MjQwMCxVQjoxNTM3ODMzNjAwLFZCOjE1NDMzNjMyMDAsV0I6MTU0ODIwMTYwMCxYQjoxNTU0NzY4MDAwLFlCOjE1NjE1OTM2MDAsWkI6MTU2NjI1OTIwMCxhQjoxNTcwNDA2NDAwLGJCOjE1NzM2ODk2MDAsY0I6MTU3ODQ0MTYwMCxkQjoxNTgzOTcxMjAwLGVCOjE1ODc1MTM2MDAsZkI6MTU5Mjk1NjgwMCxnQjoxNTk1ODk0NDAwLGhCOjE2MDAxMjgwMDAsZDoxNjAzMjM4NDAwLGlCOjE2MTM1MjAwMDAsakI6MTYxMjIyNDAwMCxrQjoxNjE2NTQ0MDAwLGxCOjE2MTk1NjgwMDAsbUI6MTYyMzcxNTIwMCxuQjoxNjI3OTQ4ODAwLFA6MTYzMTU3NzYwMCxROjE2MzMzOTIwMDAsUjoxNjM1OTg0MDAwLHVCOjE2Mzg0MDMyMDAsUzoxNjQyNTUwNDAwLFQ6MTY0NDk2OTYwMCxVOjE2NDc5OTM2MDAsVjoxNjUwNDEyODAwLFc6MTY1Mjc0NTYwMCxYOjE2NTQ2NDY0MDAsWToxNjU3MTUyMDAwLFo6MTY2MDc4MDgwMCxhOjE2NjMxMTM2MDAsYjoxNjY4ODE2MDAwfSxEOntGOlwib1wiLEI6XCJvXCIsQzpcIm9cIixNQzpcIm9cIixOQzpcIm9cIixPQzpcIm9cIixQQzpcIm9cIixvQjpcIm9cIixcIjdCXCI6XCJvXCIsUUM6XCJvXCIscEI6XCJvXCJ9fSxHOntBOntFOjAseEI6MCxSQzowLFwiOEJcIjowLjAwNDcwMTk1LFNDOjAuMDA0NzAxOTUsVEM6MC4wMDMxMzQ2MyxVQzowLjAxNDEwNTgsVkM6MC4wMDYyNjkyNixXQzowLjAxODgwNzgsWEM6MC4wNjExMjUzLFlDOjAuMDA3ODM2NTgsWkM6MC4xMDY1NzcsYUM6MC4wMjgyMTE3LGJDOjAuMDI2NjQ0NCxjQzowLjAyNTA3NzEsZEM6MC40MDU5MzUsZUM6MC4wNDIzMTc1LGZDOjAuMDEwOTcxMixnQzowLjAzOTE4MjksaEM6MC4xNDEwNTgsaUM6MC4zNDAxMDgsakM6MC42NDczMDEsa0M6MC4xODY1MTEsXCIwQlwiOjAuMjM5Nzk5LFwiMUJcIjowLjMwNDA1OSxcIjJCXCI6MC41NDY5OTMsXCIzQlwiOjIuMzE0OTMscUI6Mi4wOTg2NCxcIjRCXCI6Ni4zMzE5NixcIjVCXCI6MC42OTQzMjEsXCI2QlwiOjAuMDE1NjczMn0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJ4QlwiLFwiUkNcIixcIjhCXCIsXCJTQ1wiLFwiVENcIixcIlVDXCIsXCJFXCIsXCJWQ1wiLFwiV0NcIixcIlhDXCIsXCJZQ1wiLFwiWkNcIixcImFDXCIsXCJiQ1wiLFwiY0NcIixcImRDXCIsXCJlQ1wiLFwiZkNcIixcImdDXCIsXCJoQ1wiLFwiaUNcIixcImpDXCIsXCJrQ1wiLFwiMEJcIixcIjFCXCIsXCIyQlwiLFwiM0JcIixcInFCXCIsXCI0QlwiLFwiNUJcIixcIjZCXCIsXCJcIixcIlwiXSxFOlwiU2FmYXJpIG9uIGlPU1wiLEY6e3hCOjEyNzAyNTI4MDAsUkM6MTI4MzkwNDAwMCxcIjhCXCI6MTI5OTYyODgwMCxTQzoxMzMxMDc4NDAwLFRDOjEzNTkzMzEyMDAsVUM6MTM5NDQwOTYwMCxFOjE0MTA5MTIwMDAsVkM6MTQxMzc2MzIwMCxXQzoxNDQyMzYxNjAwLFhDOjE0NTg1MTg0MDAsWUM6MTQ3MzcyNDgwMCxaQzoxNDkwNTcyODAwLGFDOjE1MDU3NzkyMDAsYkM6MTUyMjI4MTYwMCxjQzoxNTM3MTQyNDAwLGRDOjE1NTM0NzIwMDAsZUM6MTU2ODg1MTIwMCxmQzoxNTcyMjIwODAwLGdDOjE1ODAxNjk2MDAsaEM6MTU4NTAwODAwMCxpQzoxNjAwMjE0NDAwLGpDOjE2MTkzOTUyMDAsa0M6MTYzMjA5NjAwMCxcIjBCXCI6MTYzOTM1MzYwMCxcIjFCXCI6MTY0NzIxNjAwMCxcIjJCXCI6MTY1MjY1OTIwMCxcIjNCXCI6MTY1ODI3NTIwMCxxQjoxNjYyOTQwODAwLFwiNEJcIjoxNjY2NTY5NjAwLFwiNUJcIjoxNjcwODg5NjAwLFwiNkJcIjpudWxsfX0sSDp7QTp7bEM6MC45NjY5ODh9LEI6XCJvXCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJsQ1wiLFwiXCIsXCJcIixcIlwiXSxFOlwiT3BlcmEgTWluaVwiLEY6e2xDOjE0MjY0NjQwMDB9fSxJOntBOntyQjowLEk6MC4wMzA2OTUxLEg6MCxtQzowLG5DOjAuMDIwNDYzNCxvQzowLHBDOjAuMDIwNDYzNCxcIjhCXCI6MC4wODE4NTM3LHFDOjAsckM6MC40MTk1fSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJtQ1wiLFwibkNcIixcIm9DXCIsXCJyQlwiLFwiSVwiLFwicENcIixcIjhCXCIsXCJxQ1wiLFwickNcIixcIkhcIixcIlwiLFwiXCIsXCJcIl0sRTpcIkFuZHJvaWQgQnJvd3NlclwiLEY6e21DOjEyNTY1MTUyMDAsbkM6MTI3NDMxMzYwMCxvQzoxMjkxNTkzNjAwLHJCOjEyOTgzMzI4MDAsSToxMzE4ODk2MDAwLHBDOjEzNDE3OTIwMDAsXCI4QlwiOjEzNzQ2MjQwMDAscUM6MTM4NjU0NzIwMCxyQzoxNDAxNjY3MjAwLEg6MTY2OTkzOTIwMH19LEo6e0E6e0Q6MCxBOjB9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJEXCIsXCJBXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJCbGFja2JlcnJ5IEJyb3dzZXJcIixGOntEOjEzMjUzNzYwMDAsQToxMzU5NTA0MDAwfX0sSzp7QTp7QTowLEI6MCxDOjAsZDowLjAxMTEzOTEsb0I6MCxcIjdCXCI6MCxwQjowfSxCOlwib1wiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiQVwiLFwiQlwiLFwib0JcIixcIjdCXCIsXCJDXCIsXCJwQlwiLFwiZFwiLFwiXCIsXCJcIixcIlwiXSxFOlwiT3BlcmEgTW9iaWxlXCIsRjp7QToxMjg3MTAwODAwLEI6MTMwMDc1MjAwMCxvQjoxMzE0ODM1MjAwLFwiN0JcIjoxMzE4MjkxMjAwLEM6MTMzMDMwMDgwMCxwQjoxMzQ5NzQwODAwLGQ6MTY2NjgyODgwMH0sRDp7ZDpcIndlYmtpdFwifX0sTDp7QTp7SDo0MS41NDI2fSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJIXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJDaHJvbWUgZm9yIEFuZHJvaWRcIixGOntIOjE2Njk5MzkyMDB9fSxNOntBOntjOjAuMjkyNzE2fSxCOlwibW96XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJjXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJGaXJlZm94IGZvciBBbmRyb2lkXCIsRjp7YzoxNjY4NDcwNDAwfX0sTjp7QTp7QTowLjAxMTU5MzQsQjowLjAyMjY2NH0sQjpcIm1zXCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiQVwiLFwiQlwiLFwiXCIsXCJcIixcIlwiXSxFOlwiSUUgTW9iaWxlXCIsRjp7QToxMzQwMTUwNDAwLEI6MTM1MzQ1NjAwMH19LE86e0E6e3NDOjEuNzUwMDd9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcInNDXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJVQyBCcm93c2VyIGZvciBBbmRyb2lkXCIsRjp7c0M6MTYzNDY4ODAwMH0sRDp7c0M6XCJ3ZWJraXRcIn19LFA6e0E6e0k6MC4xNjY0MDksdEM6MC4wMTAzNTQzLHVDOjAuMDEwMzA0LHZDOjAuMDUyMDAyOCx3QzowLjAxMDM1ODQseEM6MC4wMTA0NDQzLHlCOjAuMDEwNTA0Myx5QzowLjAzMTIwMTcsekM6MC4wMTA0MDA2LFwiMENcIjowLjA1MjAwMjgsXCIxQ1wiOjAuMDYyNDAzMyxcIjJDXCI6MC4wMzEyMDE3LHFCOjAuMTE0NDA2LFwiM0NcIjowLjEyNDgwNyxcIjRDXCI6MC4yNDk2MTMsXCI1Q1wiOjIuMjU2OTJ9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIklcIixcInRDXCIsXCJ1Q1wiLFwidkNcIixcIndDXCIsXCJ4Q1wiLFwieUJcIixcInlDXCIsXCJ6Q1wiLFwiMENcIixcIjFDXCIsXCIyQ1wiLFwicUJcIixcIjNDXCIsXCI0Q1wiLFwiNUNcIixcIlwiLFwiXCIsXCJcIl0sRTpcIlNhbXN1bmcgSW50ZXJuZXRcIixGOntJOjE0NjEwMjQwMDAsdEM6MTQ4MTg0NjQwMCx1QzoxNTA5NDA4MDAwLHZDOjE1MjgzMjk2MDAsd0M6MTU0NjEyODAwMCx4QzoxNTU0MTYzMjAwLHlCOjE1Njc5MDA4MDAseUM6MTU4MjU4ODgwMCx6QzoxNTkzNDc1MjAwLFwiMENcIjoxNjA1NjU3NjAwLFwiMUNcIjoxNjE4NTMxMjAwLFwiMkNcIjoxNjI5MDcyMDAwLHFCOjE2NDA3MzYwMDAsXCIzQ1wiOjE2NTE3MDg4MDAsXCI0Q1wiOjE2NTk2NTc2MDAsXCI1Q1wiOjE2NjcyNjA4MDB9fSxROntBOnt6QjowLjE5OTI5Nn0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiekJcIixcIlwiLFwiXCIsXCJcIl0sRTpcIlFRIEJyb3dzZXJcIixGOnt6QjoxNjYzNzE4NDAwfX0sUjp7QTp7XCI2Q1wiOjB9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIjZDXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJCYWlkdSBCcm93c2VyXCIsRjp7XCI2Q1wiOjE2NjMwMjcyMDB9fSxTOntBOntcIjdDXCI6MC4wNjg1MDh9LEI6XCJtb3pcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIjdDXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJLYWlPUyBCcm93c2VyXCIsRjp7XCI3Q1wiOjE1Mjc4MTEyMDB9fX07XG4iLCJtb2R1bGUuZXhwb3J0cz17XCIwXCI6XCIyNlwiLFwiMVwiOlwiMjdcIixcIjJcIjpcIjI4XCIsXCIzXCI6XCIyOVwiLFwiNFwiOlwiMzBcIixcIjVcIjpcIjMxXCIsXCI2XCI6XCIzMlwiLFwiN1wiOlwiMzNcIixcIjhcIjpcIjM0XCIsXCI5XCI6XCIzNVwiLEE6XCIxMFwiLEI6XCIxMVwiLEM6XCIxMlwiLEQ6XCI3XCIsRTpcIjhcIixGOlwiOVwiLEc6XCIxNVwiLEg6XCIxMDhcIixJOlwiNFwiLEo6XCI2XCIsSzpcIjEzXCIsTDpcIjE0XCIsTTpcIjE2XCIsTjpcIjE3XCIsTzpcIjE4XCIsUDpcIjc5XCIsUTpcIjgwXCIsUjpcIjgxXCIsUzpcIjgzXCIsVDpcIjg0XCIsVTpcIjg1XCIsVjpcIjg2XCIsVzpcIjg3XCIsWDpcIjg4XCIsWTpcIjg5XCIsWjpcIjkwXCIsYTpcIjkxXCIsYjpcIjkyXCIsYzpcIjEwN1wiLGQ6XCI3MlwiLGU6XCI5M1wiLGY6XCI5NFwiLGc6XCI5NVwiLGg6XCI5NlwiLGk6XCI5N1wiLGo6XCI5OFwiLGs6XCI5OVwiLGw6XCIxMDBcIixtOlwiMTAxXCIsbjpcIjEwMlwiLG86XCIxMDNcIixwOlwiMTA0XCIscTpcIjEwNVwiLHI6XCIxMDZcIixzOlwiNVwiLHQ6XCIxOVwiLHU6XCIyMFwiLHY6XCIyMVwiLHc6XCIyMlwiLHg6XCIyM1wiLHk6XCIyNFwiLHo6XCIyNVwiLEFCOlwiMzZcIixCQjpcIjM3XCIsQ0I6XCIzOFwiLERCOlwiMzlcIixFQjpcIjQwXCIsRkI6XCI0MVwiLEdCOlwiNDJcIixIQjpcIjQzXCIsSUI6XCI0NFwiLEpCOlwiNDVcIixLQjpcIjQ2XCIsTEI6XCI0N1wiLE1COlwiNDhcIixOQjpcIjQ5XCIsT0I6XCI1MFwiLFBCOlwiNTFcIixRQjpcIjUyXCIsUkI6XCI1M1wiLFNCOlwiNTRcIixUQjpcIjU1XCIsVUI6XCI1NlwiLFZCOlwiNTdcIixXQjpcIjU4XCIsWEI6XCI2MFwiLFlCOlwiNjJcIixaQjpcIjYzXCIsYUI6XCI2NFwiLGJCOlwiNjVcIixjQjpcIjY2XCIsZEI6XCI2N1wiLGVCOlwiNjhcIixmQjpcIjY5XCIsZ0I6XCI3MFwiLGhCOlwiNzFcIixpQjpcIjczXCIsakI6XCI3NFwiLGtCOlwiNzVcIixsQjpcIjc2XCIsbUI6XCI3N1wiLG5COlwiNzhcIixvQjpcIjExLjFcIixwQjpcIjEyLjFcIixxQjpcIjE2LjBcIixyQjpcIjNcIixzQjpcIjU5XCIsdEI6XCI2MVwiLHVCOlwiODJcIix2QjpcIjEwOVwiLHdCOlwiMTEwXCIseEI6XCIzLjJcIix5QjpcIjEwLjFcIix6QjpcIjEzLjFcIixcIjBCXCI6XCIxNS4yLTE1LjNcIixcIjFCXCI6XCIxNS40XCIsXCIyQlwiOlwiMTUuNVwiLFwiM0JcIjpcIjE1LjZcIixcIjRCXCI6XCIxNi4xXCIsXCI1QlwiOlwiMTYuMlwiLFwiNkJcIjpcIjE2LjNcIixcIjdCXCI6XCIxMS41XCIsXCI4QlwiOlwiNC4yLTQuM1wiLFwiOUJcIjpcIjUuNVwiLEFDOlwiMlwiLEJDOlwiMy41XCIsQ0M6XCIzLjZcIixEQzpcIjExMVwiLEVDOlwiMy4xXCIsRkM6XCI1LjFcIixHQzpcIjYuMVwiLEhDOlwiNy4xXCIsSUM6XCI5LjFcIixKQzpcIjE0LjFcIixLQzpcIjE1LjFcIixMQzpcIlRQXCIsTUM6XCI5LjUtOS42XCIsTkM6XCIxMC4wLTEwLjFcIixPQzpcIjEwLjVcIixQQzpcIjEwLjZcIixRQzpcIjExLjZcIixSQzpcIjQuMC00LjFcIixTQzpcIjUuMC01LjFcIixUQzpcIjYuMC02LjFcIixVQzpcIjcuMC03LjFcIixWQzpcIjguMS04LjRcIixXQzpcIjkuMC05LjJcIixYQzpcIjkuM1wiLFlDOlwiMTAuMC0xMC4yXCIsWkM6XCIxMC4zXCIsYUM6XCIxMS4wLTExLjJcIixiQzpcIjExLjMtMTEuNFwiLGNDOlwiMTIuMC0xMi4xXCIsZEM6XCIxMi4yLTEyLjVcIixlQzpcIjEzLjAtMTMuMVwiLGZDOlwiMTMuMlwiLGdDOlwiMTMuM1wiLGhDOlwiMTMuNC0xMy43XCIsaUM6XCIxNC4wLTE0LjRcIixqQzpcIjE0LjUtMTQuOFwiLGtDOlwiMTUuMC0xNS4xXCIsbEM6XCJhbGxcIixtQzpcIjIuMVwiLG5DOlwiMi4yXCIsb0M6XCIyLjNcIixwQzpcIjQuMVwiLHFDOlwiNC40XCIsckM6XCI0LjQuMy00LjQuNFwiLHNDOlwiMTMuNFwiLHRDOlwiNS4wLTUuNFwiLHVDOlwiNi4yLTYuNFwiLHZDOlwiNy4yLTcuNFwiLHdDOlwiOC4yXCIseEM6XCI5LjJcIix5QzpcIjExLjEtMTEuMlwiLHpDOlwiMTIuMFwiLFwiMENcIjpcIjEzLjBcIixcIjFDXCI6XCIxNC4wXCIsXCIyQ1wiOlwiMTUuMFwiLFwiM0NcIjpcIjE3LjBcIixcIjRDXCI6XCIxOC4wXCIsXCI1Q1wiOlwiMTkuMFwiLFwiNkNcIjpcIjEzLjE4XCIsXCI3Q1wiOlwiMi41XCJ9O1xuIiwibW9kdWxlLmV4cG9ydHM9e0E6XCJpZVwiLEI6XCJlZGdlXCIsQzpcImZpcmVmb3hcIixEOlwiY2hyb21lXCIsRTpcInNhZmFyaVwiLEY6XCJvcGVyYVwiLEc6XCJpb3Nfc2FmXCIsSDpcIm9wX21pbmlcIixJOlwiYW5kcm9pZFwiLEo6XCJiYlwiLEs6XCJvcF9tb2JcIixMOlwiYW5kX2NoclwiLE06XCJhbmRfZmZcIixOOlwiaWVfbW9iXCIsTzpcImFuZF91Y1wiLFA6XCJzYW1zdW5nXCIsUTpcImFuZF9xcVwiLFI6XCJiYWlkdVwiLFM6XCJrYWlvc1wifTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5jb25zdCBicm93c2VycyA9IHJlcXVpcmUoJy4vYnJvd3NlcnMnKS5icm93c2Vyc1xuY29uc3QgdmVyc2lvbnMgPSByZXF1aXJlKCcuL2Jyb3dzZXJWZXJzaW9ucycpLmJyb3dzZXJWZXJzaW9uc1xuY29uc3QgYWdlbnRzRGF0YSA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvYWdlbnRzJylcblxuZnVuY3Rpb24gdW5wYWNrQnJvd3NlclZlcnNpb25zKHZlcnNpb25zRGF0YSkge1xuICByZXR1cm4gT2JqZWN0LmtleXModmVyc2lvbnNEYXRhKS5yZWR1Y2UoKHVzYWdlLCB2ZXJzaW9uKSA9PiB7XG4gICAgdXNhZ2VbdmVyc2lvbnNbdmVyc2lvbl1dID0gdmVyc2lvbnNEYXRhW3ZlcnNpb25dXG4gICAgcmV0dXJuIHVzYWdlXG4gIH0sIHt9KVxufVxuXG5tb2R1bGUuZXhwb3J0cy5hZ2VudHMgPSBPYmplY3Qua2V5cyhhZ2VudHNEYXRhKS5yZWR1Y2UoKG1hcCwga2V5KSA9PiB7XG4gIGxldCB2ZXJzaW9uc0RhdGEgPSBhZ2VudHNEYXRhW2tleV1cbiAgbWFwW2Jyb3dzZXJzW2tleV1dID0gT2JqZWN0LmtleXModmVyc2lvbnNEYXRhKS5yZWR1Y2UoKGRhdGEsIGVudHJ5KSA9PiB7XG4gICAgaWYgKGVudHJ5ID09PSAnQScpIHtcbiAgICAgIGRhdGEudXNhZ2VfZ2xvYmFsID0gdW5wYWNrQnJvd3NlclZlcnNpb25zKHZlcnNpb25zRGF0YVtlbnRyeV0pXG4gICAgfSBlbHNlIGlmIChlbnRyeSA9PT0gJ0MnKSB7XG4gICAgICBkYXRhLnZlcnNpb25zID0gdmVyc2lvbnNEYXRhW2VudHJ5XS5yZWR1Y2UoKGxpc3QsIHZlcnNpb24pID0+IHtcbiAgICAgICAgaWYgKHZlcnNpb24gPT09ICcnKSB7XG4gICAgICAgICAgbGlzdC5wdXNoKG51bGwpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGlzdC5wdXNoKHZlcnNpb25zW3ZlcnNpb25dKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0XG4gICAgICB9LCBbXSlcbiAgICB9IGVsc2UgaWYgKGVudHJ5ID09PSAnRCcpIHtcbiAgICAgIGRhdGEucHJlZml4X2V4Y2VwdGlvbnMgPSB1bnBhY2tCcm93c2VyVmVyc2lvbnModmVyc2lvbnNEYXRhW2VudHJ5XSlcbiAgICB9IGVsc2UgaWYgKGVudHJ5ID09PSAnRScpIHtcbiAgICAgIGRhdGEuYnJvd3NlciA9IHZlcnNpb25zRGF0YVtlbnRyeV1cbiAgICB9IGVsc2UgaWYgKGVudHJ5ID09PSAnRicpIHtcbiAgICAgIGRhdGEucmVsZWFzZV9kYXRlID0gT2JqZWN0LmtleXModmVyc2lvbnNEYXRhW2VudHJ5XSkucmVkdWNlKFxuICAgICAgICAobWFwMiwga2V5MikgPT4ge1xuICAgICAgICAgIG1hcDJbdmVyc2lvbnNba2V5Ml1dID0gdmVyc2lvbnNEYXRhW2VudHJ5XVtrZXkyXVxuICAgICAgICAgIHJldHVybiBtYXAyXG4gICAgICAgIH0sXG4gICAgICAgIHt9XG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGVudHJ5IGlzIEJcbiAgICAgIGRhdGEucHJlZml4ID0gdmVyc2lvbnNEYXRhW2VudHJ5XVxuICAgIH1cbiAgICByZXR1cm4gZGF0YVxuICB9LCB7fSlcbiAgcmV0dXJuIG1hcFxufSwge30pXG4iLCJtb2R1bGUuZXhwb3J0cy5icm93c2VyVmVyc2lvbnMgPSByZXF1aXJlKCcuLi8uLi9kYXRhL2Jyb3dzZXJWZXJzaW9ucycpXG4iLCJtb2R1bGUuZXhwb3J0cy5icm93c2VycyA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvYnJvd3NlcnMnKVxuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgXCIuZ2xvdyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjaztcXG4gIGJvcmRlci1zdHlsZTogc29saWQ7XFxuICBib3JkZXItY29sb3I6IGdyZWVuO1xcbiAgYm9yZGVyLXdpZHRoOiA1cHg7XFxuICBcXG4gIGJveC1zaGFkb3c6IDAgMCA0MHB4IGJsYWNrO1xcbn1cXG5cXG4ubmF2QnV0dG9uIHtcXG4gIGJhY2tncm91bmQtY29sb3I6IGdyZWVuO1xcbiAgY29sb3I6IGJsYWNrO1xcblxcbiAgYm9yZGVyLXJhZGl1czogNXB4O1xcbiAgYm9yZGVyLXdpZHRoOiAwcHg7XFxuXFxuICBmb250LXNpemU6IHgtbGFyZ2U7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG4gIHBhZGRpbmc6IDVweDtcXG59XFxuXFxuLm5hdkJ1dHRvbjpob3ZlciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjaztcXG4gIGNvbG9yOiBncmVlbjtcXG5cXG4gIG91dGxpbmUtc3R5bGU6IHNvbGlkO1xcbiAgb3V0bGluZS13aWR0aDogMnB4O1xcbn1cXG5cXG4uZm9vdGVyIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuICBnYXA6IDEwcHg7XFxuICBwYWRkaW5nOiAxMHB4O1xcbiAgd2lkdGg6IDkwMHB4O1xcbn1cXG5cXG5idXR0b246aG92ZXJ7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxufVxcblxcbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogMTAwMHB4KSB7XFxuICAubmF2QnV0dG9ue1xcbiAgICBmb250LXNpemU6IGxhcmdlcjtcXG4gIH1cXG59XCIsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL2dsb2JhbC5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSx1QkFBdUI7RUFDdkIsbUJBQW1CO0VBQ25CLG1CQUFtQjtFQUNuQixpQkFBaUI7O0VBRWpCLDBCQUEwQjtBQUM1Qjs7QUFFQTtFQUNFLHVCQUF1QjtFQUN2QixZQUFZOztFQUVaLGtCQUFrQjtFQUNsQixpQkFBaUI7O0VBRWpCLGtCQUFrQjtFQUNsQixpQkFBaUI7RUFDakIsWUFBWTtBQUNkOztBQUVBO0VBQ0UsdUJBQXVCO0VBQ3ZCLFlBQVk7O0VBRVosb0JBQW9CO0VBQ3BCLGtCQUFrQjtBQUNwQjs7QUFFQTtFQUNFLGFBQWE7RUFDYix1QkFBdUI7RUFDdkIsbUJBQW1CO0VBQ25CLFNBQVM7RUFDVCxhQUFhO0VBQ2IsWUFBWTtBQUNkOztBQUVBO0VBQ0UsZUFBZTtBQUNqQjs7QUFFQTtFQUNFO0lBQ0UsaUJBQWlCO0VBQ25CO0FBQ0ZcIixcInNvdXJjZXNDb250ZW50XCI6W1wiLmdsb3cge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7XFxuICBib3JkZXItc3R5bGU6IHNvbGlkO1xcbiAgYm9yZGVyLWNvbG9yOiBncmVlbjtcXG4gIGJvcmRlci13aWR0aDogNXB4O1xcbiAgXFxuICBib3gtc2hhZG93OiAwIDAgNDBweCBibGFjaztcXG59XFxuXFxuLm5hdkJ1dHRvbiB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBncmVlbjtcXG4gIGNvbG9yOiBibGFjaztcXG5cXG4gIGJvcmRlci1yYWRpdXM6IDVweDtcXG4gIGJvcmRlci13aWR0aDogMHB4O1xcblxcbiAgZm9udC1zaXplOiB4LWxhcmdlO1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxuICBwYWRkaW5nOiA1cHg7XFxufVxcblxcbi5uYXZCdXR0b246aG92ZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7XFxuICBjb2xvcjogZ3JlZW47XFxuXFxuICBvdXRsaW5lLXN0eWxlOiBzb2xpZDtcXG4gIG91dGxpbmUtd2lkdGg6IDJweDtcXG59XFxuXFxuLmZvb3RlciB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XFxuICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgZ2FwOiAxMHB4O1xcbiAgcGFkZGluZzogMTBweDtcXG4gIHdpZHRoOiA5MDBweDtcXG59XFxuXFxuYnV0dG9uOmhvdmVye1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbn1cXG5cXG5AbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDEwMDBweCkge1xcbiAgLm5hdkJ1dHRvbntcXG4gICAgZm9udC1zaXplOiBsYXJnZXI7XFxuICB9XFxufVwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0dFVF9VUkxfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvZ2V0VXJsLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9VUkxfSU1QT1JUXzBfX18gPSBuZXcgVVJMKFwiaW1ncy9ub29kbGVzdHYucG5nXCIsIGltcG9ydC5tZXRhLnVybCk7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG52YXIgX19fQ1NTX0xPQURFUl9VUkxfUkVQTEFDRU1FTlRfMF9fXyA9IF9fX0NTU19MT0FERVJfR0VUX1VSTF9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9VUkxfSU1QT1JUXzBfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIFwiLmhlYWRlciB7XFxuICAgIGJhY2tncm91bmQtaW1hZ2U6IHVybChcIiArIF9fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzBfX18gKyBcIik7XFxuICAgIGJhY2tncm91bmQtc2l6ZTogY292ZXI7XFxuICAgIGJhY2tncm91bmQtcmVwZWF0OiBuby1yZXBlYXQ7XFxuICAgIGJhY2tncm91bmQtcG9zaXRpb246IGNlbnRlcjtcXG5cXG4gICAgd2lkdGg6IDkwMHB4O1xcbiAgICBoZWlnaHQ6IDYwMHB4O1xcblxcbiAgICBkaXNwbGF5OmlubGluZS1ibG9jaztcXG59XFxuXFxuLm9wYXF1ZXtcXG4gICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjUpO1xcbiAgICBmb250LXNpemU6IHh4LWxhcmdlO1xcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICAgIGNvbG9yOiB3aGl0ZTtcXG4gICAgbWFyZ2luLXRvcDogMjUwcHg7XFxufVxcblxcbi5uYXZCYXIge1xcbiAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XFxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuXFxuICAgIGJhY2tncm91bmQtY29sb3I6IGJsYWNrO1xcbiAgICBwYWRkaW5nOiA1cHggMTBweDtcXG59XFxuXFxuLnRpdGxlSW1ne1xcbiAgICB3aWR0aDogMTUwcHg7XFxuICAgIGhlaWdodDogNTBweDtcXG59XFxuXFxuLm1hcCB7XFxuICAgIHdpZHRoOiA5MDBweDtcXG59XFxuXFxuLnN0b3JlSG91cnN7XFxuICAgIHdpZHRoOiA5MDBweDtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG4gICAgcGFkZGluZzogNXB4IDEwcHg7XFxuICAgIGZvbnQtc2l6ZTogeC1sYXJnZTtcXG59XFxuXFxuLnN0b3JlSG91cnMgdGFibGUge1xcbiAgICBmbGV4OiAxO1xcbn1cXG5cXG4uc3RvcmVIb3VycyB0YWJsZSB0ciB7XFxuICAgIGRpc3BsYXk6IGZsZXg7XFxuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG59XFxuXFxuLnN0b3JlSG91cnMgdGFibGUgdGgge1xcbiAgICBwYWRkaW5nOiA1cHg7XFxuICAgIHRleHQtYWxpZ246IGxlZnQ7XFxufVxcblxcbi5pbmZvcm1hdGlvbiB7XFxuICAgIHBhZGRpbmc6IDI1cHg7XFxuICAgIGZvbnQtc2l6ZTogbGFyZ2U7XFxufVxcblxcbi5jcmVkaXRzIHtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICAgIGdhcDogMTBweDtcXG4gICAgZm9udC1zaXplOiB4LWxhcmdlO1xcbiAgICBwYWRkaW5nOiAyMHB4O1xcbn1cXG5cXG5cXG5AbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDEwMDBweCkge1xcbiAgICAjY29udGVudCA+ICoge1xcbiAgICAgICAgd2lkdGg6IDk1dnc7XFxuICAgICAgICBoZWlnaHQ6IGF1dG87XFxuICAgIH1cXG5cXG4gICAgLnRpdGxlSW1ne1xcbiAgICAgICAgd2lkdGg6IDEwMHB4O1xcbiAgICAgICAgaGVpZ2h0OiBhdXRvO1xcbiAgICB9XFxufVwiLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9pbml0aWFsUGFnZS5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7SUFDSSx5REFBMkM7SUFDM0Msc0JBQXNCO0lBQ3RCLDRCQUE0QjtJQUM1QiwyQkFBMkI7O0lBRTNCLFlBQVk7SUFDWixhQUFhOztJQUViLG9CQUFvQjtBQUN4Qjs7QUFFQTtJQUNJLG9DQUFvQztJQUNwQyxtQkFBbUI7SUFDbkIsa0JBQWtCO0lBQ2xCLFlBQVk7SUFDWixpQkFBaUI7QUFDckI7O0FBRUE7SUFDSSxhQUFhO0lBQ2IsOEJBQThCO0lBQzlCLG1CQUFtQjs7SUFFbkIsdUJBQXVCO0lBQ3ZCLGlCQUFpQjtBQUNyQjs7QUFFQTtJQUNJLFlBQVk7SUFDWixZQUFZO0FBQ2hCOztBQUVBO0lBQ0ksWUFBWTtBQUNoQjs7QUFFQTtJQUNJLFlBQVk7SUFDWixhQUFhO0lBQ2IsbUJBQW1CO0lBQ25CLGlCQUFpQjtJQUNqQixrQkFBa0I7QUFDdEI7O0FBRUE7SUFDSSxPQUFPO0FBQ1g7O0FBRUE7SUFDSSxhQUFhO0lBQ2IsOEJBQThCO0lBQzlCLG1CQUFtQjtBQUN2Qjs7QUFFQTtJQUNJLFlBQVk7SUFDWixnQkFBZ0I7QUFDcEI7O0FBRUE7SUFDSSxhQUFhO0lBQ2IsZ0JBQWdCO0FBQ3BCOztBQUVBO0lBQ0ksYUFBYTtJQUNiLHNCQUFzQjtJQUN0QixXQUFXO0lBQ1gsU0FBUztJQUNULGtCQUFrQjtJQUNsQixhQUFhO0FBQ2pCOzs7QUFHQTtJQUNJO1FBQ0ksV0FBVztRQUNYLFlBQVk7SUFDaEI7O0lBRUE7UUFDSSxZQUFZO1FBQ1osWUFBWTtJQUNoQjtBQUNKXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIi5oZWFkZXIge1xcbiAgICBiYWNrZ3JvdW5kLWltYWdlOiB1cmwoJ2ltZ3Mvbm9vZGxlc3R2LnBuZycpO1xcbiAgICBiYWNrZ3JvdW5kLXNpemU6IGNvdmVyO1xcbiAgICBiYWNrZ3JvdW5kLXJlcGVhdDogbm8tcmVwZWF0O1xcbiAgICBiYWNrZ3JvdW5kLXBvc2l0aW9uOiBjZW50ZXI7XFxuXFxuICAgIHdpZHRoOiA5MDBweDtcXG4gICAgaGVpZ2h0OiA2MDBweDtcXG5cXG4gICAgZGlzcGxheTppbmxpbmUtYmxvY2s7XFxufVxcblxcbi5vcGFxdWV7XFxuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC41KTtcXG4gICAgZm9udC1zaXplOiB4eC1sYXJnZTtcXG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgICBjb2xvcjogd2hpdGU7XFxuICAgIG1hcmdpbi10b3A6IDI1MHB4O1xcbn1cXG5cXG4ubmF2QmFyIHtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xcblxcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjaztcXG4gICAgcGFkZGluZzogNXB4IDEwcHg7XFxufVxcblxcbi50aXRsZUltZ3tcXG4gICAgd2lkdGg6IDE1MHB4O1xcbiAgICBoZWlnaHQ6IDUwcHg7XFxufVxcblxcbi5tYXAge1xcbiAgICB3aWR0aDogOTAwcHg7XFxufVxcblxcbi5zdG9yZUhvdXJze1xcbiAgICB3aWR0aDogOTAwcHg7XFxuICAgIGRpc3BsYXk6IGZsZXg7XFxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuICAgIHBhZGRpbmc6IDVweCAxMHB4O1xcbiAgICBmb250LXNpemU6IHgtbGFyZ2U7XFxufVxcblxcbi5zdG9yZUhvdXJzIHRhYmxlIHtcXG4gICAgZmxleDogMTtcXG59XFxuXFxuLnN0b3JlSG91cnMgdGFibGUgdHIge1xcbiAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XFxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxufVxcblxcbi5zdG9yZUhvdXJzIHRhYmxlIHRoIHtcXG4gICAgcGFkZGluZzogNXB4O1xcbiAgICB0ZXh0LWFsaWduOiBsZWZ0O1xcbn1cXG5cXG4uaW5mb3JtYXRpb24ge1xcbiAgICBwYWRkaW5nOiAyNXB4O1xcbiAgICBmb250LXNpemU6IGxhcmdlO1xcbn1cXG5cXG4uY3JlZGl0cyB7XFxuICAgIGRpc3BsYXk6IGZsZXg7XFxuICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XFxuICAgIHdpZHRoOiAxMDAlO1xcbiAgICBnYXA6IDEwcHg7XFxuICAgIGZvbnQtc2l6ZTogeC1sYXJnZTtcXG4gICAgcGFkZGluZzogMjBweDtcXG59XFxuXFxuXFxuQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiAxMDAwcHgpIHtcXG4gICAgI2NvbnRlbnQgPiAqIHtcXG4gICAgICAgIHdpZHRoOiA5NXZ3O1xcbiAgICAgICAgaGVpZ2h0OiBhdXRvO1xcbiAgICB9XFxuXFxuICAgIC50aXRsZUltZ3tcXG4gICAgICAgIHdpZHRoOiAxMDBweDtcXG4gICAgICAgIGhlaWdodDogYXV0bztcXG4gICAgfVxcbn1cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgXCIubWVudUNvbnRhaW5lciB7XFxuICB3aWR0aDogOTAwcHg7XFxufVxcblxcbi5tZW51IHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgaGVpZ2h0OiA3NTBweDtcXG4gIGZvbnQtc2l6ZTogeC1sYXJnZTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG59XFxuXFxuLm1lbnUgICp7XFxuICBvdXRsaW5lLXN0eWxlOiBzb2xpZDtcXG4gIG91dGxpbmUtY29sb3I6IGdyZWVuO1xcbn1cXG5cXG4ubWVudSBjYXB0aW9uIHtcXG4gIGZvbnQtc2l6ZTogeHgtbGFyZ2U7XFxufVxcblxcbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogMTAwMHB4KSB7XFxuICAubWVudUNvbnRhaW5lcntcXG4gICAgd2lkdGg6IDk1dnc7XFxuICB9XFxuICBcXG4gIC5tZW51PnRyPnRkOm50aC1jaGlsZCg0KSwgLm1lbnU+dHI+dGg6bnRoLWNoaWxkKDQpe1xcbiAgICBkaXNwbGF5OiBub25lO1xcbiAgfVxcblxcbiAgLm1lbnUge1xcbiAgICBmb250LXNpemU6bGFyZ2VyO1xcbiAgfVxcbn1cIiwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvbWVudS5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSxZQUFZO0FBQ2Q7O0FBRUE7RUFDRSxXQUFXO0VBQ1gsYUFBYTtFQUNiLGtCQUFrQjtFQUNsQixrQkFBa0I7QUFDcEI7O0FBRUE7RUFDRSxvQkFBb0I7RUFDcEIsb0JBQW9CO0FBQ3RCOztBQUVBO0VBQ0UsbUJBQW1CO0FBQ3JCOztBQUVBO0VBQ0U7SUFDRSxXQUFXO0VBQ2I7O0VBRUE7SUFDRSxhQUFhO0VBQ2Y7O0VBRUE7SUFDRSxnQkFBZ0I7RUFDbEI7QUFDRlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIubWVudUNvbnRhaW5lciB7XFxuICB3aWR0aDogOTAwcHg7XFxufVxcblxcbi5tZW51IHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgaGVpZ2h0OiA3NTBweDtcXG4gIGZvbnQtc2l6ZTogeC1sYXJnZTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG59XFxuXFxuLm1lbnUgICp7XFxuICBvdXRsaW5lLXN0eWxlOiBzb2xpZDtcXG4gIG91dGxpbmUtY29sb3I6IGdyZWVuO1xcbn1cXG5cXG4ubWVudSBjYXB0aW9uIHtcXG4gIGZvbnQtc2l6ZTogeHgtbGFyZ2U7XFxufVxcblxcbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogMTAwMHB4KSB7XFxuICAubWVudUNvbnRhaW5lcntcXG4gICAgd2lkdGg6IDk1dnc7XFxuICB9XFxuICBcXG4gIC5tZW51PnRyPnRkOm50aC1jaGlsZCg0KSwgLm1lbnU+dHI+dGg6bnRoLWNoaWxkKDQpe1xcbiAgICBkaXNwbGF5OiBub25lO1xcbiAgfVxcblxcbiAgLm1lbnUge1xcbiAgICBmb250LXNpemU6bGFyZ2VyO1xcbiAgfVxcbn1cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG4gIE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4gIEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKSB7XG4gIHZhciBsaXN0ID0gW107XG5cbiAgLy8gcmV0dXJuIHRoZSBsaXN0IG9mIG1vZHVsZXMgYXMgY3NzIHN0cmluZ1xuICBsaXN0LnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICB2YXIgY29udGVudCA9IFwiXCI7XG4gICAgICB2YXIgbmVlZExheWVyID0gdHlwZW9mIGl0ZW1bNV0gIT09IFwidW5kZWZpbmVkXCI7XG4gICAgICBpZiAoaXRlbVs0XSkge1xuICAgICAgICBjb250ZW50ICs9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQoaXRlbVs0XSwgXCIpIHtcIik7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICBjb250ZW50ICs9IFwiQG1lZGlhIFwiLmNvbmNhdChpdGVtWzJdLCBcIiB7XCIpO1xuICAgICAgfVxuICAgICAgaWYgKG5lZWRMYXllcikge1xuICAgICAgICBjb250ZW50ICs9IFwiQGxheWVyXCIuY29uY2F0KGl0ZW1bNV0ubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChpdGVtWzVdKSA6IFwiXCIsIFwiIHtcIik7XG4gICAgICB9XG4gICAgICBjb250ZW50ICs9IGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcoaXRlbSk7XG4gICAgICBpZiAobmVlZExheWVyKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJ9XCI7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW1bNF0pIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH0pLmpvaW4oXCJcIik7XG4gIH07XG5cbiAgLy8gaW1wb3J0IGEgbGlzdCBvZiBtb2R1bGVzIGludG8gdGhlIGxpc3RcbiAgbGlzdC5pID0gZnVuY3Rpb24gaShtb2R1bGVzLCBtZWRpYSwgZGVkdXBlLCBzdXBwb3J0cywgbGF5ZXIpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZXMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIG1vZHVsZXMgPSBbW251bGwsIG1vZHVsZXMsIHVuZGVmaW5lZF1dO1xuICAgIH1cbiAgICB2YXIgYWxyZWFkeUltcG9ydGVkTW9kdWxlcyA9IHt9O1xuICAgIGlmIChkZWR1cGUpIHtcbiAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy5sZW5ndGg7IGsrKykge1xuICAgICAgICB2YXIgaWQgPSB0aGlzW2tdWzBdO1xuICAgICAgICBpZiAoaWQgIT0gbnVsbCkge1xuICAgICAgICAgIGFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBfayA9IDA7IF9rIDwgbW9kdWxlcy5sZW5ndGg7IF9rKyspIHtcbiAgICAgIHZhciBpdGVtID0gW10uY29uY2F0KG1vZHVsZXNbX2tdKTtcbiAgICAgIGlmIChkZWR1cGUgJiYgYWxyZWFkeUltcG9ydGVkTW9kdWxlc1tpdGVtWzBdXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgbGF5ZXIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpdGVtWzVdID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgaXRlbVs1XSA9IGxheWVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBsYXllclwiLmNvbmNhdChpdGVtWzVdLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQoaXRlbVs1XSkgOiBcIlwiLCBcIiB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVs1XSA9IGxheWVyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobWVkaWEpIHtcbiAgICAgICAgaWYgKCFpdGVtWzJdKSB7XG4gICAgICAgICAgaXRlbVsyXSA9IG1lZGlhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBtZWRpYSBcIi5jb25jYXQoaXRlbVsyXSwgXCIge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bMl0gPSBtZWRpYTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN1cHBvcnRzKSB7XG4gICAgICAgIGlmICghaXRlbVs0XSkge1xuICAgICAgICAgIGl0ZW1bNF0gPSBcIlwiLmNvbmNhdChzdXBwb3J0cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQoaXRlbVs0XSwgXCIpIHtcIikuY29uY2F0KGl0ZW1bMV0sIFwifVwiKTtcbiAgICAgICAgICBpdGVtWzRdID0gc3VwcG9ydHM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGxpc3QucHVzaChpdGVtKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBsaXN0O1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBpZiAoIXVybCkge1xuICAgIHJldHVybiB1cmw7XG4gIH1cbiAgdXJsID0gU3RyaW5nKHVybC5fX2VzTW9kdWxlID8gdXJsLmRlZmF1bHQgOiB1cmwpO1xuXG4gIC8vIElmIHVybCBpcyBhbHJlYWR5IHdyYXBwZWQgaW4gcXVvdGVzLCByZW1vdmUgdGhlbVxuICBpZiAoL15bJ1wiXS4qWydcIl0kLy50ZXN0KHVybCkpIHtcbiAgICB1cmwgPSB1cmwuc2xpY2UoMSwgLTEpO1xuICB9XG4gIGlmIChvcHRpb25zLmhhc2gpIHtcbiAgICB1cmwgKz0gb3B0aW9ucy5oYXNoO1xuICB9XG5cbiAgLy8gU2hvdWxkIHVybCBiZSB3cmFwcGVkP1xuICAvLyBTZWUgaHR0cHM6Ly9kcmFmdHMuY3Nzd2cub3JnL2Nzcy12YWx1ZXMtMy8jdXJsc1xuICBpZiAoL1tcIicoKSBcXHRcXG5dfCglMjApLy50ZXN0KHVybCkgfHwgb3B0aW9ucy5uZWVkUXVvdGVzKSB7XG4gICAgcmV0dXJuIFwiXFxcIlwiLmNvbmNhdCh1cmwucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpLnJlcGxhY2UoL1xcbi9nLCBcIlxcXFxuXCIpLCBcIlxcXCJcIik7XG4gIH1cbiAgcmV0dXJuIHVybDtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgdmFyIGNvbnRlbnQgPSBpdGVtWzFdO1xuICB2YXIgY3NzTWFwcGluZyA9IGl0ZW1bM107XG4gIGlmICghY3NzTWFwcGluZykge1xuICAgIHJldHVybiBjb250ZW50O1xuICB9XG4gIGlmICh0eXBlb2YgYnRvYSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdmFyIGJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KGNzc01hcHBpbmcpKSkpO1xuICAgIHZhciBkYXRhID0gXCJzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxcIi5jb25jYXQoYmFzZTY0KTtcbiAgICB2YXIgc291cmNlTWFwcGluZyA9IFwiLyojIFwiLmNvbmNhdChkYXRhLCBcIiAqL1wiKTtcbiAgICByZXR1cm4gW2NvbnRlbnRdLmNvbmNhdChbc291cmNlTWFwcGluZ10pLmpvaW4oXCJcXG5cIik7XG4gIH1cbiAgcmV0dXJuIFtjb250ZW50XS5qb2luKFwiXFxuXCIpO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IFtbXCJOYW1lXCIsXCJIUCByZXN0b3JlZFwiLFwiUmFkc1wiLFwiV2VpZ2h0XCIsXCJWYWx1ZVwiXSxbXCJBbmdsZXIgTWVhdFwiLFwiMzVcIixcIjEwXCIsXCIwLjVcIixcIjIwXCJdLFtcIkJha2VkIGJsb2F0Zmx5XCIsXCI0MFwiLFwiMFwiLFwiMC41XCIsXCIxNVwiXSxbXCJEZWF0aGNsYXcgRWdnIG9tZWxldHRlXCIsXCIxMTVcIixcIjBcIixcIjAuMVwiLFwiODBcIl0sW1wiRGVhdGhjbGF3IFN0ZWFrXCIsXCIxODVcIixcIjBcIixcIjFcIixcIjEzMFwiXSxbXCJHcmlsbGVkIFJhZHJvYWNoXCIsXCIzMFwiLFwiMFwiLFwiMC41XCIsXCI3XCJdLFtcIkhhcHB5IEJpcnRoZGF5IFN3ZWV0cm9sbFwiLFwiMjBcIixcIjRcIixcIjBcIixcIjBcIl0sW1wiSWd1YW5hIG9uIGEgc3RpY2tcIixcIjQwXCIsXCIwXCIsXCIwLjFcIixcIjMzXCJdLFtcIk1pcmVsdXJrIGNha2VcIixcIjE0MFwiLFwiMFwiLFwiMC4xXCIsXCIzNVwiXSxbXCJNb2xlIHJhdCBjaHVua3NcIixcIjUwXCIsXCIwXCIsXCIwLjVcIixcIjhcIl0sW1wiUmFkc2NvcHJpYW4gc3RlYWtcIixcIjE1MFwiLFwiMFwiLFwiMVwiLFwiNjVcIl0sW1wiTm9vZGxlIGN1cFwiLFwiMjBcIixcIjBcIixcIjAuNVwiLFwiMTBcIl1dIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdFwiMC4yMFwiOiBcIjM5XCIsXG5cdFwiMC4yMVwiOiBcIjQxXCIsXG5cdFwiMC4yMlwiOiBcIjQxXCIsXG5cdFwiMC4yM1wiOiBcIjQxXCIsXG5cdFwiMC4yNFwiOiBcIjQxXCIsXG5cdFwiMC4yNVwiOiBcIjQyXCIsXG5cdFwiMC4yNlwiOiBcIjQyXCIsXG5cdFwiMC4yN1wiOiBcIjQzXCIsXG5cdFwiMC4yOFwiOiBcIjQzXCIsXG5cdFwiMC4yOVwiOiBcIjQzXCIsXG5cdFwiMC4zMFwiOiBcIjQ0XCIsXG5cdFwiMC4zMVwiOiBcIjQ1XCIsXG5cdFwiMC4zMlwiOiBcIjQ1XCIsXG5cdFwiMC4zM1wiOiBcIjQ1XCIsXG5cdFwiMC4zNFwiOiBcIjQ1XCIsXG5cdFwiMC4zNVwiOiBcIjQ1XCIsXG5cdFwiMC4zNlwiOiBcIjQ3XCIsXG5cdFwiMC4zN1wiOiBcIjQ5XCIsXG5cdFwiMS4wXCI6IFwiNDlcIixcblx0XCIxLjFcIjogXCI1MFwiLFxuXHRcIjEuMlwiOiBcIjUxXCIsXG5cdFwiMS4zXCI6IFwiNTJcIixcblx0XCIxLjRcIjogXCI1M1wiLFxuXHRcIjEuNVwiOiBcIjU0XCIsXG5cdFwiMS42XCI6IFwiNTZcIixcblx0XCIxLjdcIjogXCI1OFwiLFxuXHRcIjEuOFwiOiBcIjU5XCIsXG5cdFwiMi4wXCI6IFwiNjFcIixcblx0XCIyLjFcIjogXCI2MVwiLFxuXHRcIjMuMFwiOiBcIjY2XCIsXG5cdFwiMy4xXCI6IFwiNjZcIixcblx0XCI0LjBcIjogXCI2OVwiLFxuXHRcIjQuMVwiOiBcIjY5XCIsXG5cdFwiNC4yXCI6IFwiNjlcIixcblx0XCI1LjBcIjogXCI3M1wiLFxuXHRcIjYuMFwiOiBcIjc2XCIsXG5cdFwiNi4xXCI6IFwiNzZcIixcblx0XCI3LjBcIjogXCI3OFwiLFxuXHRcIjcuMVwiOiBcIjc4XCIsXG5cdFwiNy4yXCI6IFwiNzhcIixcblx0XCI3LjNcIjogXCI3OFwiLFxuXHRcIjguMFwiOiBcIjgwXCIsXG5cdFwiOC4xXCI6IFwiODBcIixcblx0XCI4LjJcIjogXCI4MFwiLFxuXHRcIjguM1wiOiBcIjgwXCIsXG5cdFwiOC40XCI6IFwiODBcIixcblx0XCI4LjVcIjogXCI4MFwiLFxuXHRcIjkuMFwiOiBcIjgzXCIsXG5cdFwiOS4xXCI6IFwiODNcIixcblx0XCI5LjJcIjogXCI4M1wiLFxuXHRcIjkuM1wiOiBcIjgzXCIsXG5cdFwiOS40XCI6IFwiODNcIixcblx0XCIxMC4wXCI6IFwiODVcIixcblx0XCIxMC4xXCI6IFwiODVcIixcblx0XCIxMC4yXCI6IFwiODVcIixcblx0XCIxMC4zXCI6IFwiODVcIixcblx0XCIxMC40XCI6IFwiODVcIixcblx0XCIxMS4wXCI6IFwiODdcIixcblx0XCIxMS4xXCI6IFwiODdcIixcblx0XCIxMS4yXCI6IFwiODdcIixcblx0XCIxMS4zXCI6IFwiODdcIixcblx0XCIxMS40XCI6IFwiODdcIixcblx0XCIxMS41XCI6IFwiODdcIixcblx0XCIxMi4wXCI6IFwiODlcIixcblx0XCIxMi4xXCI6IFwiODlcIixcblx0XCIxMi4yXCI6IFwiODlcIixcblx0XCIxMy4wXCI6IFwiOTFcIixcblx0XCIxMy4xXCI6IFwiOTFcIixcblx0XCIxMy4yXCI6IFwiOTFcIixcblx0XCIxMy4zXCI6IFwiOTFcIixcblx0XCIxMy40XCI6IFwiOTFcIixcblx0XCIxMy41XCI6IFwiOTFcIixcblx0XCIxMy42XCI6IFwiOTFcIixcblx0XCIxNC4wXCI6IFwiOTNcIixcblx0XCIxNC4xXCI6IFwiOTNcIixcblx0XCIxNC4yXCI6IFwiOTNcIixcblx0XCIxNS4wXCI6IFwiOTRcIixcblx0XCIxNS4xXCI6IFwiOTRcIixcblx0XCIxNS4yXCI6IFwiOTRcIixcblx0XCIxNS4zXCI6IFwiOTRcIixcblx0XCIxNS40XCI6IFwiOTRcIixcblx0XCIxNS41XCI6IFwiOTRcIixcblx0XCIxNi4wXCI6IFwiOTZcIixcblx0XCIxNi4xXCI6IFwiOTZcIixcblx0XCIxNi4yXCI6IFwiOTZcIixcblx0XCIxNy4wXCI6IFwiOThcIixcblx0XCIxNy4xXCI6IFwiOThcIixcblx0XCIxNy4yXCI6IFwiOThcIixcblx0XCIxNy4zXCI6IFwiOThcIixcblx0XCIxNy40XCI6IFwiOThcIixcblx0XCIxOC4wXCI6IFwiMTAwXCIsXG5cdFwiMTguMVwiOiBcIjEwMFwiLFxuXHRcIjE4LjJcIjogXCIxMDBcIixcblx0XCIxOC4zXCI6IFwiMTAwXCIsXG5cdFwiMTkuMFwiOiBcIjEwMlwiLFxuXHRcIjE5LjFcIjogXCIxMDJcIixcblx0XCIyMC4wXCI6IFwiMTA0XCIsXG5cdFwiMjAuMVwiOiBcIjEwNFwiLFxuXHRcIjIwLjJcIjogXCIxMDRcIixcblx0XCIyMC4zXCI6IFwiMTA0XCIsXG5cdFwiMjEuMFwiOiBcIjEwNlwiLFxuXHRcIjIxLjFcIjogXCIxMDZcIixcblx0XCIyMi4wXCI6IFwiMTA4XCJcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBlc2xpbnQgbm8taW52YWxpZC10aGlzOiAxICovXG5cbnZhciBFUlJPUl9NRVNTQUdFID0gJ0Z1bmN0aW9uLnByb3RvdHlwZS5iaW5kIGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgJztcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgZnVuY1R5cGUgPSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJpbmQodGhhdCkge1xuICAgIHZhciB0YXJnZXQgPSB0aGlzO1xuICAgIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nIHx8IHRvU3RyLmNhbGwodGFyZ2V0KSAhPT0gZnVuY1R5cGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihFUlJPUl9NRVNTQUdFICsgdGFyZ2V0KTtcbiAgICB9XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgICB2YXIgYm91bmQ7XG4gICAgdmFyIGJpbmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHRhcmdldC5hcHBseShcbiAgICAgICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgICAgIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoT2JqZWN0KHJlc3VsdCkgPT09IHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXQuYXBwbHkoXG4gICAgICAgICAgICAgICAgdGhhdCxcbiAgICAgICAgICAgICAgICBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBib3VuZExlbmd0aCA9IE1hdGgubWF4KDAsIHRhcmdldC5sZW5ndGggLSBhcmdzLmxlbmd0aCk7XG4gICAgdmFyIGJvdW5kQXJncyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm91bmRMZW5ndGg7IGkrKykge1xuICAgICAgICBib3VuZEFyZ3MucHVzaCgnJCcgKyBpKTtcbiAgICB9XG5cbiAgICBib3VuZCA9IEZ1bmN0aW9uKCdiaW5kZXInLCAncmV0dXJuIGZ1bmN0aW9uICgnICsgYm91bmRBcmdzLmpvaW4oJywnKSArICcpeyByZXR1cm4gYmluZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTsgfScpKGJpbmRlcik7XG5cbiAgICBpZiAodGFyZ2V0LnByb3RvdHlwZSkge1xuICAgICAgICB2YXIgRW1wdHkgPSBmdW5jdGlvbiBFbXB0eSgpIHt9O1xuICAgICAgICBFbXB0eS5wcm90b3R5cGUgPSB0YXJnZXQucHJvdG90eXBlO1xuICAgICAgICBib3VuZC5wcm90b3R5cGUgPSBuZXcgRW1wdHkoKTtcbiAgICAgICAgRW1wdHkucHJvdG90eXBlID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gYm91bmQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW1wbGVtZW50YXRpb24gPSByZXF1aXJlKCcuL2ltcGxlbWVudGF0aW9uJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgfHwgaW1wbGVtZW50YXRpb247XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1bmRlZmluZWQ7XG5cbnZhciAkU3ludGF4RXJyb3IgPSBTeW50YXhFcnJvcjtcbnZhciAkRnVuY3Rpb24gPSBGdW5jdGlvbjtcbnZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29uc2lzdGVudC1yZXR1cm5cbnZhciBnZXRFdmFsbGVkQ29uc3RydWN0b3IgPSBmdW5jdGlvbiAoZXhwcmVzc2lvblN5bnRheCkge1xuXHR0cnkge1xuXHRcdHJldHVybiAkRnVuY3Rpb24oJ1widXNlIHN0cmljdFwiOyByZXR1cm4gKCcgKyBleHByZXNzaW9uU3ludGF4ICsgJykuY29uc3RydWN0b3I7JykoKTtcblx0fSBjYXRjaCAoZSkge31cbn07XG5cbnZhciAkZ09QRCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG5pZiAoJGdPUEQpIHtcblx0dHJ5IHtcblx0XHQkZ09QRCh7fSwgJycpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0JGdPUEQgPSBudWxsOyAvLyB0aGlzIGlzIElFIDgsIHdoaWNoIGhhcyBhIGJyb2tlbiBnT1BEXG5cdH1cbn1cblxudmFyIHRocm93VHlwZUVycm9yID0gZnVuY3Rpb24gKCkge1xuXHR0aHJvdyBuZXcgJFR5cGVFcnJvcigpO1xufTtcbnZhciBUaHJvd1R5cGVFcnJvciA9ICRnT1BEXG5cdD8gKGZ1bmN0aW9uICgpIHtcblx0XHR0cnkge1xuXHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC1leHByZXNzaW9ucywgbm8tY2FsbGVyLCBuby1yZXN0cmljdGVkLXByb3BlcnRpZXNcblx0XHRcdGFyZ3VtZW50cy5jYWxsZWU7IC8vIElFIDggZG9lcyBub3QgdGhyb3cgaGVyZVxuXHRcdFx0cmV0dXJuIHRocm93VHlwZUVycm9yO1xuXHRcdH0gY2F0Y2ggKGNhbGxlZVRocm93cykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Ly8gSUUgOCB0aHJvd3Mgb24gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihhcmd1bWVudHMsICcnKVxuXHRcdFx0XHRyZXR1cm4gJGdPUEQoYXJndW1lbnRzLCAnY2FsbGVlJykuZ2V0O1xuXHRcdFx0fSBjYXRjaCAoZ09QRHRocm93cykge1xuXHRcdFx0XHRyZXR1cm4gdGhyb3dUeXBlRXJyb3I7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KCkpXG5cdDogdGhyb3dUeXBlRXJyb3I7XG5cbnZhciBoYXNTeW1ib2xzID0gcmVxdWlyZSgnaGFzLXN5bWJvbHMnKSgpO1xuXG52YXIgZ2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHguX19wcm90b19fOyB9OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXByb3RvXG5cbnZhciBuZWVkc0V2YWwgPSB7fTtcblxudmFyIFR5cGVkQXJyYXkgPSB0eXBlb2YgVWludDhBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBnZXRQcm90byhVaW50OEFycmF5KTtcblxudmFyIElOVFJJTlNJQ1MgPSB7XG5cdCclQWdncmVnYXRlRXJyb3IlJzogdHlwZW9mIEFnZ3JlZ2F0ZUVycm9yID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEFnZ3JlZ2F0ZUVycm9yLFxuXHQnJUFycmF5JSc6IEFycmF5LFxuXHQnJUFycmF5QnVmZmVyJSc6IHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBBcnJheUJ1ZmZlcixcblx0JyVBcnJheUl0ZXJhdG9yUHJvdG90eXBlJSc6IGhhc1N5bWJvbHMgPyBnZXRQcm90byhbXVtTeW1ib2wuaXRlcmF0b3JdKCkpIDogdW5kZWZpbmVkLFxuXHQnJUFzeW5jRnJvbVN5bmNJdGVyYXRvclByb3RvdHlwZSUnOiB1bmRlZmluZWQsXG5cdCclQXN5bmNGdW5jdGlvbiUnOiBuZWVkc0V2YWwsXG5cdCclQXN5bmNHZW5lcmF0b3IlJzogbmVlZHNFdmFsLFxuXHQnJUFzeW5jR2VuZXJhdG9yRnVuY3Rpb24lJzogbmVlZHNFdmFsLFxuXHQnJUFzeW5jSXRlcmF0b3JQcm90b3R5cGUlJzogbmVlZHNFdmFsLFxuXHQnJUF0b21pY3MlJzogdHlwZW9mIEF0b21pY3MgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogQXRvbWljcyxcblx0JyVCaWdJbnQlJzogdHlwZW9mIEJpZ0ludCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBCaWdJbnQsXG5cdCclQm9vbGVhbiUnOiBCb29sZWFuLFxuXHQnJURhdGFWaWV3JSc6IHR5cGVvZiBEYXRhVmlldyA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBEYXRhVmlldyxcblx0JyVEYXRlJSc6IERhdGUsXG5cdCclZGVjb2RlVVJJJSc6IGRlY29kZVVSSSxcblx0JyVkZWNvZGVVUklDb21wb25lbnQlJzogZGVjb2RlVVJJQ29tcG9uZW50LFxuXHQnJWVuY29kZVVSSSUnOiBlbmNvZGVVUkksXG5cdCclZW5jb2RlVVJJQ29tcG9uZW50JSc6IGVuY29kZVVSSUNvbXBvbmVudCxcblx0JyVFcnJvciUnOiBFcnJvcixcblx0JyVldmFsJSc6IGV2YWwsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZXZhbFxuXHQnJUV2YWxFcnJvciUnOiBFdmFsRXJyb3IsXG5cdCclRmxvYXQzMkFycmF5JSc6IHR5cGVvZiBGbG9hdDMyQXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogRmxvYXQzMkFycmF5LFxuXHQnJUZsb2F0NjRBcnJheSUnOiB0eXBlb2YgRmxvYXQ2NEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEZsb2F0NjRBcnJheSxcblx0JyVGaW5hbGl6YXRpb25SZWdpc3RyeSUnOiB0eXBlb2YgRmluYWxpemF0aW9uUmVnaXN0cnkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogRmluYWxpemF0aW9uUmVnaXN0cnksXG5cdCclRnVuY3Rpb24lJzogJEZ1bmN0aW9uLFxuXHQnJUdlbmVyYXRvckZ1bmN0aW9uJSc6IG5lZWRzRXZhbCxcblx0JyVJbnQ4QXJyYXklJzogdHlwZW9mIEludDhBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBJbnQ4QXJyYXksXG5cdCclSW50MTZBcnJheSUnOiB0eXBlb2YgSW50MTZBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBJbnQxNkFycmF5LFxuXHQnJUludDMyQXJyYXklJzogdHlwZW9mIEludDMyQXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogSW50MzJBcnJheSxcblx0JyVpc0Zpbml0ZSUnOiBpc0Zpbml0ZSxcblx0JyVpc05hTiUnOiBpc05hTixcblx0JyVJdGVyYXRvclByb3RvdHlwZSUnOiBoYXNTeW1ib2xzID8gZ2V0UHJvdG8oZ2V0UHJvdG8oW11bU3ltYm9sLml0ZXJhdG9yXSgpKSkgOiB1bmRlZmluZWQsXG5cdCclSlNPTiUnOiB0eXBlb2YgSlNPTiA9PT0gJ29iamVjdCcgPyBKU09OIDogdW5kZWZpbmVkLFxuXHQnJU1hcCUnOiB0eXBlb2YgTWFwID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IE1hcCxcblx0JyVNYXBJdGVyYXRvclByb3RvdHlwZSUnOiB0eXBlb2YgTWFwID09PSAndW5kZWZpbmVkJyB8fCAhaGFzU3ltYm9scyA/IHVuZGVmaW5lZCA6IGdldFByb3RvKG5ldyBNYXAoKVtTeW1ib2wuaXRlcmF0b3JdKCkpLFxuXHQnJU1hdGglJzogTWF0aCxcblx0JyVOdW1iZXIlJzogTnVtYmVyLFxuXHQnJU9iamVjdCUnOiBPYmplY3QsXG5cdCclcGFyc2VGbG9hdCUnOiBwYXJzZUZsb2F0LFxuXHQnJXBhcnNlSW50JSc6IHBhcnNlSW50LFxuXHQnJVByb21pc2UlJzogdHlwZW9mIFByb21pc2UgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUHJvbWlzZSxcblx0JyVQcm94eSUnOiB0eXBlb2YgUHJveHkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUHJveHksXG5cdCclUmFuZ2VFcnJvciUnOiBSYW5nZUVycm9yLFxuXHQnJVJlZmVyZW5jZUVycm9yJSc6IFJlZmVyZW5jZUVycm9yLFxuXHQnJVJlZmxlY3QlJzogdHlwZW9mIFJlZmxlY3QgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUmVmbGVjdCxcblx0JyVSZWdFeHAlJzogUmVnRXhwLFxuXHQnJVNldCUnOiB0eXBlb2YgU2V0ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFNldCxcblx0JyVTZXRJdGVyYXRvclByb3RvdHlwZSUnOiB0eXBlb2YgU2V0ID09PSAndW5kZWZpbmVkJyB8fCAhaGFzU3ltYm9scyA/IHVuZGVmaW5lZCA6IGdldFByb3RvKG5ldyBTZXQoKVtTeW1ib2wuaXRlcmF0b3JdKCkpLFxuXHQnJVNoYXJlZEFycmF5QnVmZmVyJSc6IHR5cGVvZiBTaGFyZWRBcnJheUJ1ZmZlciA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBTaGFyZWRBcnJheUJ1ZmZlcixcblx0JyVTdHJpbmclJzogU3RyaW5nLFxuXHQnJVN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlJSc6IGhhc1N5bWJvbHMgPyBnZXRQcm90bygnJ1tTeW1ib2wuaXRlcmF0b3JdKCkpIDogdW5kZWZpbmVkLFxuXHQnJVN5bWJvbCUnOiBoYXNTeW1ib2xzID8gU3ltYm9sIDogdW5kZWZpbmVkLFxuXHQnJVN5bnRheEVycm9yJSc6ICRTeW50YXhFcnJvcixcblx0JyVUaHJvd1R5cGVFcnJvciUnOiBUaHJvd1R5cGVFcnJvcixcblx0JyVUeXBlZEFycmF5JSc6IFR5cGVkQXJyYXksXG5cdCclVHlwZUVycm9yJSc6ICRUeXBlRXJyb3IsXG5cdCclVWludDhBcnJheSUnOiB0eXBlb2YgVWludDhBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50OEFycmF5LFxuXHQnJVVpbnQ4Q2xhbXBlZEFycmF5JSc6IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50OENsYW1wZWRBcnJheSxcblx0JyVVaW50MTZBcnJheSUnOiB0eXBlb2YgVWludDE2QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogVWludDE2QXJyYXksXG5cdCclVWludDMyQXJyYXklJzogdHlwZW9mIFVpbnQzMkFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQzMkFycmF5LFxuXHQnJVVSSUVycm9yJSc6IFVSSUVycm9yLFxuXHQnJVdlYWtNYXAlJzogdHlwZW9mIFdlYWtNYXAgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogV2Vha01hcCxcblx0JyVXZWFrUmVmJSc6IHR5cGVvZiBXZWFrUmVmID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFdlYWtSZWYsXG5cdCclV2Vha1NldCUnOiB0eXBlb2YgV2Vha1NldCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBXZWFrU2V0XG59O1xuXG52YXIgZG9FdmFsID0gZnVuY3Rpb24gZG9FdmFsKG5hbWUpIHtcblx0dmFyIHZhbHVlO1xuXHRpZiAobmFtZSA9PT0gJyVBc3luY0Z1bmN0aW9uJScpIHtcblx0XHR2YWx1ZSA9IGdldEV2YWxsZWRDb25zdHJ1Y3RvcignYXN5bmMgZnVuY3Rpb24gKCkge30nKTtcblx0fSBlbHNlIGlmIChuYW1lID09PSAnJUdlbmVyYXRvckZ1bmN0aW9uJScpIHtcblx0XHR2YWx1ZSA9IGdldEV2YWxsZWRDb25zdHJ1Y3RvcignZnVuY3Rpb24qICgpIHt9Jyk7XG5cdH0gZWxzZSBpZiAobmFtZSA9PT0gJyVBc3luY0dlbmVyYXRvckZ1bmN0aW9uJScpIHtcblx0XHR2YWx1ZSA9IGdldEV2YWxsZWRDb25zdHJ1Y3RvcignYXN5bmMgZnVuY3Rpb24qICgpIHt9Jyk7XG5cdH0gZWxzZSBpZiAobmFtZSA9PT0gJyVBc3luY0dlbmVyYXRvciUnKSB7XG5cdFx0dmFyIGZuID0gZG9FdmFsKCclQXN5bmNHZW5lcmF0b3JGdW5jdGlvbiUnKTtcblx0XHRpZiAoZm4pIHtcblx0XHRcdHZhbHVlID0gZm4ucHJvdG90eXBlO1xuXHRcdH1cblx0fSBlbHNlIGlmIChuYW1lID09PSAnJUFzeW5jSXRlcmF0b3JQcm90b3R5cGUlJykge1xuXHRcdHZhciBnZW4gPSBkb0V2YWwoJyVBc3luY0dlbmVyYXRvciUnKTtcblx0XHRpZiAoZ2VuKSB7XG5cdFx0XHR2YWx1ZSA9IGdldFByb3RvKGdlbi5wcm90b3R5cGUpO1xuXHRcdH1cblx0fVxuXG5cdElOVFJJTlNJQ1NbbmFtZV0gPSB2YWx1ZTtcblxuXHRyZXR1cm4gdmFsdWU7XG59O1xuXG52YXIgTEVHQUNZX0FMSUFTRVMgPSB7XG5cdCclQXJyYXlCdWZmZXJQcm90b3R5cGUlJzogWydBcnJheUJ1ZmZlcicsICdwcm90b3R5cGUnXSxcblx0JyVBcnJheVByb3RvdHlwZSUnOiBbJ0FycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJUFycmF5UHJvdG9fZW50cmllcyUnOiBbJ0FycmF5JywgJ3Byb3RvdHlwZScsICdlbnRyaWVzJ10sXG5cdCclQXJyYXlQcm90b19mb3JFYWNoJSc6IFsnQXJyYXknLCAncHJvdG90eXBlJywgJ2ZvckVhY2gnXSxcblx0JyVBcnJheVByb3RvX2tleXMlJzogWydBcnJheScsICdwcm90b3R5cGUnLCAna2V5cyddLFxuXHQnJUFycmF5UHJvdG9fdmFsdWVzJSc6IFsnQXJyYXknLCAncHJvdG90eXBlJywgJ3ZhbHVlcyddLFxuXHQnJUFzeW5jRnVuY3Rpb25Qcm90b3R5cGUlJzogWydBc3luY0Z1bmN0aW9uJywgJ3Byb3RvdHlwZSddLFxuXHQnJUFzeW5jR2VuZXJhdG9yJSc6IFsnQXN5bmNHZW5lcmF0b3JGdW5jdGlvbicsICdwcm90b3R5cGUnXSxcblx0JyVBc3luY0dlbmVyYXRvclByb3RvdHlwZSUnOiBbJ0FzeW5jR2VuZXJhdG9yRnVuY3Rpb24nLCAncHJvdG90eXBlJywgJ3Byb3RvdHlwZSddLFxuXHQnJUJvb2xlYW5Qcm90b3R5cGUlJzogWydCb29sZWFuJywgJ3Byb3RvdHlwZSddLFxuXHQnJURhdGFWaWV3UHJvdG90eXBlJSc6IFsnRGF0YVZpZXcnLCAncHJvdG90eXBlJ10sXG5cdCclRGF0ZVByb3RvdHlwZSUnOiBbJ0RhdGUnLCAncHJvdG90eXBlJ10sXG5cdCclRXJyb3JQcm90b3R5cGUlJzogWydFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVFdmFsRXJyb3JQcm90b3R5cGUlJzogWydFdmFsRXJyb3InLCAncHJvdG90eXBlJ10sXG5cdCclRmxvYXQzMkFycmF5UHJvdG90eXBlJSc6IFsnRmxvYXQzMkFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJUZsb2F0NjRBcnJheVByb3RvdHlwZSUnOiBbJ0Zsb2F0NjRBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVGdW5jdGlvblByb3RvdHlwZSUnOiBbJ0Z1bmN0aW9uJywgJ3Byb3RvdHlwZSddLFxuXHQnJUdlbmVyYXRvciUnOiBbJ0dlbmVyYXRvckZ1bmN0aW9uJywgJ3Byb3RvdHlwZSddLFxuXHQnJUdlbmVyYXRvclByb3RvdHlwZSUnOiBbJ0dlbmVyYXRvckZ1bmN0aW9uJywgJ3Byb3RvdHlwZScsICdwcm90b3R5cGUnXSxcblx0JyVJbnQ4QXJyYXlQcm90b3R5cGUlJzogWydJbnQ4QXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclSW50MTZBcnJheVByb3RvdHlwZSUnOiBbJ0ludDE2QXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclSW50MzJBcnJheVByb3RvdHlwZSUnOiBbJ0ludDMyQXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclSlNPTlBhcnNlJSc6IFsnSlNPTicsICdwYXJzZSddLFxuXHQnJUpTT05TdHJpbmdpZnklJzogWydKU09OJywgJ3N0cmluZ2lmeSddLFxuXHQnJU1hcFByb3RvdHlwZSUnOiBbJ01hcCcsICdwcm90b3R5cGUnXSxcblx0JyVOdW1iZXJQcm90b3R5cGUlJzogWydOdW1iZXInLCAncHJvdG90eXBlJ10sXG5cdCclT2JqZWN0UHJvdG90eXBlJSc6IFsnT2JqZWN0JywgJ3Byb3RvdHlwZSddLFxuXHQnJU9ialByb3RvX3RvU3RyaW5nJSc6IFsnT2JqZWN0JywgJ3Byb3RvdHlwZScsICd0b1N0cmluZyddLFxuXHQnJU9ialByb3RvX3ZhbHVlT2YlJzogWydPYmplY3QnLCAncHJvdG90eXBlJywgJ3ZhbHVlT2YnXSxcblx0JyVQcm9taXNlUHJvdG90eXBlJSc6IFsnUHJvbWlzZScsICdwcm90b3R5cGUnXSxcblx0JyVQcm9taXNlUHJvdG9fdGhlbiUnOiBbJ1Byb21pc2UnLCAncHJvdG90eXBlJywgJ3RoZW4nXSxcblx0JyVQcm9taXNlX2FsbCUnOiBbJ1Byb21pc2UnLCAnYWxsJ10sXG5cdCclUHJvbWlzZV9yZWplY3QlJzogWydQcm9taXNlJywgJ3JlamVjdCddLFxuXHQnJVByb21pc2VfcmVzb2x2ZSUnOiBbJ1Byb21pc2UnLCAncmVzb2x2ZSddLFxuXHQnJVJhbmdlRXJyb3JQcm90b3R5cGUlJzogWydSYW5nZUVycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJVJlZmVyZW5jZUVycm9yUHJvdG90eXBlJSc6IFsnUmVmZXJlbmNlRXJyb3InLCAncHJvdG90eXBlJ10sXG5cdCclUmVnRXhwUHJvdG90eXBlJSc6IFsnUmVnRXhwJywgJ3Byb3RvdHlwZSddLFxuXHQnJVNldFByb3RvdHlwZSUnOiBbJ1NldCcsICdwcm90b3R5cGUnXSxcblx0JyVTaGFyZWRBcnJheUJ1ZmZlclByb3RvdHlwZSUnOiBbJ1NoYXJlZEFycmF5QnVmZmVyJywgJ3Byb3RvdHlwZSddLFxuXHQnJVN0cmluZ1Byb3RvdHlwZSUnOiBbJ1N0cmluZycsICdwcm90b3R5cGUnXSxcblx0JyVTeW1ib2xQcm90b3R5cGUlJzogWydTeW1ib2wnLCAncHJvdG90eXBlJ10sXG5cdCclU3ludGF4RXJyb3JQcm90b3R5cGUlJzogWydTeW50YXhFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVUeXBlZEFycmF5UHJvdG90eXBlJSc6IFsnVHlwZWRBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVUeXBlRXJyb3JQcm90b3R5cGUlJzogWydUeXBlRXJyb3InLCAncHJvdG90eXBlJ10sXG5cdCclVWludDhBcnJheVByb3RvdHlwZSUnOiBbJ1VpbnQ4QXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclVWludDhDbGFtcGVkQXJyYXlQcm90b3R5cGUlJzogWydVaW50OENsYW1wZWRBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVVaW50MTZBcnJheVByb3RvdHlwZSUnOiBbJ1VpbnQxNkFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJVVpbnQzMkFycmF5UHJvdG90eXBlJSc6IFsnVWludDMyQXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclVVJJRXJyb3JQcm90b3R5cGUlJzogWydVUklFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVXZWFrTWFwUHJvdG90eXBlJSc6IFsnV2Vha01hcCcsICdwcm90b3R5cGUnXSxcblx0JyVXZWFrU2V0UHJvdG90eXBlJSc6IFsnV2Vha1NldCcsICdwcm90b3R5cGUnXVxufTtcblxudmFyIGJpbmQgPSByZXF1aXJlKCdmdW5jdGlvbi1iaW5kJyk7XG52YXIgaGFzT3duID0gcmVxdWlyZSgnaGFzJyk7XG52YXIgJGNvbmNhdCA9IGJpbmQuY2FsbChGdW5jdGlvbi5jYWxsLCBBcnJheS5wcm90b3R5cGUuY29uY2F0KTtcbnZhciAkc3BsaWNlQXBwbHkgPSBiaW5kLmNhbGwoRnVuY3Rpb24uYXBwbHksIEFycmF5LnByb3RvdHlwZS5zcGxpY2UpO1xudmFyICRyZXBsYWNlID0gYmluZC5jYWxsKEZ1bmN0aW9uLmNhbGwsIFN0cmluZy5wcm90b3R5cGUucmVwbGFjZSk7XG52YXIgJHN0clNsaWNlID0gYmluZC5jYWxsKEZ1bmN0aW9uLmNhbGwsIFN0cmluZy5wcm90b3R5cGUuc2xpY2UpO1xudmFyICRleGVjID0gYmluZC5jYWxsKEZ1bmN0aW9uLmNhbGwsIFJlZ0V4cC5wcm90b3R5cGUuZXhlYyk7XG5cbi8qIGFkYXB0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vbG9kYXNoL2xvZGFzaC9ibG9iLzQuMTcuMTUvZGlzdC9sb2Rhc2guanMjTDY3MzUtTDY3NDQgKi9cbnZhciByZVByb3BOYW1lID0gL1teJS5bXFxdXSt8XFxbKD86KC0/XFxkKyg/OlxcLlxcZCspPyl8KFtcIiddKSgoPzooPyFcXDIpW15cXFxcXXxcXFxcLikqPylcXDIpXFxdfCg/PSg/OlxcLnxcXFtcXF0pKD86XFwufFxcW1xcXXwlJCkpL2c7XG52YXIgcmVFc2NhcGVDaGFyID0gL1xcXFwoXFxcXCk/L2c7IC8qKiBVc2VkIHRvIG1hdGNoIGJhY2tzbGFzaGVzIGluIHByb3BlcnR5IHBhdGhzLiAqL1xudmFyIHN0cmluZ1RvUGF0aCA9IGZ1bmN0aW9uIHN0cmluZ1RvUGF0aChzdHJpbmcpIHtcblx0dmFyIGZpcnN0ID0gJHN0clNsaWNlKHN0cmluZywgMCwgMSk7XG5cdHZhciBsYXN0ID0gJHN0clNsaWNlKHN0cmluZywgLTEpO1xuXHRpZiAoZmlyc3QgPT09ICclJyAmJiBsYXN0ICE9PSAnJScpIHtcblx0XHR0aHJvdyBuZXcgJFN5bnRheEVycm9yKCdpbnZhbGlkIGludHJpbnNpYyBzeW50YXgsIGV4cGVjdGVkIGNsb3NpbmcgYCVgJyk7XG5cdH0gZWxzZSBpZiAobGFzdCA9PT0gJyUnICYmIGZpcnN0ICE9PSAnJScpIHtcblx0XHR0aHJvdyBuZXcgJFN5bnRheEVycm9yKCdpbnZhbGlkIGludHJpbnNpYyBzeW50YXgsIGV4cGVjdGVkIG9wZW5pbmcgYCVgJyk7XG5cdH1cblx0dmFyIHJlc3VsdCA9IFtdO1xuXHQkcmVwbGFjZShzdHJpbmcsIHJlUHJvcE5hbWUsIGZ1bmN0aW9uIChtYXRjaCwgbnVtYmVyLCBxdW90ZSwgc3ViU3RyaW5nKSB7XG5cdFx0cmVzdWx0W3Jlc3VsdC5sZW5ndGhdID0gcXVvdGUgPyAkcmVwbGFjZShzdWJTdHJpbmcsIHJlRXNjYXBlQ2hhciwgJyQxJykgOiBudW1iZXIgfHwgbWF0Y2g7XG5cdH0pO1xuXHRyZXR1cm4gcmVzdWx0O1xufTtcbi8qIGVuZCBhZGFwdGF0aW9uICovXG5cbnZhciBnZXRCYXNlSW50cmluc2ljID0gZnVuY3Rpb24gZ2V0QmFzZUludHJpbnNpYyhuYW1lLCBhbGxvd01pc3NpbmcpIHtcblx0dmFyIGludHJpbnNpY05hbWUgPSBuYW1lO1xuXHR2YXIgYWxpYXM7XG5cdGlmIChoYXNPd24oTEVHQUNZX0FMSUFTRVMsIGludHJpbnNpY05hbWUpKSB7XG5cdFx0YWxpYXMgPSBMRUdBQ1lfQUxJQVNFU1tpbnRyaW5zaWNOYW1lXTtcblx0XHRpbnRyaW5zaWNOYW1lID0gJyUnICsgYWxpYXNbMF0gKyAnJSc7XG5cdH1cblxuXHRpZiAoaGFzT3duKElOVFJJTlNJQ1MsIGludHJpbnNpY05hbWUpKSB7XG5cdFx0dmFyIHZhbHVlID0gSU5UUklOU0lDU1tpbnRyaW5zaWNOYW1lXTtcblx0XHRpZiAodmFsdWUgPT09IG5lZWRzRXZhbCkge1xuXHRcdFx0dmFsdWUgPSBkb0V2YWwoaW50cmluc2ljTmFtZSk7XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICYmICFhbGxvd01pc3NpbmcpIHtcblx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdpbnRyaW5zaWMgJyArIG5hbWUgKyAnIGV4aXN0cywgYnV0IGlzIG5vdCBhdmFpbGFibGUuIFBsZWFzZSBmaWxlIGFuIGlzc3VlIScpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRhbGlhczogYWxpYXMsXG5cdFx0XHRuYW1lOiBpbnRyaW5zaWNOYW1lLFxuXHRcdFx0dmFsdWU6IHZhbHVlXG5cdFx0fTtcblx0fVxuXG5cdHRocm93IG5ldyAkU3ludGF4RXJyb3IoJ2ludHJpbnNpYyAnICsgbmFtZSArICcgZG9lcyBub3QgZXhpc3QhJyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIEdldEludHJpbnNpYyhuYW1lLCBhbGxvd01pc3NpbmcpIHtcblx0aWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJyB8fCBuYW1lLmxlbmd0aCA9PT0gMCkge1xuXHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdpbnRyaW5zaWMgbmFtZSBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZycpO1xuXHR9XG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSAmJiB0eXBlb2YgYWxsb3dNaXNzaW5nICE9PSAnYm9vbGVhbicpIHtcblx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignXCJhbGxvd01pc3NpbmdcIiBhcmd1bWVudCBtdXN0IGJlIGEgYm9vbGVhbicpO1xuXHR9XG5cblx0aWYgKCRleGVjKC9eJT9bXiVdKiU/JC8sIG5hbWUpID09PSBudWxsKSB7XG5cdFx0dGhyb3cgbmV3ICRTeW50YXhFcnJvcignYCVgIG1heSBub3QgYmUgcHJlc2VudCBhbnl3aGVyZSBidXQgYXQgdGhlIGJlZ2lubmluZyBhbmQgZW5kIG9mIHRoZSBpbnRyaW5zaWMgbmFtZScpO1xuXHR9XG5cdHZhciBwYXJ0cyA9IHN0cmluZ1RvUGF0aChuYW1lKTtcblx0dmFyIGludHJpbnNpY0Jhc2VOYW1lID0gcGFydHMubGVuZ3RoID4gMCA/IHBhcnRzWzBdIDogJyc7XG5cblx0dmFyIGludHJpbnNpYyA9IGdldEJhc2VJbnRyaW5zaWMoJyUnICsgaW50cmluc2ljQmFzZU5hbWUgKyAnJScsIGFsbG93TWlzc2luZyk7XG5cdHZhciBpbnRyaW5zaWNSZWFsTmFtZSA9IGludHJpbnNpYy5uYW1lO1xuXHR2YXIgdmFsdWUgPSBpbnRyaW5zaWMudmFsdWU7XG5cdHZhciBza2lwRnVydGhlckNhY2hpbmcgPSBmYWxzZTtcblxuXHR2YXIgYWxpYXMgPSBpbnRyaW5zaWMuYWxpYXM7XG5cdGlmIChhbGlhcykge1xuXHRcdGludHJpbnNpY0Jhc2VOYW1lID0gYWxpYXNbMF07XG5cdFx0JHNwbGljZUFwcGx5KHBhcnRzLCAkY29uY2F0KFswLCAxXSwgYWxpYXMpKTtcblx0fVxuXG5cdGZvciAodmFyIGkgPSAxLCBpc093biA9IHRydWU7IGkgPCBwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdHZhciBwYXJ0ID0gcGFydHNbaV07XG5cdFx0dmFyIGZpcnN0ID0gJHN0clNsaWNlKHBhcnQsIDAsIDEpO1xuXHRcdHZhciBsYXN0ID0gJHN0clNsaWNlKHBhcnQsIC0xKTtcblx0XHRpZiAoXG5cdFx0XHQoXG5cdFx0XHRcdChmaXJzdCA9PT0gJ1wiJyB8fCBmaXJzdCA9PT0gXCInXCIgfHwgZmlyc3QgPT09ICdgJylcblx0XHRcdFx0fHwgKGxhc3QgPT09ICdcIicgfHwgbGFzdCA9PT0gXCInXCIgfHwgbGFzdCA9PT0gJ2AnKVxuXHRcdFx0KVxuXHRcdFx0JiYgZmlyc3QgIT09IGxhc3Rcblx0XHQpIHtcblx0XHRcdHRocm93IG5ldyAkU3ludGF4RXJyb3IoJ3Byb3BlcnR5IG5hbWVzIHdpdGggcXVvdGVzIG11c3QgaGF2ZSBtYXRjaGluZyBxdW90ZXMnKTtcblx0XHR9XG5cdFx0aWYgKHBhcnQgPT09ICdjb25zdHJ1Y3RvcicgfHwgIWlzT3duKSB7XG5cdFx0XHRza2lwRnVydGhlckNhY2hpbmcgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGludHJpbnNpY0Jhc2VOYW1lICs9ICcuJyArIHBhcnQ7XG5cdFx0aW50cmluc2ljUmVhbE5hbWUgPSAnJScgKyBpbnRyaW5zaWNCYXNlTmFtZSArICclJztcblxuXHRcdGlmIChoYXNPd24oSU5UUklOU0lDUywgaW50cmluc2ljUmVhbE5hbWUpKSB7XG5cdFx0XHR2YWx1ZSA9IElOVFJJTlNJQ1NbaW50cmluc2ljUmVhbE5hbWVdO1xuXHRcdH0gZWxzZSBpZiAodmFsdWUgIT0gbnVsbCkge1xuXHRcdFx0aWYgKCEocGFydCBpbiB2YWx1ZSkpIHtcblx0XHRcdFx0aWYgKCFhbGxvd01pc3NpbmcpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYmFzZSBpbnRyaW5zaWMgZm9yICcgKyBuYW1lICsgJyBleGlzdHMsIGJ1dCB0aGUgcHJvcGVydHkgaXMgbm90IGF2YWlsYWJsZS4nKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdm9pZCB1bmRlZmluZWQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoJGdPUEQgJiYgKGkgKyAxKSA+PSBwYXJ0cy5sZW5ndGgpIHtcblx0XHRcdFx0dmFyIGRlc2MgPSAkZ09QRCh2YWx1ZSwgcGFydCk7XG5cdFx0XHRcdGlzT3duID0gISFkZXNjO1xuXG5cdFx0XHRcdC8vIEJ5IGNvbnZlbnRpb24sIHdoZW4gYSBkYXRhIHByb3BlcnR5IGlzIGNvbnZlcnRlZCB0byBhbiBhY2Nlc3NvclxuXHRcdFx0XHQvLyBwcm9wZXJ0eSB0byBlbXVsYXRlIGEgZGF0YSBwcm9wZXJ0eSB0aGF0IGRvZXMgbm90IHN1ZmZlciBmcm9tXG5cdFx0XHRcdC8vIHRoZSBvdmVycmlkZSBtaXN0YWtlLCB0aGF0IGFjY2Vzc29yJ3MgZ2V0dGVyIGlzIG1hcmtlZCB3aXRoXG5cdFx0XHRcdC8vIGFuIGBvcmlnaW5hbFZhbHVlYCBwcm9wZXJ0eS4gSGVyZSwgd2hlbiB3ZSBkZXRlY3QgdGhpcywgd2Vcblx0XHRcdFx0Ly8gdXBob2xkIHRoZSBpbGx1c2lvbiBieSBwcmV0ZW5kaW5nIHRvIHNlZSB0aGF0IG9yaWdpbmFsIGRhdGFcblx0XHRcdFx0Ly8gcHJvcGVydHksIGkuZS4sIHJldHVybmluZyB0aGUgdmFsdWUgcmF0aGVyIHRoYW4gdGhlIGdldHRlclxuXHRcdFx0XHQvLyBpdHNlbGYuXG5cdFx0XHRcdGlmIChpc093biAmJiAnZ2V0JyBpbiBkZXNjICYmICEoJ29yaWdpbmFsVmFsdWUnIGluIGRlc2MuZ2V0KSkge1xuXHRcdFx0XHRcdHZhbHVlID0gZGVzYy5nZXQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFsdWUgPSB2YWx1ZVtwYXJ0XTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aXNPd24gPSBoYXNPd24odmFsdWUsIHBhcnQpO1xuXHRcdFx0XHR2YWx1ZSA9IHZhbHVlW3BhcnRdO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoaXNPd24gJiYgIXNraXBGdXJ0aGVyQ2FjaGluZykge1xuXHRcdFx0XHRJTlRSSU5TSUNTW2ludHJpbnNpY1JlYWxOYW1lXSA9IHZhbHVlO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRyZXR1cm4gdmFsdWU7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgb3JpZ1N5bWJvbCA9IHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbDtcbnZhciBoYXNTeW1ib2xTaGFtID0gcmVxdWlyZSgnLi9zaGFtcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGhhc05hdGl2ZVN5bWJvbHMoKSB7XG5cdGlmICh0eXBlb2Ygb3JpZ1N5bWJvbCAhPT0gJ2Z1bmN0aW9uJykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKHR5cGVvZiBTeW1ib2wgIT09ICdmdW5jdGlvbicpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmICh0eXBlb2Ygb3JpZ1N5bWJvbCgnZm9vJykgIT09ICdzeW1ib2wnKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAodHlwZW9mIFN5bWJvbCgnYmFyJykgIT09ICdzeW1ib2wnKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdHJldHVybiBoYXNTeW1ib2xTaGFtKCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBlc2xpbnQgY29tcGxleGl0eTogWzIsIDE4XSwgbWF4LXN0YXRlbWVudHM6IFsyLCAzM10gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaGFzU3ltYm9scygpIHtcblx0aWYgKHR5cGVvZiBTeW1ib2wgIT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgIT09ICdmdW5jdGlvbicpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmICh0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSAnc3ltYm9sJykgeyByZXR1cm4gdHJ1ZTsgfVxuXG5cdHZhciBvYmogPSB7fTtcblx0dmFyIHN5bSA9IFN5bWJvbCgndGVzdCcpO1xuXHR2YXIgc3ltT2JqID0gT2JqZWN0KHN5bSk7XG5cdGlmICh0eXBlb2Ygc3ltID09PSAnc3RyaW5nJykgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN5bSkgIT09ICdbb2JqZWN0IFN5bWJvbF0nKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN5bU9iaikgIT09ICdbb2JqZWN0IFN5bWJvbF0nKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdC8vIHRlbXAgZGlzYWJsZWQgcGVyIGh0dHBzOi8vZ2l0aHViLmNvbS9samhhcmIvb2JqZWN0LmFzc2lnbi9pc3N1ZXMvMTdcblx0Ly8gaWYgKHN5bSBpbnN0YW5jZW9mIFN5bWJvbCkgeyByZXR1cm4gZmFsc2U7IH1cblx0Ly8gdGVtcCBkaXNhYmxlZCBwZXIgaHR0cHM6Ly9naXRodWIuY29tL1dlYlJlZmxlY3Rpb24vZ2V0LW93bi1wcm9wZXJ0eS1zeW1ib2xzL2lzc3Vlcy80XG5cdC8vIGlmICghKHN5bU9iaiBpbnN0YW5jZW9mIFN5bWJvbCkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0Ly8gaWYgKHR5cGVvZiBTeW1ib2wucHJvdG90eXBlLnRvU3RyaW5nICE9PSAnZnVuY3Rpb24nKSB7IHJldHVybiBmYWxzZTsgfVxuXHQvLyBpZiAoU3RyaW5nKHN5bSkgIT09IFN5bWJvbC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzeW0pKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdHZhciBzeW1WYWwgPSA0Mjtcblx0b2JqW3N5bV0gPSBzeW1WYWw7XG5cdGZvciAoc3ltIGluIG9iaikgeyByZXR1cm4gZmFsc2U7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1yZXN0cmljdGVkLXN5bnRheCwgbm8tdW5yZWFjaGFibGUtbG9vcFxuXHRpZiAodHlwZW9mIE9iamVjdC5rZXlzID09PSAnZnVuY3Rpb24nICYmIE9iamVjdC5rZXlzKG9iaikubGVuZ3RoICE9PSAwKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdGlmICh0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgPT09ICdmdW5jdGlvbicgJiYgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqKS5sZW5ndGggIT09IDApIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0dmFyIHN5bXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iaik7XG5cdGlmIChzeW1zLmxlbmd0aCAhPT0gMSB8fCBzeW1zWzBdICE9PSBzeW0pIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0aWYgKCFPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwob2JqLCBzeW0pKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdGlmICh0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIHN5bSk7XG5cdFx0aWYgKGRlc2NyaXB0b3IudmFsdWUgIT09IHN5bVZhbCB8fCBkZXNjcmlwdG9yLmVudW1lcmFibGUgIT09IHRydWUpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBiaW5kID0gcmVxdWlyZSgnZnVuY3Rpb24tYmluZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmQuY2FsbChGdW5jdGlvbi5jYWxsLCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEdldEludHJpbnNpYyA9IHJlcXVpcmUoJ2dldC1pbnRyaW5zaWMnKTtcbnZhciBoYXMgPSByZXF1aXJlKCdoYXMnKTtcbnZhciBjaGFubmVsID0gcmVxdWlyZSgnc2lkZS1jaGFubmVsJykoKTtcblxudmFyICRUeXBlRXJyb3IgPSBHZXRJbnRyaW5zaWMoJyVUeXBlRXJyb3IlJyk7XG5cbnZhciBTTE9UID0ge1xuXHRhc3NlcnQ6IGZ1bmN0aW9uIChPLCBzbG90KSB7XG5cdFx0aWYgKCFPIHx8ICh0eXBlb2YgTyAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIE8gIT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYE9gIGlzIG5vdCBhbiBvYmplY3QnKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBzbG90ICE9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2BzbG90YCBtdXN0IGJlIGEgc3RyaW5nJyk7XG5cdFx0fVxuXHRcdGNoYW5uZWwuYXNzZXJ0KE8pO1xuXHRcdGlmICghU0xPVC5oYXMoTywgc2xvdCkpIHtcblx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdgc2xvdGAgaXMgbm90IHByZXNlbnQgb24gYE9gJyk7XG5cdFx0fVxuXHR9LFxuXHRnZXQ6IGZ1bmN0aW9uIChPLCBzbG90KSB7XG5cdFx0aWYgKCFPIHx8ICh0eXBlb2YgTyAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIE8gIT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYE9gIGlzIG5vdCBhbiBvYmplY3QnKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBzbG90ICE9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2BzbG90YCBtdXN0IGJlIGEgc3RyaW5nJyk7XG5cdFx0fVxuXHRcdHZhciBzbG90cyA9IGNoYW5uZWwuZ2V0KE8pO1xuXHRcdHJldHVybiBzbG90cyAmJiBzbG90c1snJCcgKyBzbG90XTtcblx0fSxcblx0aGFzOiBmdW5jdGlvbiAoTywgc2xvdCkge1xuXHRcdGlmICghTyB8fCAodHlwZW9mIE8gIT09ICdvYmplY3QnICYmIHR5cGVvZiBPICE9PSAnZnVuY3Rpb24nKSkge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2BPYCBpcyBub3QgYW4gb2JqZWN0Jyk7XG5cdFx0fVxuXHRcdGlmICh0eXBlb2Ygc2xvdCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdgc2xvdGAgbXVzdCBiZSBhIHN0cmluZycpO1xuXHRcdH1cblx0XHR2YXIgc2xvdHMgPSBjaGFubmVsLmdldChPKTtcblx0XHRyZXR1cm4gISFzbG90cyAmJiBoYXMoc2xvdHMsICckJyArIHNsb3QpO1xuXHR9LFxuXHRzZXQ6IGZ1bmN0aW9uIChPLCBzbG90LCBWKSB7XG5cdFx0aWYgKCFPIHx8ICh0eXBlb2YgTyAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIE8gIT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYE9gIGlzIG5vdCBhbiBvYmplY3QnKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBzbG90ICE9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2BzbG90YCBtdXN0IGJlIGEgc3RyaW5nJyk7XG5cdFx0fVxuXHRcdHZhciBzbG90cyA9IGNoYW5uZWwuZ2V0KE8pO1xuXHRcdGlmICghc2xvdHMpIHtcblx0XHRcdHNsb3RzID0ge307XG5cdFx0XHRjaGFubmVsLnNldChPLCBzbG90cyk7XG5cdFx0fVxuXHRcdHNsb3RzWyckJyArIHNsb3RdID0gVjtcblx0fVxufTtcblxuaWYgKE9iamVjdC5mcmVlemUpIHtcblx0T2JqZWN0LmZyZWV6ZShTTE9UKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTTE9UO1xuIiwidmFyIGhhc01hcCA9IHR5cGVvZiBNYXAgPT09ICdmdW5jdGlvbicgJiYgTWFwLnByb3RvdHlwZTtcbnZhciBtYXBTaXplRGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgJiYgaGFzTWFwID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihNYXAucHJvdG90eXBlLCAnc2l6ZScpIDogbnVsbDtcbnZhciBtYXBTaXplID0gaGFzTWFwICYmIG1hcFNpemVEZXNjcmlwdG9yICYmIHR5cGVvZiBtYXBTaXplRGVzY3JpcHRvci5nZXQgPT09ICdmdW5jdGlvbicgPyBtYXBTaXplRGVzY3JpcHRvci5nZXQgOiBudWxsO1xudmFyIG1hcEZvckVhY2ggPSBoYXNNYXAgJiYgTWFwLnByb3RvdHlwZS5mb3JFYWNoO1xudmFyIGhhc1NldCA9IHR5cGVvZiBTZXQgPT09ICdmdW5jdGlvbicgJiYgU2V0LnByb3RvdHlwZTtcbnZhciBzZXRTaXplRGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgJiYgaGFzU2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihTZXQucHJvdG90eXBlLCAnc2l6ZScpIDogbnVsbDtcbnZhciBzZXRTaXplID0gaGFzU2V0ICYmIHNldFNpemVEZXNjcmlwdG9yICYmIHR5cGVvZiBzZXRTaXplRGVzY3JpcHRvci5nZXQgPT09ICdmdW5jdGlvbicgPyBzZXRTaXplRGVzY3JpcHRvci5nZXQgOiBudWxsO1xudmFyIHNldEZvckVhY2ggPSBoYXNTZXQgJiYgU2V0LnByb3RvdHlwZS5mb3JFYWNoO1xudmFyIGhhc1dlYWtNYXAgPSB0eXBlb2YgV2Vha01hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBXZWFrTWFwLnByb3RvdHlwZTtcbnZhciB3ZWFrTWFwSGFzID0gaGFzV2Vha01hcCA/IFdlYWtNYXAucHJvdG90eXBlLmhhcyA6IG51bGw7XG52YXIgaGFzV2Vha1NldCA9IHR5cGVvZiBXZWFrU2V0ID09PSAnZnVuY3Rpb24nICYmIFdlYWtTZXQucHJvdG90eXBlO1xudmFyIHdlYWtTZXRIYXMgPSBoYXNXZWFrU2V0ID8gV2Vha1NldC5wcm90b3R5cGUuaGFzIDogbnVsbDtcbnZhciBoYXNXZWFrUmVmID0gdHlwZW9mIFdlYWtSZWYgPT09ICdmdW5jdGlvbicgJiYgV2Vha1JlZi5wcm90b3R5cGU7XG52YXIgd2Vha1JlZkRlcmVmID0gaGFzV2Vha1JlZiA/IFdlYWtSZWYucHJvdG90eXBlLmRlcmVmIDogbnVsbDtcbnZhciBib29sZWFuVmFsdWVPZiA9IEJvb2xlYW4ucHJvdG90eXBlLnZhbHVlT2Y7XG52YXIgb2JqZWN0VG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIGZ1bmN0aW9uVG9TdHJpbmcgPSBGdW5jdGlvbi5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgJG1hdGNoID0gU3RyaW5nLnByb3RvdHlwZS5tYXRjaDtcbnZhciAkc2xpY2UgPSBTdHJpbmcucHJvdG90eXBlLnNsaWNlO1xudmFyICRyZXBsYWNlID0gU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlO1xudmFyICR0b1VwcGVyQ2FzZSA9IFN0cmluZy5wcm90b3R5cGUudG9VcHBlckNhc2U7XG52YXIgJHRvTG93ZXJDYXNlID0gU3RyaW5nLnByb3RvdHlwZS50b0xvd2VyQ2FzZTtcbnZhciAkdGVzdCA9IFJlZ0V4cC5wcm90b3R5cGUudGVzdDtcbnZhciAkY29uY2F0ID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdDtcbnZhciAkam9pbiA9IEFycmF5LnByb3RvdHlwZS5qb2luO1xudmFyICRhcnJTbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciAkZmxvb3IgPSBNYXRoLmZsb29yO1xudmFyIGJpZ0ludFZhbHVlT2YgPSB0eXBlb2YgQmlnSW50ID09PSAnZnVuY3Rpb24nID8gQmlnSW50LnByb3RvdHlwZS52YWx1ZU9mIDogbnVsbDtcbnZhciBnT1BTID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scztcbnZhciBzeW1Ub1N0cmluZyA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gJ3N5bWJvbCcgPyBTeW1ib2wucHJvdG90eXBlLnRvU3RyaW5nIDogbnVsbDtcbnZhciBoYXNTaGFtbWVkU3ltYm9scyA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gJ29iamVjdCc7XG4vLyBpZSwgYGhhcy10b3N0cmluZ3RhZy9zaGFtc1xudmFyIHRvU3RyaW5nVGFnID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcgJiYgKHR5cGVvZiBTeW1ib2wudG9TdHJpbmdUYWcgPT09IGhhc1NoYW1tZWRTeW1ib2xzID8gJ29iamVjdCcgOiAnc3ltYm9sJylcbiAgICA/IFN5bWJvbC50b1N0cmluZ1RhZ1xuICAgIDogbnVsbDtcbnZhciBpc0VudW1lcmFibGUgPSBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG52YXIgZ1BPID0gKHR5cGVvZiBSZWZsZWN0ID09PSAnZnVuY3Rpb24nID8gUmVmbGVjdC5nZXRQcm90b3R5cGVPZiA6IE9iamVjdC5nZXRQcm90b3R5cGVPZikgfHwgKFxuICAgIFtdLl9fcHJvdG9fXyA9PT0gQXJyYXkucHJvdG90eXBlIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcHJvdG9cbiAgICAgICAgPyBmdW5jdGlvbiAoTykge1xuICAgICAgICAgICAgcmV0dXJuIE8uX19wcm90b19fOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXByb3RvXG4gICAgICAgIH1cbiAgICAgICAgOiBudWxsXG4pO1xuXG5mdW5jdGlvbiBhZGROdW1lcmljU2VwYXJhdG9yKG51bSwgc3RyKSB7XG4gICAgaWYgKFxuICAgICAgICBudW0gPT09IEluZmluaXR5XG4gICAgICAgIHx8IG51bSA9PT0gLUluZmluaXR5XG4gICAgICAgIHx8IG51bSAhPT0gbnVtXG4gICAgICAgIHx8IChudW0gJiYgbnVtID4gLTEwMDAgJiYgbnVtIDwgMTAwMClcbiAgICAgICAgfHwgJHRlc3QuY2FsbCgvZS8sIHN0cilcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgdmFyIHNlcFJlZ2V4ID0gL1swLTldKD89KD86WzAtOV17M30pKyg/IVswLTldKSkvZztcbiAgICBpZiAodHlwZW9mIG51bSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgdmFyIGludCA9IG51bSA8IDAgPyAtJGZsb29yKC1udW0pIDogJGZsb29yKG51bSk7IC8vIHRydW5jKG51bSlcbiAgICAgICAgaWYgKGludCAhPT0gbnVtKSB7XG4gICAgICAgICAgICB2YXIgaW50U3RyID0gU3RyaW5nKGludCk7XG4gICAgICAgICAgICB2YXIgZGVjID0gJHNsaWNlLmNhbGwoc3RyLCBpbnRTdHIubGVuZ3RoICsgMSk7XG4gICAgICAgICAgICByZXR1cm4gJHJlcGxhY2UuY2FsbChpbnRTdHIsIHNlcFJlZ2V4LCAnJCZfJykgKyAnLicgKyAkcmVwbGFjZS5jYWxsKCRyZXBsYWNlLmNhbGwoZGVjLCAvKFswLTldezN9KS9nLCAnJCZfJyksIC9fJC8sICcnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gJHJlcGxhY2UuY2FsbChzdHIsIHNlcFJlZ2V4LCAnJCZfJyk7XG59XG5cbnZhciB1dGlsSW5zcGVjdCA9IHJlcXVpcmUoJy4vdXRpbC5pbnNwZWN0Jyk7XG52YXIgaW5zcGVjdEN1c3RvbSA9IHV0aWxJbnNwZWN0LmN1c3RvbTtcbnZhciBpbnNwZWN0U3ltYm9sID0gaXNTeW1ib2woaW5zcGVjdEN1c3RvbSkgPyBpbnNwZWN0Q3VzdG9tIDogbnVsbDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbnNwZWN0XyhvYmosIG9wdGlvbnMsIGRlcHRoLCBzZWVuKSB7XG4gICAgdmFyIG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgaWYgKGhhcyhvcHRzLCAncXVvdGVTdHlsZScpICYmIChvcHRzLnF1b3RlU3R5bGUgIT09ICdzaW5nbGUnICYmIG9wdHMucXVvdGVTdHlsZSAhPT0gJ2RvdWJsZScpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbiBcInF1b3RlU3R5bGVcIiBtdXN0IGJlIFwic2luZ2xlXCIgb3IgXCJkb3VibGVcIicpO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICAgIGhhcyhvcHRzLCAnbWF4U3RyaW5nTGVuZ3RoJykgJiYgKHR5cGVvZiBvcHRzLm1heFN0cmluZ0xlbmd0aCA9PT0gJ251bWJlcidcbiAgICAgICAgICAgID8gb3B0cy5tYXhTdHJpbmdMZW5ndGggPCAwICYmIG9wdHMubWF4U3RyaW5nTGVuZ3RoICE9PSBJbmZpbml0eVxuICAgICAgICAgICAgOiBvcHRzLm1heFN0cmluZ0xlbmd0aCAhPT0gbnVsbFxuICAgICAgICApXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbiBcIm1heFN0cmluZ0xlbmd0aFwiLCBpZiBwcm92aWRlZCwgbXVzdCBiZSBhIHBvc2l0aXZlIGludGVnZXIsIEluZmluaXR5LCBvciBgbnVsbGAnKTtcbiAgICB9XG4gICAgdmFyIGN1c3RvbUluc3BlY3QgPSBoYXMob3B0cywgJ2N1c3RvbUluc3BlY3QnKSA/IG9wdHMuY3VzdG9tSW5zcGVjdCA6IHRydWU7XG4gICAgaWYgKHR5cGVvZiBjdXN0b21JbnNwZWN0ICE9PSAnYm9vbGVhbicgJiYgY3VzdG9tSW5zcGVjdCAhPT0gJ3N5bWJvbCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9uIFwiY3VzdG9tSW5zcGVjdFwiLCBpZiBwcm92aWRlZCwgbXVzdCBiZSBgdHJ1ZWAsIGBmYWxzZWAsIG9yIGBcXCdzeW1ib2xcXCdgJyk7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgICBoYXMob3B0cywgJ2luZGVudCcpXG4gICAgICAgICYmIG9wdHMuaW5kZW50ICE9PSBudWxsXG4gICAgICAgICYmIG9wdHMuaW5kZW50ICE9PSAnXFx0J1xuICAgICAgICAmJiAhKHBhcnNlSW50KG9wdHMuaW5kZW50LCAxMCkgPT09IG9wdHMuaW5kZW50ICYmIG9wdHMuaW5kZW50ID4gMClcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9uIFwiaW5kZW50XCIgbXVzdCBiZSBcIlxcXFx0XCIsIGFuIGludGVnZXIgPiAwLCBvciBgbnVsbGAnKTtcbiAgICB9XG4gICAgaWYgKGhhcyhvcHRzLCAnbnVtZXJpY1NlcGFyYXRvcicpICYmIHR5cGVvZiBvcHRzLm51bWVyaWNTZXBhcmF0b3IgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb24gXCJudW1lcmljU2VwYXJhdG9yXCIsIGlmIHByb3ZpZGVkLCBtdXN0IGJlIGB0cnVlYCBvciBgZmFsc2VgJyk7XG4gICAgfVxuICAgIHZhciBudW1lcmljU2VwYXJhdG9yID0gb3B0cy5udW1lcmljU2VwYXJhdG9yO1xuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiAndW5kZWZpbmVkJztcbiAgICB9XG4gICAgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gJ251bGwnO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHJldHVybiBvYmogPyAndHJ1ZScgOiAnZmFsc2UnO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gaW5zcGVjdFN0cmluZyhvYmosIG9wdHMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgaWYgKG9iaiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIEluZmluaXR5IC8gb2JqID4gMCA/ICcwJyA6ICctMCc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN0ciA9IFN0cmluZyhvYmopO1xuICAgICAgICByZXR1cm4gbnVtZXJpY1NlcGFyYXRvciA/IGFkZE51bWVyaWNTZXBhcmF0b3Iob2JqLCBzdHIpIDogc3RyO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ2JpZ2ludCcpIHtcbiAgICAgICAgdmFyIGJpZ0ludFN0ciA9IFN0cmluZyhvYmopICsgJ24nO1xuICAgICAgICByZXR1cm4gbnVtZXJpY1NlcGFyYXRvciA/IGFkZE51bWVyaWNTZXBhcmF0b3Iob2JqLCBiaWdJbnRTdHIpIDogYmlnSW50U3RyO1xuICAgIH1cblxuICAgIHZhciBtYXhEZXB0aCA9IHR5cGVvZiBvcHRzLmRlcHRoID09PSAndW5kZWZpbmVkJyA/IDUgOiBvcHRzLmRlcHRoO1xuICAgIGlmICh0eXBlb2YgZGVwdGggPT09ICd1bmRlZmluZWQnKSB7IGRlcHRoID0gMDsgfVxuICAgIGlmIChkZXB0aCA+PSBtYXhEZXB0aCAmJiBtYXhEZXB0aCA+IDAgJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGlzQXJyYXkob2JqKSA/ICdbQXJyYXldJyA6ICdbT2JqZWN0XSc7XG4gICAgfVxuXG4gICAgdmFyIGluZGVudCA9IGdldEluZGVudChvcHRzLCBkZXB0aCk7XG5cbiAgICBpZiAodHlwZW9mIHNlZW4gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHNlZW4gPSBbXTtcbiAgICB9IGVsc2UgaWYgKGluZGV4T2Yoc2Vlbiwgb2JqKSA+PSAwKSB7XG4gICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zcGVjdCh2YWx1ZSwgZnJvbSwgbm9JbmRlbnQpIHtcbiAgICAgICAgaWYgKGZyb20pIHtcbiAgICAgICAgICAgIHNlZW4gPSAkYXJyU2xpY2UuY2FsbChzZWVuKTtcbiAgICAgICAgICAgIHNlZW4ucHVzaChmcm9tKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9JbmRlbnQpIHtcbiAgICAgICAgICAgIHZhciBuZXdPcHRzID0ge1xuICAgICAgICAgICAgICAgIGRlcHRoOiBvcHRzLmRlcHRoXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGhhcyhvcHRzLCAncXVvdGVTdHlsZScpKSB7XG4gICAgICAgICAgICAgICAgbmV3T3B0cy5xdW90ZVN0eWxlID0gb3B0cy5xdW90ZVN0eWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluc3BlY3RfKHZhbHVlLCBuZXdPcHRzLCBkZXB0aCArIDEsIHNlZW4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnNwZWN0Xyh2YWx1ZSwgb3B0cywgZGVwdGggKyAxLCBzZWVuKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJyAmJiAhaXNSZWdFeHAob2JqKSkgeyAvLyBpbiBvbGRlciBlbmdpbmVzLCByZWdleGVzIGFyZSBjYWxsYWJsZVxuICAgICAgICB2YXIgbmFtZSA9IG5hbWVPZihvYmopO1xuICAgICAgICB2YXIga2V5cyA9IGFyck9iaktleXMob2JqLCBpbnNwZWN0KTtcbiAgICAgICAgcmV0dXJuICdbRnVuY3Rpb24nICsgKG5hbWUgPyAnOiAnICsgbmFtZSA6ICcgKGFub255bW91cyknKSArICddJyArIChrZXlzLmxlbmd0aCA+IDAgPyAnIHsgJyArICRqb2luLmNhbGwoa2V5cywgJywgJykgKyAnIH0nIDogJycpO1xuICAgIH1cbiAgICBpZiAoaXNTeW1ib2wob2JqKSkge1xuICAgICAgICB2YXIgc3ltU3RyaW5nID0gaGFzU2hhbW1lZFN5bWJvbHMgPyAkcmVwbGFjZS5jYWxsKFN0cmluZyhvYmopLCAvXihTeW1ib2xcXCguKlxcKSlfW14pXSokLywgJyQxJykgOiBzeW1Ub1N0cmluZy5jYWxsKG9iaik7XG4gICAgICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiAhaGFzU2hhbW1lZFN5bWJvbHMgPyBtYXJrQm94ZWQoc3ltU3RyaW5nKSA6IHN5bVN0cmluZztcbiAgICB9XG4gICAgaWYgKGlzRWxlbWVudChvYmopKSB7XG4gICAgICAgIHZhciBzID0gJzwnICsgJHRvTG93ZXJDYXNlLmNhbGwoU3RyaW5nKG9iai5ub2RlTmFtZSkpO1xuICAgICAgICB2YXIgYXR0cnMgPSBvYmouYXR0cmlidXRlcyB8fCBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhdHRycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcyArPSAnICcgKyBhdHRyc1tpXS5uYW1lICsgJz0nICsgd3JhcFF1b3RlcyhxdW90ZShhdHRyc1tpXS52YWx1ZSksICdkb3VibGUnLCBvcHRzKTtcbiAgICAgICAgfVxuICAgICAgICBzICs9ICc+JztcbiAgICAgICAgaWYgKG9iai5jaGlsZE5vZGVzICYmIG9iai5jaGlsZE5vZGVzLmxlbmd0aCkgeyBzICs9ICcuLi4nOyB9XG4gICAgICAgIHMgKz0gJzwvJyArICR0b0xvd2VyQ2FzZS5jYWxsKFN0cmluZyhvYmoubm9kZU5hbWUpKSArICc+JztcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAgICAgaWYgKG9iai5sZW5ndGggPT09IDApIHsgcmV0dXJuICdbXSc7IH1cbiAgICAgICAgdmFyIHhzID0gYXJyT2JqS2V5cyhvYmosIGluc3BlY3QpO1xuICAgICAgICBpZiAoaW5kZW50ICYmICFzaW5nbGVMaW5lVmFsdWVzKHhzKSkge1xuICAgICAgICAgICAgcmV0dXJuICdbJyArIGluZGVudGVkSm9pbih4cywgaW5kZW50KSArICddJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ1sgJyArICRqb2luLmNhbGwoeHMsICcsICcpICsgJyBdJztcbiAgICB9XG4gICAgaWYgKGlzRXJyb3Iob2JqKSkge1xuICAgICAgICB2YXIgcGFydHMgPSBhcnJPYmpLZXlzKG9iaiwgaW5zcGVjdCk7XG4gICAgICAgIGlmICghKCdjYXVzZScgaW4gRXJyb3IucHJvdG90eXBlKSAmJiAnY2F1c2UnIGluIG9iaiAmJiAhaXNFbnVtZXJhYmxlLmNhbGwob2JqLCAnY2F1c2UnKSkge1xuICAgICAgICAgICAgcmV0dXJuICd7IFsnICsgU3RyaW5nKG9iaikgKyAnXSAnICsgJGpvaW4uY2FsbCgkY29uY2F0LmNhbGwoJ1tjYXVzZV06ICcgKyBpbnNwZWN0KG9iai5jYXVzZSksIHBhcnRzKSwgJywgJykgKyAnIH0nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPT09IDApIHsgcmV0dXJuICdbJyArIFN0cmluZyhvYmopICsgJ10nOyB9XG4gICAgICAgIHJldHVybiAneyBbJyArIFN0cmluZyhvYmopICsgJ10gJyArICRqb2luLmNhbGwocGFydHMsICcsICcpICsgJyB9JztcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIGN1c3RvbUluc3BlY3QpIHtcbiAgICAgICAgaWYgKGluc3BlY3RTeW1ib2wgJiYgdHlwZW9mIG9ialtpbnNwZWN0U3ltYm9sXSA9PT0gJ2Z1bmN0aW9uJyAmJiB1dGlsSW5zcGVjdCkge1xuICAgICAgICAgICAgcmV0dXJuIHV0aWxJbnNwZWN0KG9iaiwgeyBkZXB0aDogbWF4RGVwdGggLSBkZXB0aCB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChjdXN0b21JbnNwZWN0ICE9PSAnc3ltYm9sJyAmJiB0eXBlb2Ygb2JqLmluc3BlY3QgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmouaW5zcGVjdCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpc01hcChvYmopKSB7XG4gICAgICAgIHZhciBtYXBQYXJ0cyA9IFtdO1xuICAgICAgICBtYXBGb3JFYWNoLmNhbGwob2JqLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgbWFwUGFydHMucHVzaChpbnNwZWN0KGtleSwgb2JqLCB0cnVlKSArICcgPT4gJyArIGluc3BlY3QodmFsdWUsIG9iaikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb25PZignTWFwJywgbWFwU2l6ZS5jYWxsKG9iaiksIG1hcFBhcnRzLCBpbmRlbnQpO1xuICAgIH1cbiAgICBpZiAoaXNTZXQob2JqKSkge1xuICAgICAgICB2YXIgc2V0UGFydHMgPSBbXTtcbiAgICAgICAgc2V0Rm9yRWFjaC5jYWxsKG9iaiwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBzZXRQYXJ0cy5wdXNoKGluc3BlY3QodmFsdWUsIG9iaikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb25PZignU2V0Jywgc2V0U2l6ZS5jYWxsKG9iaiksIHNldFBhcnRzLCBpbmRlbnQpO1xuICAgIH1cbiAgICBpZiAoaXNXZWFrTWFwKG9iaikpIHtcbiAgICAgICAgcmV0dXJuIHdlYWtDb2xsZWN0aW9uT2YoJ1dlYWtNYXAnKTtcbiAgICB9XG4gICAgaWYgKGlzV2Vha1NldChvYmopKSB7XG4gICAgICAgIHJldHVybiB3ZWFrQ29sbGVjdGlvbk9mKCdXZWFrU2V0Jyk7XG4gICAgfVxuICAgIGlmIChpc1dlYWtSZWYob2JqKSkge1xuICAgICAgICByZXR1cm4gd2Vha0NvbGxlY3Rpb25PZignV2Vha1JlZicpO1xuICAgIH1cbiAgICBpZiAoaXNOdW1iZXIob2JqKSkge1xuICAgICAgICByZXR1cm4gbWFya0JveGVkKGluc3BlY3QoTnVtYmVyKG9iaikpKTtcbiAgICB9XG4gICAgaWYgKGlzQmlnSW50KG9iaikpIHtcbiAgICAgICAgcmV0dXJuIG1hcmtCb3hlZChpbnNwZWN0KGJpZ0ludFZhbHVlT2YuY2FsbChvYmopKSk7XG4gICAgfVxuICAgIGlmIChpc0Jvb2xlYW4ob2JqKSkge1xuICAgICAgICByZXR1cm4gbWFya0JveGVkKGJvb2xlYW5WYWx1ZU9mLmNhbGwob2JqKSk7XG4gICAgfVxuICAgIGlmIChpc1N0cmluZyhvYmopKSB7XG4gICAgICAgIHJldHVybiBtYXJrQm94ZWQoaW5zcGVjdChTdHJpbmcob2JqKSkpO1xuICAgIH1cbiAgICBpZiAoIWlzRGF0ZShvYmopICYmICFpc1JlZ0V4cChvYmopKSB7XG4gICAgICAgIHZhciB5cyA9IGFyck9iaktleXMob2JqLCBpbnNwZWN0KTtcbiAgICAgICAgdmFyIGlzUGxhaW5PYmplY3QgPSBnUE8gPyBnUE8ob2JqKSA9PT0gT2JqZWN0LnByb3RvdHlwZSA6IG9iaiBpbnN0YW5jZW9mIE9iamVjdCB8fCBvYmouY29uc3RydWN0b3IgPT09IE9iamVjdDtcbiAgICAgICAgdmFyIHByb3RvVGFnID0gb2JqIGluc3RhbmNlb2YgT2JqZWN0ID8gJycgOiAnbnVsbCBwcm90b3R5cGUnO1xuICAgICAgICB2YXIgc3RyaW5nVGFnID0gIWlzUGxhaW5PYmplY3QgJiYgdG9TdHJpbmdUYWcgJiYgT2JqZWN0KG9iaikgPT09IG9iaiAmJiB0b1N0cmluZ1RhZyBpbiBvYmogPyAkc2xpY2UuY2FsbCh0b1N0cihvYmopLCA4LCAtMSkgOiBwcm90b1RhZyA/ICdPYmplY3QnIDogJyc7XG4gICAgICAgIHZhciBjb25zdHJ1Y3RvclRhZyA9IGlzUGxhaW5PYmplY3QgfHwgdHlwZW9mIG9iai5jb25zdHJ1Y3RvciAhPT0gJ2Z1bmN0aW9uJyA/ICcnIDogb2JqLmNvbnN0cnVjdG9yLm5hbWUgPyBvYmouY29uc3RydWN0b3IubmFtZSArICcgJyA6ICcnO1xuICAgICAgICB2YXIgdGFnID0gY29uc3RydWN0b3JUYWcgKyAoc3RyaW5nVGFnIHx8IHByb3RvVGFnID8gJ1snICsgJGpvaW4uY2FsbCgkY29uY2F0LmNhbGwoW10sIHN0cmluZ1RhZyB8fCBbXSwgcHJvdG9UYWcgfHwgW10pLCAnOiAnKSArICddICcgOiAnJyk7XG4gICAgICAgIGlmICh5cy5sZW5ndGggPT09IDApIHsgcmV0dXJuIHRhZyArICd7fSc7IH1cbiAgICAgICAgaWYgKGluZGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhZyArICd7JyArIGluZGVudGVkSm9pbih5cywgaW5kZW50KSArICd9JztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGFnICsgJ3sgJyArICRqb2luLmNhbGwoeXMsICcsICcpICsgJyB9JztcbiAgICB9XG4gICAgcmV0dXJuIFN0cmluZyhvYmopO1xufTtcblxuZnVuY3Rpb24gd3JhcFF1b3RlcyhzLCBkZWZhdWx0U3R5bGUsIG9wdHMpIHtcbiAgICB2YXIgcXVvdGVDaGFyID0gKG9wdHMucXVvdGVTdHlsZSB8fCBkZWZhdWx0U3R5bGUpID09PSAnZG91YmxlJyA/ICdcIicgOiBcIidcIjtcbiAgICByZXR1cm4gcXVvdGVDaGFyICsgcyArIHF1b3RlQ2hhcjtcbn1cblxuZnVuY3Rpb24gcXVvdGUocykge1xuICAgIHJldHVybiAkcmVwbGFjZS5jYWxsKFN0cmluZyhzKSwgL1wiL2csICcmcXVvdDsnKTtcbn1cblxuZnVuY3Rpb24gaXNBcnJheShvYmopIHsgcmV0dXJuIHRvU3RyKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XScgJiYgKCF0b1N0cmluZ1RhZyB8fCAhKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nVGFnIGluIG9iaikpOyB9XG5mdW5jdGlvbiBpc0RhdGUob2JqKSB7IHJldHVybiB0b1N0cihvYmopID09PSAnW29iamVjdCBEYXRlXScgJiYgKCF0b1N0cmluZ1RhZyB8fCAhKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nVGFnIGluIG9iaikpOyB9XG5mdW5jdGlvbiBpc1JlZ0V4cChvYmopIHsgcmV0dXJuIHRvU3RyKG9iaikgPT09ICdbb2JqZWN0IFJlZ0V4cF0nICYmICghdG9TdHJpbmdUYWcgfHwgISh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0b1N0cmluZ1RhZyBpbiBvYmopKTsgfVxuZnVuY3Rpb24gaXNFcnJvcihvYmopIHsgcmV0dXJuIHRvU3RyKG9iaikgPT09ICdbb2JqZWN0IEVycm9yXScgJiYgKCF0b1N0cmluZ1RhZyB8fCAhKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nVGFnIGluIG9iaikpOyB9XG5mdW5jdGlvbiBpc1N0cmluZyhvYmopIHsgcmV0dXJuIHRvU3RyKG9iaikgPT09ICdbb2JqZWN0IFN0cmluZ10nICYmICghdG9TdHJpbmdUYWcgfHwgISh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0b1N0cmluZ1RhZyBpbiBvYmopKTsgfVxuZnVuY3Rpb24gaXNOdW1iZXIob2JqKSB7IHJldHVybiB0b1N0cihvYmopID09PSAnW29iamVjdCBOdW1iZXJdJyAmJiAoIXRvU3RyaW5nVGFnIHx8ICEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmdUYWcgaW4gb2JqKSk7IH1cbmZ1bmN0aW9uIGlzQm9vbGVhbihvYmopIHsgcmV0dXJuIHRvU3RyKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJyAmJiAoIXRvU3RyaW5nVGFnIHx8ICEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmdUYWcgaW4gb2JqKSk7IH1cblxuLy8gU3ltYm9sIGFuZCBCaWdJbnQgZG8gaGF2ZSBTeW1ib2wudG9TdHJpbmdUYWcgYnkgc3BlYywgc28gdGhhdCBjYW4ndCBiZSB1c2VkIHRvIGVsaW1pbmF0ZSBmYWxzZSBwb3NpdGl2ZXNcbmZ1bmN0aW9uIGlzU3ltYm9sKG9iaikge1xuICAgIGlmIChoYXNTaGFtbWVkU3ltYm9scykge1xuICAgICAgICByZXR1cm4gb2JqICYmIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIG9iaiBpbnN0YW5jZW9mIFN5bWJvbDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdzeW1ib2wnKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoIW9iaiB8fCB0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCAhc3ltVG9TdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBzeW1Ub1N0cmluZy5jYWxsKG9iaik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc0JpZ0ludChvYmopIHtcbiAgICBpZiAoIW9iaiB8fCB0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCAhYmlnSW50VmFsdWVPZikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGJpZ0ludFZhbHVlT2YuY2FsbChvYmopO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkgfHwgZnVuY3Rpb24gKGtleSkgeyByZXR1cm4ga2V5IGluIHRoaXM7IH07XG5mdW5jdGlvbiBoYXMob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gaGFzT3duLmNhbGwob2JqLCBrZXkpO1xufVxuXG5mdW5jdGlvbiB0b1N0cihvYmopIHtcbiAgICByZXR1cm4gb2JqZWN0VG9TdHJpbmcuY2FsbChvYmopO1xufVxuXG5mdW5jdGlvbiBuYW1lT2YoZikge1xuICAgIGlmIChmLm5hbWUpIHsgcmV0dXJuIGYubmFtZTsgfVxuICAgIHZhciBtID0gJG1hdGNoLmNhbGwoZnVuY3Rpb25Ub1N0cmluZy5jYWxsKGYpLCAvXmZ1bmN0aW9uXFxzKihbXFx3JF0rKS8pO1xuICAgIGlmIChtKSB7IHJldHVybiBtWzFdOyB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGluZGV4T2YoeHMsIHgpIHtcbiAgICBpZiAoeHMuaW5kZXhPZikgeyByZXR1cm4geHMuaW5kZXhPZih4KTsgfVxuICAgIGZvciAodmFyIGkgPSAwLCBsID0geHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmICh4c1tpXSA9PT0geCkgeyByZXR1cm4gaTsgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIGlzTWFwKHgpIHtcbiAgICBpZiAoIW1hcFNpemUgfHwgIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgbWFwU2l6ZS5jYWxsKHgpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2V0U2l6ZS5jYWxsKHgpO1xuICAgICAgICB9IGNhdGNoIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCBpbnN0YW5jZW9mIE1hcDsgLy8gY29yZS1qcyB3b3JrYXJvdW5kLCBwcmUtdjIuNS4wXG4gICAgfSBjYXRjaCAoZSkge31cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzV2Vha01hcCh4KSB7XG4gICAgaWYgKCF3ZWFrTWFwSGFzIHx8ICF4IHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHdlYWtNYXBIYXMuY2FsbCh4LCB3ZWFrTWFwSGFzKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHdlYWtTZXRIYXMuY2FsbCh4LCB3ZWFrU2V0SGFzKTtcbiAgICAgICAgfSBjYXRjaCAocykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHggaW5zdGFuY2VvZiBXZWFrTWFwOyAvLyBjb3JlLWpzIHdvcmthcm91bmQsIHByZS12Mi41LjBcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNXZWFrUmVmKHgpIHtcbiAgICBpZiAoIXdlYWtSZWZEZXJlZiB8fCAheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICB3ZWFrUmVmRGVyZWYuY2FsbCh4KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge31cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzU2V0KHgpIHtcbiAgICBpZiAoIXNldFNpemUgfHwgIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgc2V0U2l6ZS5jYWxsKHgpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWFwU2l6ZS5jYWxsKHgpO1xuICAgICAgICB9IGNhdGNoIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCBpbnN0YW5jZW9mIFNldDsgLy8gY29yZS1qcyB3b3JrYXJvdW5kLCBwcmUtdjIuNS4wXG4gICAgfSBjYXRjaCAoZSkge31cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzV2Vha1NldCh4KSB7XG4gICAgaWYgKCF3ZWFrU2V0SGFzIHx8ICF4IHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHdlYWtTZXRIYXMuY2FsbCh4LCB3ZWFrU2V0SGFzKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHdlYWtNYXBIYXMuY2FsbCh4LCB3ZWFrTWFwSGFzKTtcbiAgICAgICAgfSBjYXRjaCAocykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHggaW5zdGFuY2VvZiBXZWFrU2V0OyAvLyBjb3JlLWpzIHdvcmthcm91bmQsIHByZS12Mi41LjBcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNFbGVtZW50KHgpIHtcbiAgICBpZiAoIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIGlmICh0eXBlb2YgSFRNTEVsZW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHggaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVvZiB4Lm5vZGVOYW1lID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgeC5nZXRBdHRyaWJ1dGUgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGluc3BlY3RTdHJpbmcoc3RyLCBvcHRzKSB7XG4gICAgaWYgKHN0ci5sZW5ndGggPiBvcHRzLm1heFN0cmluZ0xlbmd0aCkge1xuICAgICAgICB2YXIgcmVtYWluaW5nID0gc3RyLmxlbmd0aCAtIG9wdHMubWF4U3RyaW5nTGVuZ3RoO1xuICAgICAgICB2YXIgdHJhaWxlciA9ICcuLi4gJyArIHJlbWFpbmluZyArICcgbW9yZSBjaGFyYWN0ZXInICsgKHJlbWFpbmluZyA+IDEgPyAncycgOiAnJyk7XG4gICAgICAgIHJldHVybiBpbnNwZWN0U3RyaW5nKCRzbGljZS5jYWxsKHN0ciwgMCwgb3B0cy5tYXhTdHJpbmdMZW5ndGgpLCBvcHRzKSArIHRyYWlsZXI7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb250cm9sLXJlZ2V4XG4gICAgdmFyIHMgPSAkcmVwbGFjZS5jYWxsKCRyZXBsYWNlLmNhbGwoc3RyLCAvKFsnXFxcXF0pL2csICdcXFxcJDEnKSwgL1tcXHgwMC1cXHgxZl0vZywgbG93Ynl0ZSk7XG4gICAgcmV0dXJuIHdyYXBRdW90ZXMocywgJ3NpbmdsZScsIG9wdHMpO1xufVxuXG5mdW5jdGlvbiBsb3dieXRlKGMpIHtcbiAgICB2YXIgbiA9IGMuY2hhckNvZGVBdCgwKTtcbiAgICB2YXIgeCA9IHtcbiAgICAgICAgODogJ2InLFxuICAgICAgICA5OiAndCcsXG4gICAgICAgIDEwOiAnbicsXG4gICAgICAgIDEyOiAnZicsXG4gICAgICAgIDEzOiAncidcbiAgICB9W25dO1xuICAgIGlmICh4KSB7IHJldHVybiAnXFxcXCcgKyB4OyB9XG4gICAgcmV0dXJuICdcXFxceCcgKyAobiA8IDB4MTAgPyAnMCcgOiAnJykgKyAkdG9VcHBlckNhc2UuY2FsbChuLnRvU3RyaW5nKDE2KSk7XG59XG5cbmZ1bmN0aW9uIG1hcmtCb3hlZChzdHIpIHtcbiAgICByZXR1cm4gJ09iamVjdCgnICsgc3RyICsgJyknO1xufVxuXG5mdW5jdGlvbiB3ZWFrQ29sbGVjdGlvbk9mKHR5cGUpIHtcbiAgICByZXR1cm4gdHlwZSArICcgeyA/IH0nO1xufVxuXG5mdW5jdGlvbiBjb2xsZWN0aW9uT2YodHlwZSwgc2l6ZSwgZW50cmllcywgaW5kZW50KSB7XG4gICAgdmFyIGpvaW5lZEVudHJpZXMgPSBpbmRlbnQgPyBpbmRlbnRlZEpvaW4oZW50cmllcywgaW5kZW50KSA6ICRqb2luLmNhbGwoZW50cmllcywgJywgJyk7XG4gICAgcmV0dXJuIHR5cGUgKyAnICgnICsgc2l6ZSArICcpIHsnICsgam9pbmVkRW50cmllcyArICd9Jztcbn1cblxuZnVuY3Rpb24gc2luZ2xlTGluZVZhbHVlcyh4cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGluZGV4T2YoeHNbaV0sICdcXG4nKSA+PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGdldEluZGVudChvcHRzLCBkZXB0aCkge1xuICAgIHZhciBiYXNlSW5kZW50O1xuICAgIGlmIChvcHRzLmluZGVudCA9PT0gJ1xcdCcpIHtcbiAgICAgICAgYmFzZUluZGVudCA9ICdcXHQnO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG9wdHMuaW5kZW50ID09PSAnbnVtYmVyJyAmJiBvcHRzLmluZGVudCA+IDApIHtcbiAgICAgICAgYmFzZUluZGVudCA9ICRqb2luLmNhbGwoQXJyYXkob3B0cy5pbmRlbnQgKyAxKSwgJyAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgYmFzZTogYmFzZUluZGVudCxcbiAgICAgICAgcHJldjogJGpvaW4uY2FsbChBcnJheShkZXB0aCArIDEpLCBiYXNlSW5kZW50KVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGluZGVudGVkSm9pbih4cywgaW5kZW50KSB7XG4gICAgaWYgKHhzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gJyc7IH1cbiAgICB2YXIgbGluZUpvaW5lciA9ICdcXG4nICsgaW5kZW50LnByZXYgKyBpbmRlbnQuYmFzZTtcbiAgICByZXR1cm4gbGluZUpvaW5lciArICRqb2luLmNhbGwoeHMsICcsJyArIGxpbmVKb2luZXIpICsgJ1xcbicgKyBpbmRlbnQucHJldjtcbn1cblxuZnVuY3Rpb24gYXJyT2JqS2V5cyhvYmosIGluc3BlY3QpIHtcbiAgICB2YXIgaXNBcnIgPSBpc0FycmF5KG9iaik7XG4gICAgdmFyIHhzID0gW107XG4gICAgaWYgKGlzQXJyKSB7XG4gICAgICAgIHhzLmxlbmd0aCA9IG9iai5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB4c1tpXSA9IGhhcyhvYmosIGkpID8gaW5zcGVjdChvYmpbaV0sIG9iaikgOiAnJztcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgc3ltcyA9IHR5cGVvZiBnT1BTID09PSAnZnVuY3Rpb24nID8gZ09QUyhvYmopIDogW107XG4gICAgdmFyIHN5bU1hcDtcbiAgICBpZiAoaGFzU2hhbW1lZFN5bWJvbHMpIHtcbiAgICAgICAgc3ltTWFwID0ge307XG4gICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgc3ltcy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgc3ltTWFwWyckJyArIHN5bXNba11dID0gc3ltc1trXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1yZXN0cmljdGVkLXN5bnRheFxuICAgICAgICBpZiAoIWhhcyhvYmosIGtleSkpIHsgY29udGludWU7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1yZXN0cmljdGVkLXN5bnRheCwgbm8tY29udGludWVcbiAgICAgICAgaWYgKGlzQXJyICYmIFN0cmluZyhOdW1iZXIoa2V5KSkgPT09IGtleSAmJiBrZXkgPCBvYmoubGVuZ3RoKSB7IGNvbnRpbnVlOyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcmVzdHJpY3RlZC1zeW50YXgsIG5vLWNvbnRpbnVlXG4gICAgICAgIGlmIChoYXNTaGFtbWVkU3ltYm9scyAmJiBzeW1NYXBbJyQnICsga2V5XSBpbnN0YW5jZW9mIFN5bWJvbCkge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyB0byBwcmV2ZW50IHNoYW1tZWQgU3ltYm9scywgd2hpY2ggYXJlIHN0b3JlZCBhcyBzdHJpbmdzLCBmcm9tIGJlaW5nIGluY2x1ZGVkIGluIHRoZSBzdHJpbmcga2V5IHNlY3Rpb25cbiAgICAgICAgICAgIGNvbnRpbnVlOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXJlc3RyaWN0ZWQtc3ludGF4LCBuby1jb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKCR0ZXN0LmNhbGwoL1teXFx3JF0vLCBrZXkpKSB7XG4gICAgICAgICAgICB4cy5wdXNoKGluc3BlY3Qoa2V5LCBvYmopICsgJzogJyArIGluc3BlY3Qob2JqW2tleV0sIG9iaikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeHMucHVzaChrZXkgKyAnOiAnICsgaW5zcGVjdChvYmpba2V5XSwgb2JqKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR5cGVvZiBnT1BTID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgc3ltcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgaWYgKGlzRW51bWVyYWJsZS5jYWxsKG9iaiwgc3ltc1tqXSkpIHtcbiAgICAgICAgICAgICAgICB4cy5wdXNoKCdbJyArIGluc3BlY3Qoc3ltc1tqXSkgKyAnXTogJyArIGluc3BlY3Qob2JqW3N5bXNbal1dLCBvYmopKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geHM7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBcIlxcXCJOb29kbGVzLiBXZSBhbGwgZWF0IHRoZW0uIFdlIGFsbCBsb3ZlIHRoZW0uIEFuZCBEaWFtb25kIENpdHkncyBQb3dlciBOb29kbGVzIGhhcyBzdXBwbGllZCB0aGlzIHN1c3RlbmFuY2UgZm9yIHRoZSBwYXN0IGZpZnRlZW4geWVhcnMuIEZyb20gdGhlIHN0aWx0ZWQgbWVjaGFuaWNhbCBjYWRlbmNlIG9mIFRha2FoYXNoaSdzIHByb2dyYW1tZWQgSmFwYW5lc2UsIHRvIHRoZSBmcmFncmFudCBzdGVhbSB0aGF0IHdhZnRzIGZyb20gZWFjaCBib3dsLCB0byB0aGUgc2NhbGRpbmcgdGFuZyBvZiBlYWNoIGRlbGljaW91cyBtb3V0aGZ1bCAtIHRoZSBvcmRlcmluZyBhbmQgZWF0aW5nIG9mIG5vb2RsZXMgaXMgYnV0IG9uZSBvZiBtYW55IHNoYXJlZCBodW1hbiBleHBlcmllbmNlcy4gT3IgaXMgaXQ/XFxcIiBcXG4tVGhlIFN5bnRoZXRpYyBUcnV0aFxcblxcblRoaXMgc3RydWN0dXJlIGRpcmVjdGx5IG9wcG9zaXRlIHRoZSBjaXR5J3MgbWFpbiBlbnRyYW5jZSBpbiB0aGUgY2VudGVyIG9mIHRoZSBtYXJrZXQgaXMgYSBzbWFsbCBvdXRkb29yIHJlc3RhdXJhbnQuIENvdW50ZXJzIGVuY2lyY2xlIGEgY2VudHJhbCBwaWxsYXIsIHdpdGggVGFrYWhhc2hpIGJlaGluZCBvbmUgb2YgdGhlbS4gQSBjb29raW5nIHN0YXRpb24gc2l0cyBuZWFyYnkuIFRoZSBwaWxsYXIgZmVhdHVyZXMgYSBmdW5jdGlvbmFsIHBvd2VyIHJlYWN0b3IsIHN1cHBseWluZyB0aGUgc3Vycm91bmRpbmcgYnVpbGRpbmdzIHdpdGggZWxlY3RyaWNpdHkuXFxuXFxuQXBwcm94aW1hdGVseSA0MyB5ZWFycyBiZWZvcmUgUG93ZXIgTm9vZGxlcyB3YXMgZXN0YWJsaXNoZWQsIGEgYmFyIHRoYXQgb2NjdXBpZWQgdGhlIHNhbWUgc3BhY2UgaW4gdGhlIG1hcmtldCB3YXMgdGhlIHNjZW5lIG9mIHRoZSBCcm9rZW4gTWFzayBpbmNpZGVudC4gVGhpcyB2aW9sZW50IGV2ZW50IHJlc3VsdGVkIGluIHRoZSBkZWF0aCBvZiB0ZW4gaW5kaXZpZHVhbHMgYXQgdGhlIGhhbmQgb2YgYSBtYWxmdW5jdGlvbmluZyBJbnN0aXR1dGUgc3ludGggaW4gTWF5IDIyMjkuXFxuXFxuVXBvbiBtZWV0aW5nIFRha2FoYXNoaSBmb3IgdGhlIGZpcnN0IHRpbWUgYW5kIGhlYXJpbmcgaGlzIHNpZ25hdHVyZSBxdWVzdGlvbiAoXFxcIk5hbi1uaSBzaGltYXNrby1rYT9cXFwiKSwgYSBuZWFyYnkgcmVzaWRlbnQgd2lsbCBzYXkgXFxcIkp1c3Qgc2F5IHllcywgaXQncyBhbGwgaGUgdW5kZXJzdGFuZHMuXFxcIlxcblxcbkNvbXBhbmlvbnMgd2lsbCB0cnkgdG8gdGFsayB0byBUYWthaGFzaGkgd2hlbiBhcnJpdmluZyBpbiB0aGUgRGlhbW9uZCBDaXR5IG1hcmtldCBmb3IgdGhlIGZpcnN0IHRpbWUuXFxuXFxuTWFjQ3JlYWR5IGVuam95cyBUYWthaGFzaGkncyBub29kbGVzIGltbWVuc2VseS4gSWYgaGUgaXMgdGhlIFNvbGUgU3Vydml2b3IncyBjdXJyZW50IGNvbXBhbmlvbiwgaGUgYWNjZXB0cyBhIGJvd2wgZnJvbSB0aGUgcm9ib3RpYyBjaGVmLCBhbmQgd2hlbiBmaW5pc2hlZCwgZW50aHVzaWFzdGljYWxseSBhc2tzIGZvciBtb3JlLlxcblxcbklmIHZpc2l0aW5nIERpYW1vbmQgQ2l0eSBvbiBIYWxsb3dlZW4sIFBvd2VyIE5vb2RsZXMgaXMgZGVjb3JhdGVkIHdpdGggcmVkIHNrdWxsIGN1dG91dHMgb24gdGhlIGNvdW50ZXIgYW5kIFxcXCJIYXBweSBIYWxsb3dlZW5cXFwiIGJhbm5lcnMgc3RyZXRjaGVkIGFjcm9zcyB0aGUgY2Fub3B5LlxcblxcbklmIHZpc2l0aW5nIERpYW1vbmQgQ2l0eSBvbiBDaHJpc3RtYXMsIFBvd2VyIE5vb2RsZXMgaXMgZGVjb3JhdGVkIHdpdGggQ2hyaXN0bWFzIHRyZWVzIGFuZCBsaWdodHMgY29ubmVjdGVkIHRvIHN1cnJvdW5kaW5nIGJ1aWxkaW5ncy5cXG5cXG5UaGUgRmFyIEhhcmJvciBub3RlIFRhc3RlIHRlc3QgZm91bmQgaW4gdGhlIE51Y2xldXMgbWFrZXMgYSByZWZlcmVuY2UgdG8gUG93ZXIgTm9vZGxlcy5cXG5cIjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBHZXRJbnRyaW5zaWMgPSByZXF1aXJlKCdnZXQtaW50cmluc2ljJyk7XG52YXIgY2FsbEJvdW5kID0gcmVxdWlyZSgnY2FsbC1iaW5kL2NhbGxCb3VuZCcpO1xudmFyIGluc3BlY3QgPSByZXF1aXJlKCdvYmplY3QtaW5zcGVjdCcpO1xuXG52YXIgJFR5cGVFcnJvciA9IEdldEludHJpbnNpYygnJVR5cGVFcnJvciUnKTtcbnZhciAkV2Vha01hcCA9IEdldEludHJpbnNpYygnJVdlYWtNYXAlJywgdHJ1ZSk7XG52YXIgJE1hcCA9IEdldEludHJpbnNpYygnJU1hcCUnLCB0cnVlKTtcblxudmFyICR3ZWFrTWFwR2V0ID0gY2FsbEJvdW5kKCdXZWFrTWFwLnByb3RvdHlwZS5nZXQnLCB0cnVlKTtcbnZhciAkd2Vha01hcFNldCA9IGNhbGxCb3VuZCgnV2Vha01hcC5wcm90b3R5cGUuc2V0JywgdHJ1ZSk7XG52YXIgJHdlYWtNYXBIYXMgPSBjYWxsQm91bmQoJ1dlYWtNYXAucHJvdG90eXBlLmhhcycsIHRydWUpO1xudmFyICRtYXBHZXQgPSBjYWxsQm91bmQoJ01hcC5wcm90b3R5cGUuZ2V0JywgdHJ1ZSk7XG52YXIgJG1hcFNldCA9IGNhbGxCb3VuZCgnTWFwLnByb3RvdHlwZS5zZXQnLCB0cnVlKTtcbnZhciAkbWFwSGFzID0gY2FsbEJvdW5kKCdNYXAucHJvdG90eXBlLmhhcycsIHRydWUpO1xuXG4vKlxuICogVGhpcyBmdW5jdGlvbiB0cmF2ZXJzZXMgdGhlIGxpc3QgcmV0dXJuaW5nIHRoZSBub2RlIGNvcnJlc3BvbmRpbmcgdG8gdGhlXG4gKiBnaXZlbiBrZXkuXG4gKlxuICogVGhhdCBub2RlIGlzIGFsc28gbW92ZWQgdG8gdGhlIGhlYWQgb2YgdGhlIGxpc3QsIHNvIHRoYXQgaWYgaXQncyBhY2Nlc3NlZFxuICogYWdhaW4gd2UgZG9uJ3QgbmVlZCB0byB0cmF2ZXJzZSB0aGUgd2hvbGUgbGlzdC4gQnkgZG9pbmcgc28sIGFsbCB0aGUgcmVjZW50bHlcbiAqIHVzZWQgbm9kZXMgY2FuIGJlIGFjY2Vzc2VkIHJlbGF0aXZlbHkgcXVpY2tseS5cbiAqL1xudmFyIGxpc3RHZXROb2RlID0gZnVuY3Rpb24gKGxpc3QsIGtleSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGNvbnNpc3RlbnQtcmV0dXJuXG5cdGZvciAodmFyIHByZXYgPSBsaXN0LCBjdXJyOyAoY3VyciA9IHByZXYubmV4dCkgIT09IG51bGw7IHByZXYgPSBjdXJyKSB7XG5cdFx0aWYgKGN1cnIua2V5ID09PSBrZXkpIHtcblx0XHRcdHByZXYubmV4dCA9IGN1cnIubmV4dDtcblx0XHRcdGN1cnIubmV4dCA9IGxpc3QubmV4dDtcblx0XHRcdGxpc3QubmV4dCA9IGN1cnI7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cblx0XHRcdHJldHVybiBjdXJyO1xuXHRcdH1cblx0fVxufTtcblxudmFyIGxpc3RHZXQgPSBmdW5jdGlvbiAob2JqZWN0cywga2V5KSB7XG5cdHZhciBub2RlID0gbGlzdEdldE5vZGUob2JqZWN0cywga2V5KTtcblx0cmV0dXJuIG5vZGUgJiYgbm9kZS52YWx1ZTtcbn07XG52YXIgbGlzdFNldCA9IGZ1bmN0aW9uIChvYmplY3RzLCBrZXksIHZhbHVlKSB7XG5cdHZhciBub2RlID0gbGlzdEdldE5vZGUob2JqZWN0cywga2V5KTtcblx0aWYgKG5vZGUpIHtcblx0XHRub2RlLnZhbHVlID0gdmFsdWU7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gUHJlcGVuZCB0aGUgbmV3IG5vZGUgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgbGlzdFxuXHRcdG9iamVjdHMubmV4dCA9IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuXHRcdFx0a2V5OiBrZXksXG5cdFx0XHRuZXh0OiBvYmplY3RzLm5leHQsXG5cdFx0XHR2YWx1ZTogdmFsdWVcblx0XHR9O1xuXHR9XG59O1xudmFyIGxpc3RIYXMgPSBmdW5jdGlvbiAob2JqZWN0cywga2V5KSB7XG5cdHJldHVybiAhIWxpc3RHZXROb2RlKG9iamVjdHMsIGtleSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldFNpZGVDaGFubmVsKCkge1xuXHR2YXIgJHdtO1xuXHR2YXIgJG07XG5cdHZhciAkbztcblx0dmFyIGNoYW5uZWwgPSB7XG5cdFx0YXNzZXJ0OiBmdW5jdGlvbiAoa2V5KSB7XG5cdFx0XHRpZiAoIWNoYW5uZWwuaGFzKGtleSkpIHtcblx0XHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ1NpZGUgY2hhbm5lbCBkb2VzIG5vdCBjb250YWluICcgKyBpbnNwZWN0KGtleSkpO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Z2V0OiBmdW5jdGlvbiAoa2V5KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY29uc2lzdGVudC1yZXR1cm5cblx0XHRcdGlmICgkV2Vha01hcCAmJiBrZXkgJiYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBrZXkgPT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHRcdGlmICgkd20pIHtcblx0XHRcdFx0XHRyZXR1cm4gJHdlYWtNYXBHZXQoJHdtLCBrZXkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKCRNYXApIHtcblx0XHRcdFx0aWYgKCRtKSB7XG5cdFx0XHRcdFx0cmV0dXJuICRtYXBHZXQoJG0sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICgkbykgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWxvbmVseS1pZlxuXHRcdFx0XHRcdHJldHVybiBsaXN0R2V0KCRvLCBrZXkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRoYXM6IGZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdGlmICgkV2Vha01hcCAmJiBrZXkgJiYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBrZXkgPT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHRcdGlmICgkd20pIHtcblx0XHRcdFx0XHRyZXR1cm4gJHdlYWtNYXBIYXMoJHdtLCBrZXkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKCRNYXApIHtcblx0XHRcdFx0aWYgKCRtKSB7XG5cdFx0XHRcdFx0cmV0dXJuICRtYXBIYXMoJG0sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICgkbykgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWxvbmVseS1pZlxuXHRcdFx0XHRcdHJldHVybiBsaXN0SGFzKCRvLCBrZXkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSxcblx0XHRzZXQ6IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG5cdFx0XHRpZiAoJFdlYWtNYXAgJiYga2V5ICYmICh0eXBlb2Yga2V5ID09PSAnb2JqZWN0JyB8fCB0eXBlb2Yga2V5ID09PSAnZnVuY3Rpb24nKSkge1xuXHRcdFx0XHRpZiAoISR3bSkge1xuXHRcdFx0XHRcdCR3bSA9IG5ldyAkV2Vha01hcCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCR3ZWFrTWFwU2V0KCR3bSwga2V5LCB2YWx1ZSk7XG5cdFx0XHR9IGVsc2UgaWYgKCRNYXApIHtcblx0XHRcdFx0aWYgKCEkbSkge1xuXHRcdFx0XHRcdCRtID0gbmV3ICRNYXAoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQkbWFwU2V0KCRtLCBrZXksIHZhbHVlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICghJG8pIHtcblx0XHRcdFx0XHQvKlxuXHRcdFx0XHRcdCAqIEluaXRpYWxpemUgdGhlIGxpbmtlZCBsaXN0IGFzIGFuIGVtcHR5IG5vZGUsIHNvIHRoYXQgd2UgZG9uJ3QgaGF2ZVxuXHRcdFx0XHRcdCAqIHRvIHNwZWNpYWwtY2FzZSBoYW5kbGluZyBvZiB0aGUgZmlyc3Qgbm9kZTogd2UgY2FuIGFsd2F5cyByZWZlciB0b1xuXHRcdFx0XHRcdCAqIGl0IGFzIChwcmV2aW91cyBub2RlKS5uZXh0LCBpbnN0ZWFkIG9mIHNvbWV0aGluZyBsaWtlIChsaXN0KS5oZWFkXG5cdFx0XHRcdFx0ICovXG5cdFx0XHRcdFx0JG8gPSB7IGtleToge30sIG5leHQ6IG51bGwgfTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsaXN0U2V0KCRvLCBrZXksIHZhbHVlKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cdHJldHVybiBjaGFubmVsO1xufTtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9nbG9iYWwuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9nbG9iYWwuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2luaXRpYWxQYWdlLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vaW5pdGlhbFBhZ2UuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL21lbnUuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9tZW51LmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc3R5bGVzSW5ET00gPSBbXTtcblxuZnVuY3Rpb24gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICB2YXIgcmVzdWx0ID0gLTE7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHlsZXNJbkRPTS5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzdHlsZXNJbkRPTVtpXS5pZGVudGlmaWVyID09PSBpZGVudGlmaWVyKSB7XG4gICAgICByZXN1bHQgPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpIHtcbiAgdmFyIGlkQ291bnRNYXAgPSB7fTtcbiAgdmFyIGlkZW50aWZpZXJzID0gW107XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldO1xuICAgIHZhciBpZCA9IG9wdGlvbnMuYmFzZSA/IGl0ZW1bMF0gKyBvcHRpb25zLmJhc2UgOiBpdGVtWzBdO1xuICAgIHZhciBjb3VudCA9IGlkQ291bnRNYXBbaWRdIHx8IDA7XG4gICAgdmFyIGlkZW50aWZpZXIgPSBcIlwiLmNvbmNhdChpZCwgXCIgXCIpLmNvbmNhdChjb3VudCk7XG4gICAgaWRDb3VudE1hcFtpZF0gPSBjb3VudCArIDE7XG4gICAgdmFyIGluZGV4QnlJZGVudGlmaWVyID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcik7XG4gICAgdmFyIG9iaiA9IHtcbiAgICAgIGNzczogaXRlbVsxXSxcbiAgICAgIG1lZGlhOiBpdGVtWzJdLFxuICAgICAgc291cmNlTWFwOiBpdGVtWzNdLFxuICAgICAgc3VwcG9ydHM6IGl0ZW1bNF0sXG4gICAgICBsYXllcjogaXRlbVs1XVxuICAgIH07XG5cbiAgICBpZiAoaW5kZXhCeUlkZW50aWZpZXIgIT09IC0xKSB7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleEJ5SWRlbnRpZmllcl0ucmVmZXJlbmNlcysrO1xuICAgICAgc3R5bGVzSW5ET01baW5kZXhCeUlkZW50aWZpZXJdLnVwZGF0ZXIob2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHVwZGF0ZXIgPSBhZGRFbGVtZW50U3R5bGUob2JqLCBvcHRpb25zKTtcbiAgICAgIG9wdGlvbnMuYnlJbmRleCA9IGk7XG4gICAgICBzdHlsZXNJbkRPTS5zcGxpY2UoaSwgMCwge1xuICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxuICAgICAgICB1cGRhdGVyOiB1cGRhdGVyLFxuICAgICAgICByZWZlcmVuY2VzOiAxXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50aWZpZXIpO1xuICB9XG5cbiAgcmV0dXJuIGlkZW50aWZpZXJzO1xufVxuXG5mdW5jdGlvbiBhZGRFbGVtZW50U3R5bGUob2JqLCBvcHRpb25zKSB7XG4gIHZhciBhcGkgPSBvcHRpb25zLmRvbUFQSShvcHRpb25zKTtcbiAgYXBpLnVwZGF0ZShvYmopO1xuXG4gIHZhciB1cGRhdGVyID0gZnVuY3Rpb24gdXBkYXRlcihuZXdPYmopIHtcbiAgICBpZiAobmV3T2JqKSB7XG4gICAgICBpZiAobmV3T2JqLmNzcyA9PT0gb2JqLmNzcyAmJiBuZXdPYmoubWVkaWEgPT09IG9iai5tZWRpYSAmJiBuZXdPYmouc291cmNlTWFwID09PSBvYmouc291cmNlTWFwICYmIG5ld09iai5zdXBwb3J0cyA9PT0gb2JqLnN1cHBvcnRzICYmIG5ld09iai5sYXllciA9PT0gb2JqLmxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYXBpLnVwZGF0ZShvYmogPSBuZXdPYmopO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcGkucmVtb3ZlKCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB1cGRhdGVyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChsaXN0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgdmFyIGxhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShsaXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZShuZXdMaXN0KSB7XG4gICAgbmV3TGlzdCA9IG5ld0xpc3QgfHwgW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhc3RJZGVudGlmaWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGlkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbaV07XG4gICAgICB2YXIgaW5kZXggPSBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4XS5yZWZlcmVuY2VzLS07XG4gICAgfVxuXG4gICAgdmFyIG5ld0xhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShuZXdMaXN0LCBvcHRpb25zKTtcblxuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICB2YXIgX2lkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbX2ldO1xuXG4gICAgICB2YXIgX2luZGV4ID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoX2lkZW50aWZpZXIpO1xuXG4gICAgICBpZiAoc3R5bGVzSW5ET01bX2luZGV4XS5yZWZlcmVuY2VzID09PSAwKSB7XG4gICAgICAgIHN0eWxlc0luRE9NW19pbmRleF0udXBkYXRlcigpO1xuXG4gICAgICAgIHN0eWxlc0luRE9NLnNwbGljZShfaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxhc3RJZGVudGlmaWVycyA9IG5ld0xhc3RJZGVudGlmaWVycztcbiAgfTtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBtZW1vID0ge307XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cblxuZnVuY3Rpb24gZ2V0VGFyZ2V0KHRhcmdldCkge1xuICBpZiAodHlwZW9mIG1lbW9bdGFyZ2V0XSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciBzdHlsZVRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0KTsgLy8gU3BlY2lhbCBjYXNlIHRvIHJldHVybiBoZWFkIG9mIGlmcmFtZSBpbnN0ZWFkIG9mIGlmcmFtZSBpdHNlbGZcblxuICAgIGlmICh3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQgJiYgc3R5bGVUYXJnZXQgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYWNjZXNzIHRvIGlmcmFtZSBpcyBibG9ja2VkXG4gICAgICAgIC8vIGR1ZSB0byBjcm9zcy1vcmlnaW4gcmVzdHJpY3Rpb25zXG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gc3R5bGVUYXJnZXQuY29udGVudERvY3VtZW50LmhlYWQ7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGlzdGFuYnVsIGlnbm9yZSBuZXh0XG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBtZW1vW3RhcmdldF0gPSBzdHlsZVRhcmdldDtcbiAgfVxuXG4gIHJldHVybiBtZW1vW3RhcmdldF07XG59XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cblxuXG5mdW5jdGlvbiBpbnNlcnRCeVNlbGVjdG9yKGluc2VydCwgc3R5bGUpIHtcbiAgdmFyIHRhcmdldCA9IGdldFRhcmdldChpbnNlcnQpO1xuXG4gIGlmICghdGFyZ2V0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGRuJ3QgZmluZCBhIHN0eWxlIHRhcmdldC4gVGhpcyBwcm9iYWJseSBtZWFucyB0aGF0IHRoZSB2YWx1ZSBmb3IgdGhlICdpbnNlcnQnIHBhcmFtZXRlciBpcyBpbnZhbGlkLlwiKTtcbiAgfVxuXG4gIHRhcmdldC5hcHBlbmRDaGlsZChzdHlsZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5zZXJ0QnlTZWxlY3RvcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucykge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgb3B0aW9ucy5zZXRBdHRyaWJ1dGVzKGVsZW1lbnQsIG9wdGlvbnMuYXR0cmlidXRlcyk7XG4gIG9wdGlvbnMuaW5zZXJ0KGVsZW1lbnQsIG9wdGlvbnMub3B0aW9ucyk7XG4gIHJldHVybiBlbGVtZW50O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluc2VydFN0eWxlRWxlbWVudDsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMoc3R5bGVFbGVtZW50KSB7XG4gIHZhciBub25jZSA9IHR5cGVvZiBfX3dlYnBhY2tfbm9uY2VfXyAhPT0gXCJ1bmRlZmluZWRcIiA/IF9fd2VicGFja19ub25jZV9fIDogbnVsbDtcblxuICBpZiAobm9uY2UpIHtcbiAgICBzdHlsZUVsZW1lbnQuc2V0QXR0cmlidXRlKFwibm9uY2VcIiwgbm9uY2UpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKSB7XG4gIHZhciBjc3MgPSBcIlwiO1xuXG4gIGlmIChvYmouc3VwcG9ydHMpIHtcbiAgICBjc3MgKz0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChvYmouc3VwcG9ydHMsIFwiKSB7XCIpO1xuICB9XG5cbiAgaWYgKG9iai5tZWRpYSkge1xuICAgIGNzcyArPSBcIkBtZWRpYSBcIi5jb25jYXQob2JqLm1lZGlhLCBcIiB7XCIpO1xuICB9XG5cbiAgdmFyIG5lZWRMYXllciA9IHR5cGVvZiBvYmoubGF5ZXIgIT09IFwidW5kZWZpbmVkXCI7XG5cbiAgaWYgKG5lZWRMYXllcikge1xuICAgIGNzcyArPSBcIkBsYXllclwiLmNvbmNhdChvYmoubGF5ZXIubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChvYmoubGF5ZXIpIDogXCJcIiwgXCIge1wiKTtcbiAgfVxuXG4gIGNzcyArPSBvYmouY3NzO1xuXG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cblxuICBpZiAob2JqLm1lZGlhKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG5cbiAgaWYgKG9iai5zdXBwb3J0cykge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuXG4gIHZhciBzb3VyY2VNYXAgPSBvYmouc291cmNlTWFwO1xuXG4gIGlmIChzb3VyY2VNYXAgJiYgdHlwZW9mIGJ0b2EgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBjc3MgKz0gXCJcXG4vKiMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LFwiLmNvbmNhdChidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShzb3VyY2VNYXApKSkpLCBcIiAqL1wiKTtcbiAgfSAvLyBGb3Igb2xkIElFXG5cbiAgLyogaXN0YW5idWwgaWdub3JlIGlmICAqL1xuXG5cbiAgb3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCwgb3B0aW9ucy5vcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCkge1xuICAvLyBpc3RhbmJ1bCBpZ25vcmUgaWZcbiAgaWYgKHN0eWxlRWxlbWVudC5wYXJlbnROb2RlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc3R5bGVFbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50KTtcbn1cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuXG5cbmZ1bmN0aW9uIGRvbUFQSShvcHRpb25zKSB7XG4gIHZhciBzdHlsZUVsZW1lbnQgPSBvcHRpb25zLmluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKTtcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShvYmopIHtcbiAgICAgIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge1xuICAgICAgcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG4gICAgfVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUFQSTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBzdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCkge1xuICBpZiAoc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQpIHtcbiAgICBzdHlsZUVsZW1lbnQuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICB9IGVsc2Uge1xuICAgIHdoaWxlIChzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgc3R5bGVFbGVtZW50LnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKTtcbiAgICB9XG5cbiAgICBzdHlsZUVsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzdHlsZVRhZ1RyYW5zZm9ybTsiLCJpbXBvcnQgZ2l0SHViSWNvbiBmcm9tICcuL2ltZ3MvZ2l0aHViLnBuZyc7XG5pbXBvcnQgJy4vZ2xvYmFsLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZUZvb3RlcihlbGVtZW50KSB7XG4gIGNvbnN0IGZvb3RlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Zvb3RlcicpO1xuICBmb290ZXIuY2xhc3NMaXN0LmFkZCgnZm9vdGVyJyk7XG4gIGZvb3Rlci5jbGFzc0xpc3QuYWRkKCdnbG93Jyk7XG5cbiAgY29uc3QgaWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICBpY29uLnNyYyA9IGdpdEh1Ykljb247XG5cbiAgY29uc3QgYXV0aG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDInKTtcbiAgYXV0aG9yLmlubmVyVGV4dCA9ICdqb3J0ZWdhMic7XG5cbiAgZm9vdGVyLmFwcGVuZChpY29uKTtcbiAgZm9vdGVyLmFwcGVuZChhdXRob3IpO1xuXG4gIGVsZW1lbnQuYXBwZW5kQ2hpbGQoZm9vdGVyKTtcbn1cbiIsImltcG9ydCAnLi9pbml0aWFsUGFnZS5jc3MnO1xuaW1wb3J0ICcuL2dsb2JhbC5jc3MnO1xuaW1wb3J0IGZhbGxvdXRMb2dvIGZyb20gJy4vaW1ncy9mYWxsb3V0LnBuZyc7XG5pbXBvcnQgbG9jYXRpb25JbWcgZnJvbSAnLi9pbWdzL2RpYW1vbmRjaXR5LmpwZyc7XG5pbXBvcnQgYWJvdXQgZnJvbSAnLi9hYm91dC50eHQnO1xuXG5mdW5jdGlvbiBjcmVhdGVIZWFkZXIoKSB7XG4gIGNvbnN0IGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBoZWFkZXIuY2xhc3NMaXN0LmFkZCgnaGVhZGVyJyk7XG4gIGhlYWRlci5jbGFzc0xpc3QuYWRkKCdnbG93Jyk7XG5cbiAgY29uc3QgdGl0bGVCRyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB0aXRsZUJHLmNsYXNzTGlzdC5hZGQoJ29wYXF1ZScpO1xuICB0aXRsZUJHLnRleHRDb250ZW50ID0gJ1Bvd2VyIE5vb2RsZXMnO1xuXG4gIGNvbnN0IG5hdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBuYXYuY2xhc3NMaXN0LmFkZCgnbmF2QmFyJyk7XG5cbiAgY29uc3QgZmFsbG91dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICBmYWxsb3V0LnNyYyA9IGZhbGxvdXRMb2dvO1xuICBmYWxsb3V0LmNsYXNzTGlzdC5hZGQoJ3RpdGxlSW1nJyk7XG5cbiAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCduYXZCdXR0b24nKTtcbiAgYnV0dG9uLnRleHRDb250ZW50ID0gJ1ZpZXcgdGhlIE1lbnUnO1xuXG4gIG5hdi5hcHBlbmRDaGlsZChmYWxsb3V0KTtcbiAgbmF2LmFwcGVuZENoaWxkKGJ1dHRvbik7XG5cbiAgaGVhZGVyLmFwcGVuZChuYXYpO1xuICBoZWFkZXIuYXBwZW5kKHRpdGxlQkcpO1xuXG4gIHJldHVybiBoZWFkZXI7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1hcCgpIHtcbiAgY29uc3QgbWFwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gIG1hcC5zcmMgPSBsb2NhdGlvbkltZztcbiAgbWFwLmNsYXNzTGlzdC5hZGQoJ21hcCcpO1xuICBtYXAuY2xhc3NMaXN0LmFkZCgnZ2xvdycpO1xuXG4gIHJldHVybiBtYXA7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUhvdXJzVGFibGUoKSB7XG4gIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0YWJsZScpO1xuXG4gIGNvbnN0IGNhcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYXB0aW9uJyk7XG4gIGNhcHRpb24udGV4dENvbnRlbnQgPSAnT1BFTklORyBIT1VSUyc7XG4gIGVsZW1lbnQuYXBwZW5kQ2hpbGQoY2FwdGlvbik7XG4gIGNvbnN0IGRheXMgPSBbJ01PTicsICdUVUUnLCAnV0VEJywgJ1RIVScsICdGUkknLCAnU0FUJywgJ1NVTiddO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgNzsgaSArPSAxKSB7XG4gICAgY29uc3QgZGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcblxuICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGgnKTtcbiAgICBsYWJlbC5pbm5lclRleHQgPSBkYXlzW2ldO1xuXG4gICAgY29uc3QgaG91cnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuICAgIGhvdXJzLmlubmVyVGV4dCA9ICc4OjAwIGEubS4gLSAxMDowMCBwLm0uJztcblxuICAgIGRheS5hcHBlbmQobGFiZWwpO1xuICAgIGRheS5hcHBlbmQoaG91cnMpO1xuICAgIGVsZW1lbnQuYXBwZW5kKGRheSk7XG4gIH1cbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUhvdXJzKCkge1xuICBjb25zdCBzdG9yZUhvdXJzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHN0b3JlSG91cnMuY2xhc3NMaXN0LmFkZCgnc3RvcmVIb3VycycpO1xuICBzdG9yZUhvdXJzLmNsYXNzTGlzdC5hZGQoJ2dsb3cnKTtcblxuICBjb25zdCBob3Vyc1RhYmxlID0gY3JlYXRlSG91cnNUYWJsZSgpO1xuXG4gIHN0b3JlSG91cnMuYXBwZW5kKGhvdXJzVGFibGUpO1xuXG4gIHJldHVybiBzdG9yZUhvdXJzO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJbmZvcm1hdGlvbigpIHtcbiAgY29uc3QgaW5mb3JtYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgaW5mb3JtYXRpb24uY2xhc3NMaXN0LmFkZCgnaW5mb3JtYXRpb24nKTtcbiAgaW5mb3JtYXRpb24uY2xhc3NMaXN0LmFkZCgnZ2xvdycpO1xuXG4gIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDInKTtcbiAgdGl0bGUuaW5uZXJUZXh0ID0gJ0Zyb20gdGhlIFdpa2knO1xuXG4gIGNvbnN0IGluZm8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gIGluZm8uaW5uZXJUZXh0ID0gYWJvdXQ7XG5cbiAgaW5mb3JtYXRpb24uYXBwZW5kKHRpdGxlKTtcbiAgaW5mb3JtYXRpb24uYXBwZW5kKGluZm8pO1xuXG4gIHJldHVybiBpbmZvcm1hdGlvbjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ3JlZGl0cygpIHtcbiAgY29uc3QgY3JlZGl0cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBjcmVkaXRzLmNsYXNzTGlzdC5hZGQoJ2dsb3cnKTtcbiAgY3JlZGl0cy5jbGFzc0xpc3QuYWRkKCdjcmVkaXRzJyk7XG5cbiAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMicpO1xuICB0aXRsZS5pbm5lclRleHQgPSAnQ3JlZGl0cyc7XG5cbiAgY29uc3QgcmVzdGF1cmFudEltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICByZXN0YXVyYW50SW1hZ2UuaHJlZiA9ICdodHRwczovL2ZhbGxvdXQuZmFuZG9tLmNvbS93aWtpL1Bvd2VyX05vb2RsZXM/ZmlsZT1GTzRfUF9Ob29kbGVzX1RWLnBuZyc7XG4gIHJlc3RhdXJhbnRJbWFnZS5pbm5lclRleHQgPSAnS2RhcnJvdyBmb3IgdGhlIG1haW4gUG93ZXIgTm9vZGxlcyBzY3JlZW5zaG90Lic7XG5cbiAgY29uc3QgbG9nbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgbG9nby5ocmVmID0gJ2h0dHBzOi8vd3d3LnBuZ2ZpbmQuY29tL21wbmcvb2h4SlJpX2FsbG91dC1mYWxsb3V0LTItZmFsbG91dC1zaGVsdGVyLWZhbGxvdXQtNC1mYWxsb3V0Lyc7XG4gIGxvZ28uaW5uZXJUZXh0ID0gJ3BuZ2ZpbmQgZm9yIHRoZSBGYWxsb3V0IGxvZ28nO1xuXG4gIGNvbnN0IGxvY2F0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICBsb2NhdGlvbi5ocmVmID0gJ2h0dHBzOi8vZmFsbG91dC1hcmNoaXZlLmZhbmRvbS5jb20vd2lraS9EaWFtb25kX0NpdHlfbWFya2V0JztcbiAgbG9jYXRpb24uaW5uZXJUZXh0ID0gJ0ZhbGxvdXQgNCBmYW5kb20gcGFnZSBmb3IgdGhlIGxvY2F0aW9uIGltYWdlIHVzZWQgb24gdGhlIGhvbWUgcGFnZSc7XG5cbiAgY29uc3Qgd2lraUluZm8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gIHdpa2lJbmZvLmhyZWYgPSAnaHR0cHM6Ly9mYWxsb3V0LmZhbmRvbS5jb20vd2lraS9Qb3dlcl9Ob29kbGVzJztcbiAgd2lraUluZm8uaW5uZXJUZXh0ID0gJ0ZhbGxvdXQgNCBmYW5kb20gcGFnZSBmb3IgdGhlaXIgbm90ZXMgdGhhdCB3ZXJlIHVzZWQgaW4gdGhlIGluZm9ybWF0aW9uIHNlY3Rpb24nO1xuXG4gIGNvbnN0IGNvbnN1bWFibGVzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICBjb25zdW1hYmxlcy5ocmVmID0gJ2h0dHBzOi8vZmFsbG91dC5mYW5kb20uY29tL3dpa2kvRmFsbG91dF80X2NvbnN1bWFibGVzJztcbiAgY29uc3VtYWJsZXMuaW5uZXJUZXh0ID0gJ0ZhbGxvdXQgNCBmYW5kb20gcGFnZSBmb3IgdGhlIGZvb2QgaW5mb3JtYXRpb24gdXNlZCBpbiB0aGUgbWVudSBwYWdlJztcblxuICBjb25zdCBiZXRoZXNkYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgYmV0aGVzZGEuaHJlZiA9ICdodHRwczovL2ZhbGxvdXQuYmV0aGVzZGEubmV0L2VuL2dhbWVzL2ZhbGxvdXQtNCc7XG4gIGJldGhlc2RhLmlubmVyVGV4dCA9ICdCZXRoZXNkYSBmb3IgY3JlYXRpbmcgRmFsbG91dCA0JztcblxuICBjcmVkaXRzLmFwcGVuZENoaWxkKHRpdGxlKTtcbiAgY3JlZGl0cy5hcHBlbmRDaGlsZChiZXRoZXNkYSk7XG4gIGNyZWRpdHMuYXBwZW5kQ2hpbGQocmVzdGF1cmFudEltYWdlKTtcbiAgY3JlZGl0cy5hcHBlbmRDaGlsZChsb2NhdGlvbik7XG4gIGNyZWRpdHMuYXBwZW5kQ2hpbGQod2lraUluZm8pO1xuICBjcmVkaXRzLmFwcGVuZENoaWxkKGNvbnN1bWFibGVzKTtcbiAgY3JlZGl0cy5hcHBlbmRDaGlsZChsb2dvKTtcblxuICByZXR1cm4gY3JlZGl0cztcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdGlhbFBhZ2UoZWxlbWVudCkge1xuICBlbGVtZW50LmFwcGVuZChjcmVhdGVIZWFkZXIoKSk7XG4gIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZU1hcCgpKTtcbiAgZWxlbWVudC5hcHBlbmQoY3JlYXRlSG91cnMoKSk7XG4gIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZUluZm9ybWF0aW9uKCkpO1xuICBlbGVtZW50LmFwcGVuZChjcmVhdGVDcmVkaXRzKCkpO1xufVxuIiwiaW1wb3J0ICcuL2dsb2JhbC5jc3MnO1xuaW1wb3J0ICcuL21lbnUuY3NzJztcbmltcG9ydCB7IGRhdGEgfSBmcm9tICdicm93c2Vyc2xpc3QnO1xuaW1wb3J0IG1lbnVJdGVtcyBmcm9tICcuL21lbnUuY3N2JztcbmltcG9ydCBmYWxsb3V0TG9nbyBmcm9tICcuL2ltZ3MvZmFsbG91dC5wbmcnO1xuXG5mdW5jdGlvbiBhZGRNZW51KGVsZW1lbnQpIHtcbiAgLy8gdGFibGUgY2FwdGlvblxuICBjb25zdCBjYXB0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FwdGlvbicpO1xuICBjYXB0aW9uLmlubmVyVGV4dCA9ICdPdXIgTWVudSc7XG5cbiAgZWxlbWVudC5hcHBlbmRDaGlsZChjYXB0aW9uKTtcbiAgLy8gY3JlYXRlIHJvd3Mgb2YgdGFibGVcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZW51SXRlbXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBjb25zdCByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQocm93KTtcbiAgfVxuXG4gIGNvbnN0IHsgY2hpbGRyZW4gfSA9IGVsZW1lbnQ7XG5cbiAgLy8gY3JlYXRlIGhlYWRlciByb3dcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZW51SXRlbXNbMF0ubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBjb25zdCB0YWJsZUhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RoJyk7XG4gICAgdGFibGVIZWFkZXIuaW5uZXJUZXh0ID0gbWVudUl0ZW1zWzBdW2ldO1xuXG4gICAgY2hpbGRyZW5bMV0uYXBwZW5kKHRhYmxlSGVhZGVyKTtcbiAgfVxuXG4gIC8vIGNyZWF0ZSBkYXRhIGNlbGxzXG4gIGZvciAobGV0IGkgPSAxOyBpIDwgbWVudUl0ZW1zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBtZW51SXRlbXNbaV0ubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgIGNvbnN0IGRhdGFDZWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKTtcbiAgICAgIGRhdGFDZWxsLmlubmVyVGV4dCA9IG1lbnVJdGVtc1tpXVtqXTtcbiAgICAgIGNoaWxkcmVuW2kgKyAxXS5hcHBlbmQoZGF0YUNlbGwpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVCb2R5KCkge1xuICBjb25zdCBtZW51Q29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIG1lbnVDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnbWVudUNvbnRhaW5lcicpO1xuICBtZW51Q29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2dsb3cnKTtcblxuICBjb25zdCBuYXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgbmF2LmNsYXNzTGlzdC5hZGQoJ25hdkJhcicpO1xuXG4gIGNvbnN0IGZhbGxvdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgZmFsbG91dC5zcmMgPSBmYWxsb3V0TG9nbztcbiAgZmFsbG91dC5jbGFzc0xpc3QuYWRkKCd0aXRsZUltZycpO1xuXG4gIGNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICBidXR0b24uY2xhc3NMaXN0LmFkZCgnbmF2QnV0dG9uJyk7XG4gIGJ1dHRvbi50ZXh0Q29udGVudCA9ICdSZXR1cm4gdG8gSG9tZSc7XG5cbiAgY29uc3QgbWVudSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJyk7XG4gIG1lbnUuY2xhc3NMaXN0LmFkZCgnbWVudScpO1xuICBhZGRNZW51KG1lbnUpO1xuXG4gIG5hdi5hcHBlbmRDaGlsZChmYWxsb3V0KTtcbiAgbmF2LmFwcGVuZENoaWxkKGJ1dHRvbik7XG5cbiAgbWVudUNvbnRhaW5lci5hcHBlbmQobmF2KTtcbiAgbWVudUNvbnRhaW5lci5hcHBlbmQobWVudSk7XG5cbiAgcmV0dXJuIG1lbnVDb250YWluZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZU1lbnVQYWdlKGVsZW1lbnQpIHtcbiAgZWxlbWVudC5hcHBlbmRDaGlsZChjcmVhdGVCb2R5KCkpO1xufVxuIiwiLyogKGlnbm9yZWQpICovIiwiLyogKGlnbm9yZWQpICovIiwiLyogZXMtbW9kdWxlLWxleGVyIDAuOS4zICovXG5jb25zdCBBPTE9PT1uZXcgVWludDhBcnJheShuZXcgVWludDE2QXJyYXkoWzFdKS5idWZmZXIpWzBdO2V4cG9ydCBmdW5jdGlvbiBwYXJzZShFLEk9XCJAXCIpe2lmKCFCKXJldHVybiBpbml0LnRoZW4oKCk9PnBhcnNlKEUpKTtjb25zdCBnPUUubGVuZ3RoKzEsRD0oQi5fX2hlYXBfYmFzZS52YWx1ZXx8Qi5fX2hlYXBfYmFzZSkrNCpnLUIubWVtb3J5LmJ1ZmZlci5ieXRlTGVuZ3RoO0Q+MCYmQi5tZW1vcnkuZ3JvdyhNYXRoLmNlaWwoRC82NTUzNikpO2NvbnN0IHc9Qi5zYShnLTEpO2lmKChBP0M6USkoRSxuZXcgVWludDE2QXJyYXkoQi5tZW1vcnkuYnVmZmVyLHcsZykpLCFCLnBhcnNlKCkpdGhyb3cgT2JqZWN0LmFzc2lnbihuZXcgRXJyb3IoYFBhcnNlIGVycm9yICR7SX06JHtFLnNsaWNlKDAsQi5lKCkpLnNwbGl0KFwiXFxuXCIpLmxlbmd0aH06JHtCLmUoKS1FLmxhc3RJbmRleE9mKFwiXFxuXCIsQi5lKCktMSl9YCkse2lkeDpCLmUoKX0pO2NvbnN0IEw9W10saz1bXTtmb3IoO0IucmkoKTspe2NvbnN0IEE9Qi5pcygpLFE9Qi5pZSgpLEM9Qi5haSgpLEk9Qi5pZCgpLGc9Qi5zcygpLEQ9Qi5zZSgpO2xldCB3O0IuaXAoKSYmKHc9SihFLnNsaWNlKC0xPT09ST9BLTE6QSwtMT09PUk/USsxOlEpKSksTC5wdXNoKHtuOncsczpBLGU6USxzczpnLHNlOkQsZDpJLGE6Q30pfWZvcig7Qi5yZSgpOyl7Y29uc3QgQT1FLnNsaWNlKEIuZXMoKSxCLmVlKCkpLFE9QVswXTtrLnB1c2goJ1wiJz09PVF8fFwiJ1wiPT09UT9KKEEpOkEpfWZ1bmN0aW9uIEooQSl7dHJ5e3JldHVybigwLGV2YWwpKEEpfWNhdGNoKEEpe319cmV0dXJuW0wsaywhIUIuZigpXX1mdW5jdGlvbiBRKEEsUSl7Y29uc3QgQz1BLmxlbmd0aDtsZXQgQj0wO2Zvcig7QjxDOyl7Y29uc3QgQz1BLmNoYXJDb2RlQXQoQik7UVtCKytdPSgyNTUmQyk8PDh8Qz4+Pjh9fWZ1bmN0aW9uIEMoQSxRKXtjb25zdCBDPUEubGVuZ3RoO2xldCBCPTA7Zm9yKDtCPEM7KVFbQl09QS5jaGFyQ29kZUF0KEIrKyl9bGV0IEI7ZXhwb3J0IGNvbnN0IGluaXQ9V2ViQXNzZW1ibHkuY29tcGlsZSgoRT1cIkFHRnpiUUVBQUFBQlhBMWdBWDhCZjJBRWYzOS9md0JnQW45L0FHQUFBWDlnQm45L2YzOS9md0YvWUFBQVlBRi9BR0FFZjM5L2Z3Ri9ZQU4vZjM4QmYyQUhmMzkvZjM5L2Z3Ri9ZQVYvZjM5L2Z3Ri9ZQUovZndGL1lBaC9mMzkvZjM5L2Z3Ri9BekV3QUFFQ0F3TURBd01EQXdNREF3TURBd0FBQkFVRkJRWUZCZ0FBQUFBRkJRQUVCd2dKQ2dzTUFBSUFBQUFMQXdrTUJBVUJjQUVCQVFVREFRQUJCZzhDZndGQjhQQUFDMzhBUWZEd0FBc0haQkVHYldWdGIzSjVBZ0FDYzJFQUFBRmxBQU1DYVhNQUJBSnBaUUFGQW5OekFBWUNjMlVBQndKaGFRQUlBbWxrQUFrQ2FYQUFDZ0psY3dBTEFtVmxBQXdDY21rQURRSnlaUUFPQVdZQUR3VndZWEp6WlFBUUMxOWZhR1ZoY0Y5aVlYTmxBd0VLOGprd2FBRUJmMEVBSUFBMkFyZ0lRUUFvQXBBSUlnRWdBRUVCZEdvaUFFRUFPd0VBUVFBZ0FFRUNhaUlBTmdLOENFRUFJQUEyQXNBSVFRQkJBRFlDbEFoQkFFRUFOZ0trQ0VFQVFRQTJBcHdJUVFCQkFEWUNtQWhCQUVFQU5nS3NDRUVBUVFBMkFxQUlJQUVMc2dFQkFuOUJBQ2dDcEFnaUJFRWNha0dVQ0NBRUcwRUFLQUxBQ0NJRk5nSUFRUUFnQlRZQ3BBaEJBQ0FFTmdLb0NFRUFJQVZCSUdvMkFzQUlJQVVnQURZQ0NBSkFBa0JCQUNnQ2lBZ2dBMGNOQUNBRklBSTJBZ3dNQVFzQ1FFRUFLQUtFQ0NBRFJ3MEFJQVVnQWtFQ2FqWUNEQXdCQ3lBRlFRQW9BcEFJTmdJTUN5QUZJQUUyQWdBZ0JTQUROZ0lVSUFWQkFEWUNFQ0FGSUFJMkFnUWdCVUVBTmdJY0lBVkJBQ2dDaEFnZ0EwWTZBQmdMU0FFQmYwRUFLQUtzQ0NJQ1FRaHFRWmdJSUFJYlFRQW9Bc0FJSWdJMkFnQkJBQ0FDTmdLc0NFRUFJQUpCREdvMkFzQUlJQUpCQURZQ0NDQUNJQUUyQWdRZ0FpQUFOZ0lBQ3dnQVFRQW9Bc1FJQ3hVQVFRQW9BcHdJS0FJQVFRQW9BcEFJYTBFQmRRc1ZBRUVBS0FLY0NDZ0NCRUVBS0FLUUNHdEJBWFVMRlFCQkFDZ0NuQWdvQWdoQkFDZ0NrQWhyUVFGMUN4VUFRUUFvQXB3SUtBSU1RUUFvQXBBSWEwRUJkUXNlQVFGL1FRQW9BcHdJS0FJUUlnQkJBQ2dDa0FoclFRRjFRWDhnQUJzTE93RUJmd0pBUVFBb0Fwd0lLQUlVSWdCQkFDZ0NoQWhIRFFCQmZ3OExBa0FnQUVFQUtBS0lDRWNOQUVGK0R3c2dBRUVBS0FLUUNHdEJBWFVMQ3dCQkFDZ0NuQWd0QUJnTEZRQkJBQ2dDb0Fnb0FnQkJBQ2dDa0FoclFRRjFDeFVBUVFBb0FxQUlLQUlFUVFBb0FwQUlhMEVCZFFzbEFRRi9RUUJCQUNnQ25BZ2lBRUVjYWtHVUNDQUFHeWdDQUNJQU5nS2NDQ0FBUVFCSEN5VUJBWDlCQUVFQUtBS2dDQ0lBUVFocVFaZ0lJQUFiS0FJQUlnQTJBcUFJSUFCQkFFY0xDQUJCQUMwQXlBZ0w5Z3NCQkg4akFFR0E4QUJySWdFa0FFRUFRUUU2QU1nSVFRQkIvLzhET3dIT0NFRUFRUUFvQW93SU5nTFFDRUVBUVFBb0FwQUlRWDVxSWdJMkF1UUlRUUFnQWtFQUtBSzRDRUVCZEdvaUF6WUM2QWhCQUVFQU93SEtDRUVBUVFBN0Fjd0lRUUJCQURvQTFBaEJBRUVBTmdMRUNFRUFRUUE2QUxRSVFRQWdBVUdBMEFCcU5nTFlDRUVBSUFGQmdCQnFOZ0xjQ0VFQVFRQTZBT0FJQWtBQ1FBSkFBa0FEUUVFQUlBSkJBbW9pQkRZQzVBZ2dBaUFEVHcwQkFrQWdCQzhCQUNJRFFYZHFRUVZKRFFBQ1FBSkFBa0FDUUFKQUlBTkJtMzlxRGdVQkNBZ0lBZ0FMSUFOQklFWU5CQ0FEUVM5R0RRTWdBMEU3UmcwQ0RBY0xRUUF2QWN3SURRRWdCQkFSUlEwQklBSkJCR3BCK0FCQjhBQkI3d0JCOGdCQjlBQVFFa1VOQVJBVFFRQXRBTWdJRFFGQkFFRUFLQUxrQ0NJQ05nTFFDQXdIQ3lBRUVCRkZEUUFnQWtFRWFrSHRBRUh3QUVIdkFFSHlBRUgwQUJBU1JRMEFFQlFMUVFCQkFDZ0M1QWcyQXRBSURBRUxBa0FnQWk4QkJDSUVRU3BHRFFBZ0JFRXZSdzBFRUJVTUFRdEJBUkFXQzBFQUtBTG9DQ0VEUVFBb0F1UUlJUUlNQUFzTFFRQWhBeUFFSVFKQkFDMEF0QWdOQWd3QkMwRUFJQUkyQXVRSVFRQkJBRG9BeUFnTEEwQkJBQ0FDUVFKcUlnUTJBdVFJQWtBQ1FBSkFBa0FDUUFKQUlBSkJBQ2dDNkFoUERRQWdCQzhCQUNJRFFYZHFRUVZKRFFVQ1FBSkFBa0FDUUFKQUFrQUNRQUpBQWtBQ1FDQURRV0JxRGdvUERnZ09EZzRPQndFQ0FBc0NRQUpBQWtBQ1FDQURRYUIvYWc0S0NCRVJBeEVCRVJFUkFnQUxJQU5CaFg5cURnTUZFQVlMQzBFQUx3SE1DQTBQSUFRUUVVVU5EeUFDUVFScVFmZ0FRZkFBUWU4QVFmSUFRZlFBRUJKRkRROFFFd3dQQ3lBRUVCRkZEUTRnQWtFRWFrSHRBRUh3QUVIdkFFSHlBRUgwQUJBU1JRME9FQlFNRGdzZ0JCQVJSUTBOSUFJdkFRcEI4d0JIRFEwZ0FpOEJDRUh6QUVjTkRTQUNMd0VHUWVFQVJ3ME5JQUl2QVFSQjdBQkhEUTBnQWk4QkRDSUVRWGRxSWdKQkYwc05DMEVCSUFKMFFaK0FnQVJ4UlEwTERBd0xRUUJCQUM4QnpBZ2lBa0VCYWpzQnpBaEJBQ2dDM0FnZ0FrRUNkR3BCQUNnQzBBZzJBZ0FNREF0QkFDOEJ6QWdpQWtVTkNFRUFJQUpCZjJvaUF6c0J6QWhCQUNnQ3NBZ2lBa1VOQ3lBQ0tBSVVRUUFvQXR3SUlBTkIvLzhEY1VFQ2RHb29BZ0JIRFFzQ1FDQUNLQUlFRFFBZ0FpQUVOZ0lFQ3lBQ0lBUTJBZ3hCQUVFQU5nS3dDQXdMQ3dKQVFRQW9BdEFJSWdRdkFRQkJLVWNOQUVFQUtBS2tDQ0lDUlEwQUlBSW9BZ1FnQkVjTkFFRUFRUUFvQXFnSUlnSTJBcVFJQWtBZ0FrVU5BQ0FDUVFBMkFod01BUXRCQUVFQU5nS1VDQXNnQVVFQUx3SE1DQ0lDYWtFQUxRRGdDRG9BQUVFQUlBSkJBV283QWN3SVFRQW9BdHdJSUFKQkFuUnFJQVEyQWdCQkFFRUFPZ0RnQ0F3S0MwRUFMd0hNQ0NJQ1JRMEdRUUFnQWtGL2FpSURPd0hNQ0NBQ1FRQXZBYzRJSWdSSERRRkJBRUVBTHdIS0NFRi9haUlDT3dIS0NFRUFRUUFvQXRnSUlBSkIvLzhEY1VFQmRHb3ZBUUE3QWM0SUN4QVhEQWdMSUFSQi8vOERSZzBISUFOQi8vOERjU0FFU1EwRURBY0xRU2NRR0F3R0MwRWlFQmdNQlFzZ0EwRXZSdzBFQWtBQ1FDQUNMd0VFSWdKQktrWU5BQ0FDUVM5SERRRVFGUXdIQzBFQkVCWU1CZ3NDUUFKQUFrQUNRRUVBS0FMUUNDSUVMd0VBSWdJUUdVVU5BQUpBQWtBQ1FDQUNRVlZxRGdRQkJRSUFCUXNnQkVGK2FpOEJBRUZRYWtILy93TnhRUXBKRFFNTUJBc2dCRUYrYWk4QkFFRXJSZzBDREFNTElBUkJmbW92QVFCQkxVWU5BUXdDQ3dKQUlBSkIvUUJHRFFBZ0FrRXBSdzBCUVFBb0F0d0lRUUF2QWN3SVFRSjBhaWdDQUJBYVJRMEJEQUlMUVFBb0F0d0lRUUF2QWN3SUlnTkJBblJxS0FJQUVCc05BU0FCSUFOcUxRQUFEUUVMSUFRUUhBMEFJQUpGRFFCQkFTRUVJQUpCTDBaQkFDMEExQWhCQUVkeFJRMEJDeEFkUVFBaEJBdEJBQ0FFT2dEVUNBd0VDMEVBTHdIT0NFSC8vd05HUVFBdkFjd0lSWEZCQUMwQXRBaEZjU0VEREFZTEVCNUJBQ0VEREFVTElBUkJvQUZIRFFFTFFRQkJBVG9BNEFnTFFRQkJBQ2dDNUFnMkF0QUlDMEVBS0FMa0NDRUNEQUFMQ3lBQlFZRHdBR29rQUNBREN4MEFBa0JCQUNnQ2tBZ2dBRWNOQUVFQkR3c2dBRUYrYWk4QkFCQWZDejhCQVg5QkFDRUdBa0FnQUM4QkNDQUZSdzBBSUFBdkFRWWdCRWNOQUNBQUx3RUVJQU5IRFFBZ0FDOEJBaUFDUncwQUlBQXZBUUFnQVVZaEJnc2dCZ3ZVQmdFRWYwRUFRUUFvQXVRSUlnQkJER29pQVRZQzVBaEJBUkFuSVFJQ1FBSkFBa0FDUUFKQVFRQW9BdVFJSWdNZ0FVY05BQ0FDRUN0RkRRRUxBa0FDUUFKQUFrQUNRQ0FDUVo5L2FnNE1CZ0VEQ0FFSEFRRUJBUUVFQUFzQ1FBSkFJQUpCS2tZTkFDQUNRZllBUmcwRklBSkIrd0JIRFFKQkFDQURRUUpxTmdMa0NFRUJFQ2NoQTBFQUtBTGtDQ0VCQTBBQ1FBSkFJQU5CLy84RGNTSUNRU0pHRFFBZ0FrRW5SZzBBSUFJUUtocEJBQ2dDNUFnaEFnd0JDeUFDRUJoQkFFRUFLQUxrQ0VFQ2FpSUNOZ0xrQ0F0QkFSQW5HZ0pBSUFFZ0FoQXNJZ05CTEVjTkFFRUFRUUFvQXVRSVFRSnFOZ0xrQ0VFQkVDY2hBd3RCQUNnQzVBZ2hBZ0pBSUFOQi9RQkdEUUFnQWlBQlJnMEZJQUloQVNBQ1FRQW9BdWdJVFEwQkRBVUxDMEVBSUFKQkFtbzJBdVFJREFFTFFRQWdBMEVDYWpZQzVBaEJBUkFuR2tFQUtBTGtDQ0lDSUFJUUxCb0xRUUVRSnlFQ0MwRUFLQUxrQ0NFREFrQWdBa0htQUVjTkFDQURMd0VHUWUwQVJ3MEFJQU12QVFSQjd3QkhEUUFnQXk4QkFrSHlBRWNOQUVFQUlBTkJDR28yQXVRSUlBQkJBUkFuRUNnUEMwRUFJQU5CZm1vMkF1UUlEQU1MRUI0UEN3SkFJQU12QVFoQjh3QkhEUUFnQXk4QkJrSHpBRWNOQUNBREx3RUVRZUVBUncwQUlBTXZBUUpCN0FCSERRQWdBeThCQ2hBZlJRMEFRUUFnQTBFS2FqWUM1QWhCQVJBbklRSkJBQ2dDNUFnaEF5QUNFQ29hSUFOQkFDZ0M1QWdRQWtFQVFRQW9BdVFJUVg1cU5nTGtDQThMUVFBZ0EwRUVhaUlETmdMa0NBdEJBQ0FEUVFScUlnSTJBdVFJUVFCQkFEb0F5QWdEUUVFQUlBSkJBbW8yQXVRSVFRRVFKeUVEUVFBb0F1UUlJUUlDUUNBREVDcEJJSEpCK3dCSERRQkJBRUVBS0FMa0NFRithallDNUFnUEMwRUFLQUxrQ0NJRElBSkdEUUVnQWlBREVBSUNRRUVCRUNjaUFrRXNSZzBBQWtBZ0FrRTlSdzBBUVFCQkFDZ0M1QWhCZm1vMkF1UUlEd3RCQUVFQUtBTGtDRUYrYWpZQzVBZ1BDMEVBS0FMa0NDRUNEQUFMQ3c4TFFRQWdBMEVLYWpZQzVBaEJBUkFuR2tFQUtBTGtDQ0VEQzBFQUlBTkJFR28yQXVRSUFrQkJBUkFuSWdKQktrY05BRUVBUVFBb0F1UUlRUUpxTmdMa0NFRUJFQ2NoQWd0QkFDZ0M1QWdoQXlBQ0VDb2FJQU5CQUNnQzVBZ1FBa0VBUVFBb0F1UUlRWDVxTmdMa0NBOExJQU1nQTBFT2FoQUNDNjRHQVFSL1FRQkJBQ2dDNUFnaUFFRU1haUlCTmdMa0NBSkFBa0FDUUFKQUFrQUNRQUpBQWtBQ1FBSkFRUUVRSnlJQ1FWbHFEZ2dDQ0FFQ0FRRUJCd0FMSUFKQklrWU5BU0FDUWZzQVJnMENDMEVBS0FMa0NDQUJSZzBIQzBFQUx3SE1DQTBCUVFBb0F1UUlJUUpCQUNnQzZBZ2hBd05BSUFJZ0EwOE5CQUpBQWtBZ0FpOEJBQ0lCUVNkR0RRQWdBVUVpUncwQkN5QUFJQUVRS0E4TFFRQWdBa0VDYWlJQ05nTGtDQXdBQ3d0QkFDZ0M1QWdoQWtFQUx3SE1DQTBCQWtBRFFBSkFBa0FDUUNBQ1FRQW9BdWdJVHcwQVFRRVFKeUlDUVNKR0RRRWdBa0VuUmcwQklBSkIvUUJIRFFKQkFFRUFLQUxrQ0VFQ2FqWUM1QWdMUVFFUUp4cEJBQ2dDNUFnaUFpOEJCa0h0QUVjTkJpQUNMd0VFUWU4QVJ3MEdJQUl2QVFKQjhnQkhEUVlnQWk4QkFFSG1BRWNOQmtFQUlBSkJDR28yQXVRSVFRRVFKeUlDUVNKR0RRTWdBa0VuUmcwRERBWUxJQUlRR0F0QkFFRUFLQUxrQ0VFQ2FpSUNOZ0xrQ0F3QUN3c2dBQ0FDRUNnTUJRdEJBRUVBS0FMa0NFRithallDNUFnUEMwRUFJQUpCZm1vMkF1UUlEd3NRSGc4TFFRQkJBQ2dDNUFoQkFtbzJBdVFJUVFFUUowSHRBRWNOQVVFQUtBTGtDQ0lDTHdFR1FlRUFSdzBCSUFJdkFRUkI5QUJIRFFFZ0FpOEJBa0hsQUVjTkFVRUFLQUxRQ0M4QkFFRXVSZzBCSUFBZ0FDQUNRUWhxUVFBb0FvZ0lFQUVQQzBFQUtBTGNDRUVBTHdITUNDSUNRUUowYWlBQU5nSUFRUUFnQWtFQmFqc0J6QWhCQUNnQzBBZ3ZBUUJCTGtZTkFDQUFRUUFvQXVRSVFRSnFRUUFnQUJBQlFRQkJBQ2dDcEFnMkFyQUlRUUJCQUNnQzVBaEJBbW8yQXVRSUFrQkJBUkFuSWdKQklrWU5BQ0FDUVNkR0RRQkJBRUVBS0FMa0NFRithallDNUFnUEN5QUNFQmhCQUVFQUtBTGtDRUVDYWpZQzVBZ0NRQUpBQWtCQkFSQW5RVmRxRGdRQkFnSUFBZ3RCQUNnQ3BBaEJBQ2dDNUFnaUFqWUNCRUVBSUFKQkFtbzJBdVFJUVFFUUp4cEJBQ2dDcEFnaUFrRUJPZ0FZSUFKQkFDZ0M1QWdpQVRZQ0VFRUFJQUZCZm1vMkF1UUlEd3RCQUNnQ3BBZ2lBa0VCT2dBWUlBSkJBQ2dDNUFnaUFUWUNEQ0FDSUFFMkFnUkJBRUVBTHdITUNFRi9hanNCekFnUEMwRUFRUUFvQXVRSVFYNXFOZ0xrQ0E4TEMwY0JBMzlCQUNnQzVBaEJBbW9oQUVFQUtBTG9DQ0VCQWtBRFFDQUFJZ0pCZm1vZ0FVOE5BU0FDUVFKcUlRQWdBaThCQUVGMmFnNEVBUUFBQVFBTEMwRUFJQUkyQXVRSUM1Z0JBUU4vUVFCQkFDZ0M1QWdpQVVFQ2FqWUM1QWdnQVVFR2FpRUJRUUFvQXVnSUlRSURRQUpBQWtBQ1FDQUJRWHhxSUFKUERRQWdBVUYrYWk4QkFDRURBa0FDUUNBQURRQWdBMEVxUmcwQklBTkJkbW9PQkFJRUJBSUVDeUFEUVNwSERRTUxJQUV2QVFCQkwwY05Ba0VBSUFGQmZtbzJBdVFJREFFTElBRkJmbW9oQVF0QkFDQUJOZ0xrQ0E4TElBRkJBbW9oQVF3QUN3dS9BUUVFZjBFQUtBTGtDQ0VBUVFBb0F1Z0lJUUVDUUFKQUEwQWdBQ0lDUVFKcUlRQWdBaUFCVHcwQkFrQUNRQ0FBTHdFQUlnTkJwSDlxRGdVQkFnSUNCQUFMSUFOQkpFY05BU0FDTHdFRVFmc0FSdzBCUVFCQkFDOEJ5Z2dpQUVFQmFqc0J5Z2hCQUNnQzJBZ2dBRUVCZEdwQkFDOEJ6Z2c3QVFCQkFDQUNRUVJxTmdMa0NFRUFRUUF2QWN3SVFRRnFJZ0E3QWM0SVFRQWdBRHNCekFnUEN5QUNRUVJxSVFBTUFBc0xRUUFnQURZQzVBZ1FIZzhMUVFBZ0FEWUM1QWdMaUFFQkJIOUJBQ2dDNUFnaEFVRUFLQUxvQ0NFQ0FrQUNRQU5BSUFFaUEwRUNhaUVCSUFNZ0FrOE5BU0FCTHdFQUlnUWdBRVlOQWdKQUlBUkIzQUJHRFFBZ0JFRjJhZzRFQWdFQkFnRUxJQU5CQkdvaEFTQURMd0VFUVExSERRQWdBMEVHYWlBQklBTXZBUVpCQ2tZYklRRU1BQXNMUVFBZ0FUWUM1QWdRSGc4TFFRQWdBVFlDNUFnTGJBRUJmd0pBQWtBZ0FFRmZhaUlCUVFWTERRQkJBU0FCZEVFeGNRMEJDeUFBUVVacVFmLy9BM0ZCQmtrTkFDQUFRU2xISUFCQldHcEIvLzhEY1VFSFNYRU5BQUpBSUFCQnBYOXFEZ1FCQUFBQkFBc2dBRUg5QUVjZ0FFR0ZmMnBCLy84RGNVRUVTWEVQQzBFQkN6MEJBWDlCQVNFQkFrQWdBRUgzQUVIb0FFSHBBRUhzQUVIbEFCQWdEUUFnQUVIbUFFSHZBRUh5QUJBaERRQWdBRUhwQUVIbUFCQWlJUUVMSUFFTG13RUJBbjlCQVNFQkFrQUNRQUpBQWtBQ1FBSkFJQUF2QVFBaUFrRkZhZzRFQlFRRUFRQUxBa0FnQWtHYmYyb09CQU1FQkFJQUN5QUNRU2xHRFFRZ0FrSDVBRWNOQXlBQVFYNXFRZVlBUWVrQVFlNEFRZUVBUWV3QVFld0FFQ01QQ3lBQVFYNXFMd0VBUVQxR0R3c2dBRUYrYWtIakFFSGhBRUgwQUVIakFCQWtEd3NnQUVGK2FrSGxBRUhzQUVIekFCQWhEd3RCQUNFQkN5QUJDOUlEQVFKL1FRQWhBUUpBQWtBQ1FBSkFBa0FDUUFKQUFrQUNRQ0FBTHdFQVFaeC9hZzRVQUFFQ0NBZ0lDQWdJQ0FNRUNBZ0ZDQVlJQ0FjSUN3SkFBa0FnQUVGK2FpOEJBRUdYZjJvT0JBQUpDUUVKQ3lBQVFYeHFRZllBUWU4QUVDSVBDeUFBUVh4cVFma0FRZWtBUWVVQUVDRVBDd0pBQWtBZ0FFRithaThCQUVHTmYyb09BZ0FCQ0FzQ1FDQUFRWHhxTHdFQUlnSkI0UUJHRFFBZ0FrSHNBRWNOQ0NBQVFYcHFRZVVBRUNVUEN5QUFRWHBxUWVNQUVDVVBDeUFBUVh4cVFlUUFRZVVBUWV3QVFlVUFFQ1FQQ3lBQVFYNXFMd0VBUWU4QVJ3MEZJQUJCZkdvdkFRQkI1UUJIRFFVQ1FDQUFRWHBxTHdFQUlnSkI4QUJHRFFBZ0FrSGpBRWNOQmlBQVFYaHFRZWtBUWU0QVFmTUFRZlFBUWVFQVFlNEFFQ01QQ3lBQVFYaHFRZlFBUWZrQUVDSVBDMEVCSVFFZ0FFRithaUlBUWVrQUVDVU5CQ0FBUWZJQVFlVUFRZlFBUWZVQVFmSUFFQ0FQQ3lBQVFYNXFRZVFBRUNVUEN5QUFRWDVxUWVRQVFlVUFRZUlBUWZVQVFlY0FRZWNBUWVVQUVDWVBDeUFBUVg1cVFlRUFRZmNBUWVFQVFla0FFQ1FQQ3dKQUlBQkJmbW92QVFBaUFrSHZBRVlOQUNBQ1FlVUFSdzBCSUFCQmZHcEI3Z0FRSlE4TElBQkJmR3BCOUFCQjZBQkI4Z0FRSVNFQkN5QUJDM0FCQW44Q1FBSkFBMEJCQUVFQUtBTGtDQ0lBUVFKcUlnRTJBdVFJSUFCQkFDZ0M2QWhQRFFFQ1FBSkFBa0FnQVM4QkFDSUJRYVYvYWc0Q0FRSUFDd0pBSUFGQmRtb09CQVFEQXdRQUN5QUJRUzlIRFFJTUJBc1FMUm9NQVF0QkFDQUFRUVJxTmdMa0NBd0FDd3NRSGdzTE5RRUJmMEVBUVFFNkFMUUlRUUFvQXVRSUlRQkJBRUVBS0FMb0NFRUNhallDNUFoQkFDQUFRUUFvQXBBSWEwRUJkVFlDeEFnTE5BRUJmMEVCSVFFQ1FDQUFRWGRxUWYvL0EzRkJCVWtOQUNBQVFZQUJja0dnQVVZTkFDQUFRUzVISUFBUUszRWhBUXNnQVF0SkFRTi9RUUFoQmdKQUlBQkJlR29pQjBFQUtBS1FDQ0lJU1EwQUlBY2dBU0FDSUFNZ0JDQUZFQkpGRFFBQ1FDQUhJQWhIRFFCQkFROExJQUJCZG1vdkFRQVFIeUVHQ3lBR0Mxa0JBMzlCQUNFRUFrQWdBRUY4YWlJRlFRQW9BcEFJSWdaSkRRQWdBQzhCQUNBRFJ3MEFJQUJCZm1vdkFRQWdBa2NOQUNBRkx3RUFJQUZIRFFBQ1FDQUZJQVpIRFFCQkFROExJQUJCZW1vdkFRQVFIeUVFQ3lBRUMwd0JBMzlCQUNFREFrQWdBRUYrYWlJRVFRQW9BcEFJSWdWSkRRQWdBQzhCQUNBQ1J3MEFJQVF2QVFBZ0FVY05BQUpBSUFRZ0JVY05BRUVCRHdzZ0FFRjhhaThCQUJBZklRTUxJQU1MU3dFRGYwRUFJUWNDUUNBQVFYWnFJZ2hCQUNnQ2tBZ2lDVWtOQUNBSUlBRWdBaUFESUFRZ0JTQUdFQzVGRFFBQ1FDQUlJQWxIRFFCQkFROExJQUJCZEdvdkFRQVFIeUVIQ3lBSEMyWUJBMzlCQUNFRkFrQWdBRUY2YWlJR1FRQW9BcEFJSWdkSkRRQWdBQzhCQUNBRVJ3MEFJQUJCZm1vdkFRQWdBMGNOQUNBQVFYeHFMd0VBSUFKSERRQWdCaThCQUNBQlJ3MEFBa0FnQmlBSFJ3MEFRUUVQQ3lBQVFYaHFMd0VBRUI4aEJRc2dCUXM5QVFKL1FRQWhBZ0pBUVFBb0FwQUlJZ01nQUVzTkFDQUFMd0VBSUFGSERRQUNRQ0FESUFCSERRQkJBUThMSUFCQmZtb3ZBUUFRSHlFQ0N5QUNDMDBCQTM5QkFDRUlBa0FnQUVGMGFpSUpRUUFvQXBBSUlncEpEUUFnQ1NBQklBSWdBeUFFSUFVZ0JpQUhFQzlGRFFBQ1FDQUpJQXBIRFFCQkFROExJQUJCY21vdkFRQVFIeUVJQ3lBSUM1d0JBUU4vUVFBb0F1UUlJUUVDUUFOQUFrQUNRQ0FCTHdFQUlnSkJMMGNOQUFKQUlBRXZBUUlpQVVFcVJnMEFJQUZCTDBjTkJCQVZEQUlMSUFBUUZnd0JDd0pBQWtBZ0FFVU5BQ0FDUVhkcUlnRkJGMHNOQVVFQklBRjBRWitBZ0FSeFJRMEJEQUlMSUFJUUtVVU5Bd3dCQ3lBQ1FhQUJSdzBDQzBFQVFRQW9BdVFJSWdOQkFtb2lBVFlDNUFnZ0EwRUFLQUxvQ0VrTkFBc0xJQUlMeXdNQkFYOENRQ0FCUVNKR0RRQWdBVUVuUmcwQUVCNFBDMEVBS0FMa0NDRUNJQUVRR0NBQUlBSkJBbXBCQUNnQzVBaEJBQ2dDaEFnUUFVRUFRUUFvQXVRSVFRSnFOZ0xrQ0VFQUVDY2hBRUVBS0FMa0NDRUJBa0FDUUNBQVFlRUFSdzBBSUFGQkFtcEI4d0JCOHdCQjVRQkI4Z0JCOUFBUUVnMEJDMEVBSUFGQmZtbzJBdVFJRHd0QkFDQUJRUXhxTmdMa0NBSkFRUUVRSjBIN0FFWU5BRUVBSUFFMkF1UUlEd3RCQUNnQzVBZ2lBaUVBQTBCQkFDQUFRUUpxTmdMa0NBSkFBa0FDUUVFQkVDY2lBRUVpUmcwQUlBQkJKMGNOQVVFbkVCaEJBRUVBS0FMa0NFRUNhallDNUFoQkFSQW5JUUFNQWd0QkloQVlRUUJCQUNnQzVBaEJBbW8yQXVRSVFRRVFKeUVBREFFTElBQVFLaUVBQ3dKQUlBQkJPa1lOQUVFQUlBRTJBdVFJRHd0QkFFRUFLQUxrQ0VFQ2FqWUM1QWdDUUVFQkVDY2lBRUVpUmcwQUlBQkJKMFlOQUVFQUlBRTJBdVFJRHdzZ0FCQVlRUUJCQUNnQzVBaEJBbW8yQXVRSUFrQUNRRUVCRUNjaUFFRXNSZzBBSUFCQi9RQkdEUUZCQUNBQk5nTGtDQThMUVFCQkFDZ0M1QWhCQW1vMkF1UUlRUUVRSjBIOUFFWU5BRUVBS0FMa0NDRUFEQUVMQzBFQUtBS2tDQ0lCSUFJMkFoQWdBVUVBS0FMa0NFRUNhallDREFzd0FRRi9Ba0FDUUNBQVFYZHFJZ0ZCRjBzTkFFRUJJQUYwUVkyQWdBUnhEUUVMSUFCQm9BRkdEUUJCQUE4TFFRRUxiUUVDZndKQUFrQURRQUpBSUFCQi8vOERjU0lCUVhkcUlnSkJGMHNOQUVFQklBSjBRWitBZ0FSeERRSUxJQUZCb0FGR0RRRWdBQ0VDSUFFUUt3MENRUUFoQWtFQVFRQW9BdVFJSWdCQkFtbzJBdVFJSUFBdkFRSWlBQTBBREFJTEN5QUFJUUlMSUFKQi8vOERjUXRvQVFKL1FRRWhBUUpBQWtBZ0FFRmZhaUlDUVFWTERRQkJBU0FDZEVFeGNRMEJDeUFBUWZqL0EzRkJLRVlOQUNBQVFVWnFRZi8vQTNGQkJra05BQUpBSUFCQnBYOXFJZ0pCQTBzTkFDQUNRUUZIRFFFTElBQkJoWDlxUWYvL0EzRkJCRWtoQVFzZ0FRdUxBUUVDZndKQVFRQW9BdVFJSWdJdkFRQWlBMEhoQUVjTkFFRUFJQUpCQkdvMkF1UUlRUUVRSnlFQ1FRQW9BdVFJSVFBQ1FBSkFJQUpCSWtZTkFDQUNRU2RHRFFBZ0FoQXFHa0VBS0FMa0NDRUJEQUVMSUFJUUdFRUFRUUFvQXVRSVFRSnFJZ0UyQXVRSUMwRUJFQ2NoQTBFQUtBTGtDQ0VDQ3dKQUlBSWdBRVlOQUNBQUlBRVFBZ3NnQXd0eUFRUi9RUUFvQXVRSUlRQkJBQ2dDNkFnaEFRSkFBa0FEUUNBQVFRSnFJUUlnQUNBQlR3MEJBa0FDUUNBQ0x3RUFJZ05CcEg5cURnSUJCQUFMSUFJaEFDQURRWFpxRGdRQ0FRRUNBUXNnQUVFRWFpRUFEQUFMQzBFQUlBSTJBdVFJRUI1QkFBOExRUUFnQWpZQzVBaEIzUUFMU1FFQmYwRUFJUWNDUUNBQUx3RUtJQVpIRFFBZ0FDOEJDQ0FGUncwQUlBQXZBUVlnQkVjTkFDQUFMd0VFSUFOSERRQWdBQzhCQWlBQ1J3MEFJQUF2QVFBZ0FVWWhCd3NnQnd0VEFRRi9RUUFoQ0FKQUlBQXZBUXdnQjBjTkFDQUFMd0VLSUFaSERRQWdBQzhCQ0NBRlJ3MEFJQUF2QVFZZ0JFY05BQ0FBTHdFRUlBTkhEUUFnQUM4QkFpQUNSdzBBSUFBdkFRQWdBVVloQ0FzZ0NBc0xId0lBUVlBSUN3SUFBQUJCaEFnTEVBRUFBQUFDQUFBQUFBUUFBSEE0QUFBPVwiLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBCdWZmZXI/QnVmZmVyLmZyb20oRSxcImJhc2U2NFwiKTpVaW50OEFycmF5LmZyb20oYXRvYihFKSxBPT5BLmNoYXJDb2RlQXQoMCkpKSkudGhlbihXZWJBc3NlbWJseS5pbnN0YW50aWF0ZSkudGhlbigoe2V4cG9ydHM6QX0pPT57Qj1BfSk7dmFyIEU7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHRpZDogbW9kdWxlSWQsXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbi8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBfX3dlYnBhY2tfbW9kdWxlc19fO1xuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18uZyA9IChmdW5jdGlvbigpIHtcblx0aWYgKHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JykgcmV0dXJuIGdsb2JhbFRoaXM7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIHRoaXMgfHwgbmV3IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcpIHJldHVybiB3aW5kb3c7XG5cdH1cbn0pKCk7IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsInZhciBzY3JpcHRVcmw7XG5pZiAoX193ZWJwYWNrX3JlcXVpcmVfXy5nLmltcG9ydFNjcmlwdHMpIHNjcmlwdFVybCA9IF9fd2VicGFja19yZXF1aXJlX18uZy5sb2NhdGlvbiArIFwiXCI7XG52YXIgZG9jdW1lbnQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fLmcuZG9jdW1lbnQ7XG5pZiAoIXNjcmlwdFVybCAmJiBkb2N1bWVudCkge1xuXHRpZiAoZG9jdW1lbnQuY3VycmVudFNjcmlwdClcblx0XHRzY3JpcHRVcmwgPSBkb2N1bWVudC5jdXJyZW50U2NyaXB0LnNyY1xuXHRpZiAoIXNjcmlwdFVybCkge1xuXHRcdHZhciBzY3JpcHRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzY3JpcHRcIik7XG5cdFx0aWYoc2NyaXB0cy5sZW5ndGgpIHNjcmlwdFVybCA9IHNjcmlwdHNbc2NyaXB0cy5sZW5ndGggLSAxXS5zcmNcblx0fVxufVxuLy8gV2hlbiBzdXBwb3J0aW5nIGJyb3dzZXJzIHdoZXJlIGFuIGF1dG9tYXRpYyBwdWJsaWNQYXRoIGlzIG5vdCBzdXBwb3J0ZWQgeW91IG11c3Qgc3BlY2lmeSBhbiBvdXRwdXQucHVibGljUGF0aCBtYW51YWxseSB2aWEgY29uZmlndXJhdGlvblxuLy8gb3IgcGFzcyBhbiBlbXB0eSBzdHJpbmcgKFwiXCIpIGFuZCBzZXQgdGhlIF9fd2VicGFja19wdWJsaWNfcGF0aF9fIHZhcmlhYmxlIGZyb20geW91ciBjb2RlIHRvIHVzZSB5b3VyIG93biBsb2dpYy5cbmlmICghc2NyaXB0VXJsKSB0aHJvdyBuZXcgRXJyb3IoXCJBdXRvbWF0aWMgcHVibGljUGF0aCBpcyBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlclwiKTtcbnNjcmlwdFVybCA9IHNjcmlwdFVybC5yZXBsYWNlKC8jLiokLywgXCJcIikucmVwbGFjZSgvXFw/LiokLywgXCJcIikucmVwbGFjZSgvXFwvW15cXC9dKyQvLCBcIi9cIik7XG5fX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBzY3JpcHRVcmw7IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5iID0gZG9jdW1lbnQuYmFzZVVSSSB8fCBzZWxmLmxvY2F0aW9uLmhyZWY7XG5cbi8vIG9iamVjdCB0byBzdG9yZSBsb2FkZWQgYW5kIGxvYWRpbmcgY2h1bmtzXG4vLyB1bmRlZmluZWQgPSBjaHVuayBub3QgbG9hZGVkLCBudWxsID0gY2h1bmsgcHJlbG9hZGVkL3ByZWZldGNoZWRcbi8vIFtyZXNvbHZlLCByZWplY3QsIFByb21pc2VdID0gY2h1bmsgbG9hZGluZywgMCA9IGNodW5rIGxvYWRlZFxudmFyIGluc3RhbGxlZENodW5rcyA9IHtcblx0XCJtYWluXCI6IDBcbn07XG5cbi8vIG5vIGNodW5rIG9uIGRlbWFuZCBsb2FkaW5nXG5cbi8vIG5vIHByZWZldGNoaW5nXG5cbi8vIG5vIHByZWxvYWRlZFxuXG4vLyBubyBITVJcblxuLy8gbm8gSE1SIG1hbmlmZXN0XG5cbi8vIG5vIG9uIGNodW5rcyBsb2FkZWRcblxuLy8gbm8ganNvbnAgZnVuY3Rpb24iLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm5jID0gdW5kZWZpbmVkOyIsImltcG9ydCB7IGluaXQgfSBmcm9tICdlcy1tb2R1bGUtbGV4ZXInO1xuaW1wb3J0IHsgc2V0IH0gZnJvbSAnaW50ZXJuYWwtc2xvdCc7XG5pbXBvcnQgaW5pdGlhbFBhZ2UgZnJvbSAnLi9pbml0aWFscGFnZSc7XG5pbXBvcnQgY3JlYXRlRm9vdGVyIGZyb20gJy4vZm9vdGVyJztcbmltcG9ydCBjcmVhdGVNZW51IGZyb20gJy4vbWVudSc7XG5cbmNvbnN0IHdlYlBhZ2UgPSAoKCkgPT4ge1xuICBjb25zdCBjb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NvbnRlbnQnKTtcbiAgbGV0IGJ1dHRvbjtcblxuICBjb25zdCBjbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb250ZW50LmlubmVyVGV4dCA9ICcnO1xuICB9O1xuXG4gIGNvbnN0IHNldEhvbWVQYWdlID0gZnVuY3Rpb24gKCkge1xuICAgIGNsZWFyKCk7XG4gICAgaW5pdGlhbFBhZ2UoY29udGVudCk7XG4gICAgY3JlYXRlRm9vdGVyKGNvbnRlbnQpO1xuICAgIGJ1dHRvblRvZ2dsZSh0cnVlKTtcbiAgfTtcblxuICBjb25zdCBzZXRNZW51UGFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBjbGVhcigpO1xuICAgIGNyZWF0ZU1lbnUoY29udGVudCk7XG4gICAgY3JlYXRlRm9vdGVyKGNvbnRlbnQpO1xuICAgIGJ1dHRvblRvZ2dsZShmYWxzZSk7XG4gIH07XG5cbiAgY29uc3QgYnV0dG9uVG9nZ2xlID0gZnVuY3Rpb24gKGZyb21Ib21lKSB7XG4gICAgYnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm5hdkJ1dHRvbicpO1xuICAgIGlmIChmcm9tSG9tZSkge1xuICAgICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgc2V0TWVudVBhZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBzZXRIb21lUGFnZSk7XG4gICAgfVxuICB9O1xuXG4gIC8vIGRlZmF1bHRcbiAgc2V0SG9tZVBhZ2UoKTtcblxuICBidXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubmF2QnV0dG9uJyk7XG4gIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHNldE1lbnVQYWdlKTtcbn0pKCk7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=