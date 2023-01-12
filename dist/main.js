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
___CSS_LOADER_EXPORT___.push([module.id, ".glow {\n  background-color: black;\n  border-style: solid;\n  border-color: green;\n  border-width: 5px;\n  \n  box-shadow: 0 0 40px black;\n}\n\n.navButton {\n  background-color: green;\n  color: black;\n\n  border-radius: 5px;\n  border-width: 0px;\n\n  font-size: x-large;\n  font-weight: bold;\n  padding: 5px;\n}\n\n.navButton:hover {\n  background-color: black;\n  color: green;\n\n  outline-style: solid;\n  outline-width: 2px;\n}\n\n.footer {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 10px;\n  padding: 10px;\n  width: 900px;\n}", "",{"version":3,"sources":["webpack://./src/global.css"],"names":[],"mappings":"AAAA;EACE,uBAAuB;EACvB,mBAAmB;EACnB,mBAAmB;EACnB,iBAAiB;;EAEjB,0BAA0B;AAC5B;;AAEA;EACE,uBAAuB;EACvB,YAAY;;EAEZ,kBAAkB;EAClB,iBAAiB;;EAEjB,kBAAkB;EAClB,iBAAiB;EACjB,YAAY;AACd;;AAEA;EACE,uBAAuB;EACvB,YAAY;;EAEZ,oBAAoB;EACpB,kBAAkB;AACpB;;AAEA;EACE,aAAa;EACb,uBAAuB;EACvB,mBAAmB;EACnB,SAAS;EACT,aAAa;EACb,YAAY;AACd","sourcesContent":[".glow {\n  background-color: black;\n  border-style: solid;\n  border-color: green;\n  border-width: 5px;\n  \n  box-shadow: 0 0 40px black;\n}\n\n.navButton {\n  background-color: green;\n  color: black;\n\n  border-radius: 5px;\n  border-width: 0px;\n\n  font-size: x-large;\n  font-weight: bold;\n  padding: 5px;\n}\n\n.navButton:hover {\n  background-color: black;\n  color: green;\n\n  outline-style: solid;\n  outline-width: 2px;\n}\n\n.footer {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 10px;\n  padding: 10px;\n  width: 900px;\n}"],"sourceRoot":""}]);
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
___CSS_LOADER_EXPORT___.push([module.id, ".header {\n    background-image: url(" + ___CSS_LOADER_URL_REPLACEMENT_0___ + ");\n    background-size: cover;\n    background-repeat: no-repeat;\n    background-position: center;\n\n    width: 900px;\n    height: 600px;\n\n    display:inline-block;\n}\n\n.opaque{\n    background-color: rgba(0, 0, 0, 0.5);\n    font-size: xx-large;\n    text-align: center;\n    color: white;\n    margin-top: 250px;\n}\n\n.navBar {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n\n    background-color: black;\n    padding: 5px 10px;\n}\n\n.titleImg{\n    width: 150px;\n    height: 50px;\n}\n\n.map {\n    width: 900px;\n}\n\n.storeHours{\n    width: 900px;\n    display: flex;\n    align-items: center;\n    padding: 5px 10px;\n    font-size: x-large;\n}\n\n.storeHours table {\n    flex: 1;\n}\n\n.storeHours table tr {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n}\n\n.storeHours table th {\n    padding: 5px;\n    text-align: left;\n}\n\n.information {\n    padding: 25px;\n    font-size: large;\n}", "",{"version":3,"sources":["webpack://./src/initialPage.css"],"names":[],"mappings":"AAAA;IACI,yDAA2C;IAC3C,sBAAsB;IACtB,4BAA4B;IAC5B,2BAA2B;;IAE3B,YAAY;IACZ,aAAa;;IAEb,oBAAoB;AACxB;;AAEA;IACI,oCAAoC;IACpC,mBAAmB;IACnB,kBAAkB;IAClB,YAAY;IACZ,iBAAiB;AACrB;;AAEA;IACI,aAAa;IACb,8BAA8B;IAC9B,mBAAmB;;IAEnB,uBAAuB;IACvB,iBAAiB;AACrB;;AAEA;IACI,YAAY;IACZ,YAAY;AAChB;;AAEA;IACI,YAAY;AAChB;;AAEA;IACI,YAAY;IACZ,aAAa;IACb,mBAAmB;IACnB,iBAAiB;IACjB,kBAAkB;AACtB;;AAEA;IACI,OAAO;AACX;;AAEA;IACI,aAAa;IACb,8BAA8B;IAC9B,mBAAmB;AACvB;;AAEA;IACI,YAAY;IACZ,gBAAgB;AACpB;;AAEA;IACI,aAAa;IACb,gBAAgB;AACpB","sourcesContent":[".header {\n    background-image: url('imgs/noodlestv.png');\n    background-size: cover;\n    background-repeat: no-repeat;\n    background-position: center;\n\n    width: 900px;\n    height: 600px;\n\n    display:inline-block;\n}\n\n.opaque{\n    background-color: rgba(0, 0, 0, 0.5);\n    font-size: xx-large;\n    text-align: center;\n    color: white;\n    margin-top: 250px;\n}\n\n.navBar {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n\n    background-color: black;\n    padding: 5px 10px;\n}\n\n.titleImg{\n    width: 150px;\n    height: 50px;\n}\n\n.map {\n    width: 900px;\n}\n\n.storeHours{\n    width: 900px;\n    display: flex;\n    align-items: center;\n    padding: 5px 10px;\n    font-size: x-large;\n}\n\n.storeHours table {\n    flex: 1;\n}\n\n.storeHours table tr {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n}\n\n.storeHours table th {\n    padding: 5px;\n    text-align: left;\n}\n\n.information {\n    padding: 25px;\n    font-size: large;\n}"],"sourceRoot":""}]);
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
___CSS_LOADER_EXPORT___.push([module.id, ".menuContainer {\n  width: 900px;\n}\n\n.menu {\n  width: 100%;\n  height: 750px;\n  font-size: x-large;\n  text-align: center;\n}\n\n.menu  *{\n  outline-style: solid;\n  outline-color: green;\n}\n\n.menu caption {\n  font-size: xx-large;\n}\n", "",{"version":3,"sources":["webpack://./src/menu.css"],"names":[],"mappings":"AAAA;EACE,YAAY;AACd;;AAEA;EACE,WAAW;EACX,aAAa;EACb,kBAAkB;EAClB,kBAAkB;AACpB;;AAEA;EACE,oBAAoB;EACpB,oBAAoB;AACtB;;AAEA;EACE,mBAAmB;AACrB","sourcesContent":[".menuContainer {\n  width: 900px;\n}\n\n.menu {\n  width: 100%;\n  height: 750px;\n  font-size: x-large;\n  text-align: center;\n}\n\n.menu  *{\n  outline-style: solid;\n  outline-color: green;\n}\n\n.menu caption {\n  font-size: xx-large;\n}\n"],"sourceRoot":""}]);
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

function initialPage(element) {
  element.append(createHeader());
  element.append(createMap());
  element.append(createHours());
  element.append(createInformation());
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
module.exports = __webpack_require__.p + "36810c609e536b89b643.png";

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSx3QkFBd0IsbUJBQU8sQ0FBQyxxREFBUzs7QUFFekM7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBLEdBQUc7O0FBRUg7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7Ozs7Ozs7Ozs7QUNYQSxpQkFBaUIsbUJBQU8sQ0FBQyxxR0FBd0M7QUFDakUsYUFBYSw0SEFBbUQ7QUFDaEUsWUFBWSxtQkFBTyxDQUFDLDJJQUEyRDtBQUMvRSxXQUFXLG1CQUFPLENBQUMsbUJBQU07QUFDekIsVUFBVSxtQkFBTyxDQUFDLHNGQUErQjs7QUFFakQsd0JBQXdCLG1CQUFPLENBQUMscURBQVM7QUFDekMsWUFBWSxtQkFBTyxDQUFDLHFEQUFTO0FBQzdCLFVBQVUsbUJBQU8sQ0FBQyxzREFBUTs7QUFFMUI7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQ0FBb0MsUUFBUTtBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxrQkFBa0Isa0JBQWtCO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQSx1Q0FBdUMsbUJBQW1CO0FBQzFEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULFFBQVE7QUFDUjtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQixxQkFBcUI7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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O0FDcEZhOztBQUViO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7O0FDekJhOztBQUViO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1REFBdUQsY0FBYztBQUNyRTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7O0FDZkE7Ozs7Ozs7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7O0FDeEdhOztBQUViOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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Ozs7O1dDUEQ7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0EsdURBQXVELGlCQUFpQjtXQUN4RTtXQUNBLGdEQUFnRCxhQUFhO1dBQzdEOzs7OztXQ05BO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBOzs7OztXQ2ZBOztXQUVBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7Ozs7V0NyQkE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0F1QztBQUNIO0FBQ0k7QUFDSjtBQUNKOztBQUVoQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxJQUFJLHdEQUFXO0FBQ2YsSUFBSSxtREFBWTtBQUNoQjtBQUNBOztBQUVBO0FBQ0E7QUFDQSxJQUFJLGlEQUFVO0FBQ2QsSUFBSSxtREFBWTtBQUNoQjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvYnJvd3NlcnNsaXN0L2Jyb3dzZXIuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvYnJvd3NlcnNsaXN0L2Vycm9yLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJzbGlzdC9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9icm93c2Vyc2xpc3QvcGFyc2UuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY2FsbC1iaW5kL2NhbGxCb3VuZC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYWxsLWJpbmQvaW5kZXguanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY2FuaXVzZS1saXRlL2RhdGEvYWdlbnRzLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nhbml1c2UtbGl0ZS9kYXRhL2Jyb3dzZXJWZXJzaW9ucy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYW5pdXNlLWxpdGUvZGF0YS9icm93c2Vycy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYW5pdXNlLWxpdGUvZGlzdC91bnBhY2tlci9hZ2VudHMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY2FuaXVzZS1saXRlL2Rpc3QvdW5wYWNrZXIvYnJvd3NlclZlcnNpb25zLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nhbml1c2UtbGl0ZS9kaXN0L3VucGFja2VyL2Jyb3dzZXJzLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL2dsb2JhbC5jc3MiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvaW5pdGlhbFBhZ2UuY3NzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL21lbnUuY3NzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9nZXRVcmwuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9tZW51LmNzdiIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9lbGVjdHJvbi10by1jaHJvbWl1bS92ZXJzaW9ucy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9mdW5jdGlvbi1iaW5kL2ltcGxlbWVudGF0aW9uLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Z1bmN0aW9uLWJpbmQvaW5kZXguanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvZ2V0LWludHJpbnNpYy9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9oYXMtc3ltYm9scy9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9oYXMtc3ltYm9scy9zaGFtcy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9oYXMvc3JjL2luZGV4LmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2ludGVybmFsLXNsb3QvaW5kZXguanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvb2JqZWN0LWluc3BlY3QvaW5kZXguanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvYWJvdXQudHh0Iiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL3NpZGUtY2hhbm5lbC9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9nbG9iYWwuY3NzP2QzYmMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvaW5pdGlhbFBhZ2UuY3NzP2E5YTMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvbWVudS5jc3M/MTEwYiIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL2Zvb3Rlci5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9pbml0aWFscGFnZS5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9tZW51LmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL2lnbm9yZWR8L2hvbWUvanV2ZW5hbC9kZXYvb2Rpbi9wcm9qZWN0cy9yZXN0YXVyYW50UGFnZS9ub2RlX21vZHVsZXMvYnJvd3NlcnNsaXN0fHBhdGgiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvaWdub3JlZHwvaG9tZS9qdXZlbmFsL2Rldi9vZGluL3Byb2plY3RzL3Jlc3RhdXJhbnRQYWdlL25vZGVfbW9kdWxlcy9vYmplY3QtaW5zcGVjdHwuL3V0aWwuaW5zcGVjdCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9lcy1tb2R1bGUtbGV4ZXIvZGlzdC9sZXhlci5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS93ZWJwYWNrL3J1bnRpbWUvY29tcGF0IGdldCBkZWZhdWx0IGV4cG9ydCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL2dsb2JhbCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL3B1YmxpY1BhdGgiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL2pzb25wIGNodW5rIGxvYWRpbmciLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL25vbmNlIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBCcm93c2Vyc2xpc3RFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKVxuXG5mdW5jdGlvbiBub29wKCkge31cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGxvYWRRdWVyaWVzOiBmdW5jdGlvbiBsb2FkUXVlcmllcygpIHtcbiAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAnU2hhcmFibGUgY29uZmlncyBhcmUgbm90IHN1cHBvcnRlZCBpbiBjbGllbnQtc2lkZSBidWlsZCBvZiBCcm93c2Vyc2xpc3QnXG4gICAgKVxuICB9LFxuXG4gIGdldFN0YXQ6IGZ1bmN0aW9uIGdldFN0YXQob3B0cykge1xuICAgIHJldHVybiBvcHRzLnN0YXRzXG4gIH0sXG5cbiAgbG9hZENvbmZpZzogZnVuY3Rpb24gbG9hZENvbmZpZyhvcHRzKSB7XG4gICAgaWYgKG9wdHMuY29uZmlnKSB7XG4gICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAgICdCcm93c2Vyc2xpc3QgY29uZmlnIGFyZSBub3Qgc3VwcG9ydGVkIGluIGNsaWVudC1zaWRlIGJ1aWxkJ1xuICAgICAgKVxuICAgIH1cbiAgfSxcblxuICBsb2FkQ291bnRyeTogZnVuY3Rpb24gbG9hZENvdW50cnkoKSB7XG4gICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgJ0NvdW50cnkgc3RhdGlzdGljcyBhcmUgbm90IHN1cHBvcnRlZCAnICtcbiAgICAgICAgJ2luIGNsaWVudC1zaWRlIGJ1aWxkIG9mIEJyb3dzZXJzbGlzdCdcbiAgICApXG4gIH0sXG5cbiAgbG9hZEZlYXR1cmU6IGZ1bmN0aW9uIGxvYWRGZWF0dXJlKCkge1xuICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICdTdXBwb3J0cyBxdWVyaWVzIGFyZSBub3QgYXZhaWxhYmxlIGluIGNsaWVudC1zaWRlIGJ1aWxkIG9mIEJyb3dzZXJzbGlzdCdcbiAgICApXG4gIH0sXG5cbiAgY3VycmVudE5vZGU6IGZ1bmN0aW9uIGN1cnJlbnROb2RlKHJlc29sdmUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gcmVzb2x2ZShbJ21haW50YWluZWQgbm9kZSB2ZXJzaW9ucyddLCBjb250ZXh0KVswXVxuICB9LFxuXG4gIHBhcnNlQ29uZmlnOiBub29wLFxuXG4gIHJlYWRDb25maWc6IG5vb3AsXG5cbiAgZmluZENvbmZpZzogbm9vcCxcblxuICBjbGVhckNhY2hlczogbm9vcCxcblxuICBvbGREYXRhV2FybmluZzogbm9vcFxufVxuIiwiZnVuY3Rpb24gQnJvd3NlcnNsaXN0RXJyb3IobWVzc2FnZSkge1xuICB0aGlzLm5hbWUgPSAnQnJvd3NlcnNsaXN0RXJyb3InXG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2VcbiAgdGhpcy5icm93c2Vyc2xpc3QgPSB0cnVlXG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEJyb3dzZXJzbGlzdEVycm9yKVxuICB9XG59XG5cbkJyb3dzZXJzbGlzdEVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJyb3dzZXJzbGlzdEVycm9yXG4iLCJ2YXIganNSZWxlYXNlcyA9IHJlcXVpcmUoJ25vZGUtcmVsZWFzZXMvZGF0YS9wcm9jZXNzZWQvZW52cy5qc29uJylcbnZhciBhZ2VudHMgPSByZXF1aXJlKCdjYW5pdXNlLWxpdGUvZGlzdC91bnBhY2tlci9hZ2VudHMnKS5hZ2VudHNcbnZhciBqc0VPTCA9IHJlcXVpcmUoJ25vZGUtcmVsZWFzZXMvZGF0YS9yZWxlYXNlLXNjaGVkdWxlL3JlbGVhc2Utc2NoZWR1bGUuanNvbicpXG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxudmFyIGUyYyA9IHJlcXVpcmUoJ2VsZWN0cm9uLXRvLWNocm9taXVtL3ZlcnNpb25zJylcblxudmFyIEJyb3dzZXJzbGlzdEVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpXG52YXIgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlJylcbnZhciBlbnYgPSByZXF1aXJlKCcuL25vZGUnKSAvLyBXaWxsIGxvYWQgYnJvd3Nlci5qcyBpbiB3ZWJwYWNrXG5cbnZhciBZRUFSID0gMzY1LjI1OTY0MSAqIDI0ICogNjAgKiA2MCAqIDEwMDBcbnZhciBBTkRST0lEX0VWRVJHUkVFTl9GSVJTVCA9IDM3XG5cbi8vIEhlbHBlcnNcblxuZnVuY3Rpb24gaXNWZXJzaW9uc01hdGNoKHZlcnNpb25BLCB2ZXJzaW9uQikge1xuICByZXR1cm4gKHZlcnNpb25BICsgJy4nKS5pbmRleE9mKHZlcnNpb25CICsgJy4nKSA9PT0gMFxufVxuXG5mdW5jdGlvbiBpc0VvbFJlbGVhc2VkKG5hbWUpIHtcbiAgdmFyIHZlcnNpb24gPSBuYW1lLnNsaWNlKDEpXG4gIHJldHVybiBicm93c2Vyc2xpc3Qubm9kZVZlcnNpb25zLnNvbWUoZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gaXNWZXJzaW9uc01hdGNoKGksIHZlcnNpb24pXG4gIH0pXG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZSh2ZXJzaW9ucykge1xuICByZXR1cm4gdmVyc2lvbnMuZmlsdGVyKGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2ZXJzaW9uID09PSAnc3RyaW5nJ1xuICB9KVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVFbGVjdHJvbih2ZXJzaW9uKSB7XG4gIHZhciB2ZXJzaW9uVG9Vc2UgPSB2ZXJzaW9uXG4gIGlmICh2ZXJzaW9uLnNwbGl0KCcuJykubGVuZ3RoID09PSAzKSB7XG4gICAgdmVyc2lvblRvVXNlID0gdmVyc2lvbi5zcGxpdCgnLicpLnNsaWNlKDAsIC0xKS5qb2luKCcuJylcbiAgfVxuICByZXR1cm4gdmVyc2lvblRvVXNlXG59XG5cbmZ1bmN0aW9uIG5hbWVNYXBwZXIobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24gbWFwTmFtZSh2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIG5hbWUgKyAnICcgKyB2ZXJzaW9uXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0TWFqb3IodmVyc2lvbikge1xuICByZXR1cm4gcGFyc2VJbnQodmVyc2lvbi5zcGxpdCgnLicpWzBdKVxufVxuXG5mdW5jdGlvbiBnZXRNYWpvclZlcnNpb25zKHJlbGVhc2VkLCBudW1iZXIpIHtcbiAgaWYgKHJlbGVhc2VkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdXG4gIHZhciBtYWpvclZlcnNpb25zID0gdW5pcShyZWxlYXNlZC5tYXAoZ2V0TWFqb3IpKVxuICB2YXIgbWluaW11bSA9IG1ham9yVmVyc2lvbnNbbWFqb3JWZXJzaW9ucy5sZW5ndGggLSBudW1iZXJdXG4gIGlmICghbWluaW11bSkge1xuICAgIHJldHVybiByZWxlYXNlZFxuICB9XG4gIHZhciBzZWxlY3RlZCA9IFtdXG4gIGZvciAodmFyIGkgPSByZWxlYXNlZC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGlmIChtaW5pbXVtID4gZ2V0TWFqb3IocmVsZWFzZWRbaV0pKSBicmVha1xuICAgIHNlbGVjdGVkLnVuc2hpZnQocmVsZWFzZWRbaV0pXG4gIH1cbiAgcmV0dXJuIHNlbGVjdGVkXG59XG5cbmZ1bmN0aW9uIHVuaXEoYXJyYXkpIHtcbiAgdmFyIGZpbHRlcmVkID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIGlmIChmaWx0ZXJlZC5pbmRleE9mKGFycmF5W2ldKSA9PT0gLTEpIGZpbHRlcmVkLnB1c2goYXJyYXlbaV0pXG4gIH1cbiAgcmV0dXJuIGZpbHRlcmVkXG59XG5cbmZ1bmN0aW9uIGZpbGxVc2FnZShyZXN1bHQsIG5hbWUsIGRhdGEpIHtcbiAgZm9yICh2YXIgaSBpbiBkYXRhKSB7XG4gICAgcmVzdWx0W25hbWUgKyAnICcgKyBpXSA9IGRhdGFbaV1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUZpbHRlcihzaWduLCB2ZXJzaW9uKSB7XG4gIHZlcnNpb24gPSBwYXJzZUZsb2F0KHZlcnNpb24pXG4gIGlmIChzaWduID09PSAnPicpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHYpID4gdmVyc2lvblxuICAgIH1cbiAgfSBlbHNlIGlmIChzaWduID09PSAnPj0nKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdCh2KSA+PSB2ZXJzaW9uXG4gICAgfVxuICB9IGVsc2UgaWYgKHNpZ24gPT09ICc8Jykge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodikgPCB2ZXJzaW9uXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodikgPD0gdmVyc2lvblxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVNlbXZlckZpbHRlcihzaWduLCB2ZXJzaW9uKSB7XG4gIHZlcnNpb24gPSB2ZXJzaW9uLnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICB2ZXJzaW9uWzFdID0gdmVyc2lvblsxXSB8fCAwXG4gIHZlcnNpb25bMl0gPSB2ZXJzaW9uWzJdIHx8IDBcbiAgaWYgKHNpZ24gPT09ICc+Jykge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgdiA9IHYuc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gICAgICByZXR1cm4gY29tcGFyZVNlbXZlcih2LCB2ZXJzaW9uKSA+IDBcbiAgICB9XG4gIH0gZWxzZSBpZiAoc2lnbiA9PT0gJz49Jykge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgdiA9IHYuc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gICAgICByZXR1cm4gY29tcGFyZVNlbXZlcih2LCB2ZXJzaW9uKSA+PSAwXG4gICAgfVxuICB9IGVsc2UgaWYgKHNpZ24gPT09ICc8Jykge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgdiA9IHYuc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gICAgICByZXR1cm4gY29tcGFyZVNlbXZlcih2ZXJzaW9uLCB2KSA+IDBcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2KSB7XG4gICAgICB2ID0gdi5zcGxpdCgnLicpLm1hcChwYXJzZVNpbXBsZUludClcbiAgICAgIHJldHVybiBjb21wYXJlU2VtdmVyKHZlcnNpb24sIHYpID49IDBcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFyc2VTaW1wbGVJbnQoeCkge1xuICByZXR1cm4gcGFyc2VJbnQoeClcbn1cblxuZnVuY3Rpb24gY29tcGFyZShhLCBiKSB7XG4gIGlmIChhIDwgYikgcmV0dXJuIC0xXG4gIGlmIChhID4gYikgcmV0dXJuICsxXG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVTZW12ZXIoYSwgYikge1xuICByZXR1cm4gKFxuICAgIGNvbXBhcmUocGFyc2VJbnQoYVswXSksIHBhcnNlSW50KGJbMF0pKSB8fFxuICAgIGNvbXBhcmUocGFyc2VJbnQoYVsxXSB8fCAnMCcpLCBwYXJzZUludChiWzFdIHx8ICcwJykpIHx8XG4gICAgY29tcGFyZShwYXJzZUludChhWzJdIHx8ICcwJyksIHBhcnNlSW50KGJbMl0gfHwgJzAnKSlcbiAgKVxufVxuXG4vLyB0aGlzIGZvbGxvd3MgdGhlIG5wbS1saWtlIHNlbXZlciBiZWhhdmlvclxuZnVuY3Rpb24gc2VtdmVyRmlsdGVyTG9vc2Uob3BlcmF0b3IsIHJhbmdlKSB7XG4gIHJhbmdlID0gcmFuZ2Uuc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gIGlmICh0eXBlb2YgcmFuZ2VbMV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmFuZ2VbMV0gPSAneCdcbiAgfVxuICAvLyBpZ25vcmUgYW55IHBhdGNoIHZlcnNpb24gYmVjYXVzZSB3ZSBvbmx5IHJldHVybiBtaW5vciB2ZXJzaW9uc1xuICAvLyByYW5nZVsyXSA9ICd4J1xuICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgY2FzZSAnPD0nOlxuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICAgICAgICByZXR1cm4gY29tcGFyZVNlbXZlckxvb3NlKHZlcnNpb24sIHJhbmdlKSA8PSAwXG4gICAgICB9XG4gICAgY2FzZSAnPj0nOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKHZlcnNpb24pIHtcbiAgICAgICAgdmVyc2lvbiA9IHZlcnNpb24uc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gICAgICAgIHJldHVybiBjb21wYXJlU2VtdmVyTG9vc2UodmVyc2lvbiwgcmFuZ2UpID49IDBcbiAgICAgIH1cbiAgfVxufVxuXG4vLyB0aGlzIGZvbGxvd3MgdGhlIG5wbS1saWtlIHNlbXZlciBiZWhhdmlvclxuZnVuY3Rpb24gY29tcGFyZVNlbXZlckxvb3NlKHZlcnNpb24sIHJhbmdlKSB7XG4gIGlmICh2ZXJzaW9uWzBdICE9PSByYW5nZVswXSkge1xuICAgIHJldHVybiB2ZXJzaW9uWzBdIDwgcmFuZ2VbMF0gPyAtMSA6ICsxXG4gIH1cbiAgaWYgKHJhbmdlWzFdID09PSAneCcpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh2ZXJzaW9uWzFdICE9PSByYW5nZVsxXSkge1xuICAgIHJldHVybiB2ZXJzaW9uWzFdIDwgcmFuZ2VbMV0gPyAtMSA6ICsxXG4gIH1cbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVZlcnNpb24oZGF0YSwgdmVyc2lvbikge1xuICBpZiAoZGF0YS52ZXJzaW9ucy5pbmRleE9mKHZlcnNpb24pICE9PSAtMSkge1xuICAgIHJldHVybiB2ZXJzaW9uXG4gIH0gZWxzZSBpZiAoYnJvd3NlcnNsaXN0LnZlcnNpb25BbGlhc2VzW2RhdGEubmFtZV1bdmVyc2lvbl0pIHtcbiAgICByZXR1cm4gYnJvd3NlcnNsaXN0LnZlcnNpb25BbGlhc2VzW2RhdGEubmFtZV1bdmVyc2lvbl1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVWZXJzaW9uKGRhdGEsIHZlcnNpb24pIHtcbiAgdmFyIHJlc29sdmVkID0gcmVzb2x2ZVZlcnNpb24oZGF0YSwgdmVyc2lvbilcbiAgaWYgKHJlc29sdmVkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVkXG4gIH0gZWxzZSBpZiAoZGF0YS52ZXJzaW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZGF0YS52ZXJzaW9uc1swXVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpbHRlckJ5WWVhcihzaW5jZSwgY29udGV4dCkge1xuICBzaW5jZSA9IHNpbmNlIC8gMTAwMFxuICByZXR1cm4gT2JqZWN0LmtleXMoYWdlbnRzKS5yZWR1Y2UoZnVuY3Rpb24gKHNlbGVjdGVkLCBuYW1lKSB7XG4gICAgdmFyIGRhdGEgPSBieU5hbWUobmFtZSwgY29udGV4dClcbiAgICBpZiAoIWRhdGEpIHJldHVybiBzZWxlY3RlZFxuICAgIHZhciB2ZXJzaW9ucyA9IE9iamVjdC5rZXlzKGRhdGEucmVsZWFzZURhdGUpLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgdmFyIGRhdGUgPSBkYXRhLnJlbGVhc2VEYXRlW3ZdXG4gICAgICByZXR1cm4gZGF0ZSAhPT0gbnVsbCAmJiBkYXRlID49IHNpbmNlXG4gICAgfSlcbiAgICByZXR1cm4gc2VsZWN0ZWQuY29uY2F0KHZlcnNpb25zLm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpKVxuICB9LCBbXSlcbn1cblxuZnVuY3Rpb24gY2xvbmVEYXRhKGRhdGEpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBkYXRhLm5hbWUsXG4gICAgdmVyc2lvbnM6IGRhdGEudmVyc2lvbnMsXG4gICAgcmVsZWFzZWQ6IGRhdGEucmVsZWFzZWQsXG4gICAgcmVsZWFzZURhdGU6IGRhdGEucmVsZWFzZURhdGVcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXBWZXJzaW9ucyhkYXRhLCBtYXApIHtcbiAgZGF0YS52ZXJzaW9ucyA9IGRhdGEudmVyc2lvbnMubWFwKGZ1bmN0aW9uIChpKSB7XG4gICAgcmV0dXJuIG1hcFtpXSB8fCBpXG4gIH0pXG4gIGRhdGEucmVsZWFzZWQgPSBkYXRhLnJlbGVhc2VkLm1hcChmdW5jdGlvbiAoaSkge1xuICAgIHJldHVybiBtYXBbaV0gfHwgaVxuICB9KVxuICB2YXIgZml4ZWREYXRlID0ge31cbiAgZm9yICh2YXIgaSBpbiBkYXRhLnJlbGVhc2VEYXRlKSB7XG4gICAgZml4ZWREYXRlW21hcFtpXSB8fCBpXSA9IGRhdGEucmVsZWFzZURhdGVbaV1cbiAgfVxuICBkYXRhLnJlbGVhc2VEYXRlID0gZml4ZWREYXRlXG4gIHJldHVybiBkYXRhXG59XG5cbmZ1bmN0aW9uIGJ5TmFtZShuYW1lLCBjb250ZXh0KSB7XG4gIG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKClcbiAgbmFtZSA9IGJyb3dzZXJzbGlzdC5hbGlhc2VzW25hbWVdIHx8IG5hbWVcbiAgaWYgKGNvbnRleHQubW9iaWxlVG9EZXNrdG9wICYmIGJyb3dzZXJzbGlzdC5kZXNrdG9wTmFtZXNbbmFtZV0pIHtcbiAgICB2YXIgZGVza3RvcCA9IGJyb3dzZXJzbGlzdC5kYXRhW2Jyb3dzZXJzbGlzdC5kZXNrdG9wTmFtZXNbbmFtZV1dXG4gICAgaWYgKG5hbWUgPT09ICdhbmRyb2lkJykge1xuICAgICAgcmV0dXJuIG5vcm1hbGl6ZUFuZHJvaWREYXRhKGNsb25lRGF0YShicm93c2Vyc2xpc3QuZGF0YVtuYW1lXSksIGRlc2t0b3ApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBjbG9uZWQgPSBjbG9uZURhdGEoZGVza3RvcClcbiAgICAgIGNsb25lZC5uYW1lID0gbmFtZVxuICAgICAgaWYgKG5hbWUgPT09ICdvcF9tb2InKSB7XG4gICAgICAgIGNsb25lZCA9IG1hcFZlcnNpb25zKGNsb25lZCwgeyAnMTAuMC0xMC4xJzogJzEwJyB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIGNsb25lZFxuICAgIH1cbiAgfVxuICByZXR1cm4gYnJvd3NlcnNsaXN0LmRhdGFbbmFtZV1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQW5kcm9pZFZlcnNpb25zKGFuZHJvaWRWZXJzaW9ucywgY2hyb21lVmVyc2lvbnMpIHtcbiAgdmFyIGZpcnN0RXZlcmdyZWVuID0gQU5EUk9JRF9FVkVSR1JFRU5fRklSU1RcbiAgdmFyIGxhc3QgPSBjaHJvbWVWZXJzaW9uc1tjaHJvbWVWZXJzaW9ucy5sZW5ndGggLSAxXVxuICByZXR1cm4gYW5kcm9pZFZlcnNpb25zXG4gICAgLmZpbHRlcihmdW5jdGlvbiAodmVyc2lvbikge1xuICAgICAgcmV0dXJuIC9eKD86WzItNF1cXC58WzM0XSQpLy50ZXN0KHZlcnNpb24pXG4gICAgfSlcbiAgICAuY29uY2F0KGNocm9tZVZlcnNpb25zLnNsaWNlKGZpcnN0RXZlcmdyZWVuIC0gbGFzdCAtIDEpKVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVBbmRyb2lkRGF0YShhbmRyb2lkLCBjaHJvbWUpIHtcbiAgYW5kcm9pZC5yZWxlYXNlZCA9IG5vcm1hbGl6ZUFuZHJvaWRWZXJzaW9ucyhhbmRyb2lkLnJlbGVhc2VkLCBjaHJvbWUucmVsZWFzZWQpXG4gIGFuZHJvaWQudmVyc2lvbnMgPSBub3JtYWxpemVBbmRyb2lkVmVyc2lvbnMoYW5kcm9pZC52ZXJzaW9ucywgY2hyb21lLnZlcnNpb25zKVxuICByZXR1cm4gYW5kcm9pZFxufVxuXG5mdW5jdGlvbiBjaGVja05hbWUobmFtZSwgY29udGV4dCkge1xuICB2YXIgZGF0YSA9IGJ5TmFtZShuYW1lLCBjb250ZXh0KVxuICBpZiAoIWRhdGEpIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcignVW5rbm93biBicm93c2VyICcgKyBuYW1lKVxuICByZXR1cm4gZGF0YVxufVxuXG5mdW5jdGlvbiB1bmtub3duUXVlcnkocXVlcnkpIHtcbiAgcmV0dXJuIG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAnVW5rbm93biBicm93c2VyIHF1ZXJ5IGAnICtcbiAgICAgIHF1ZXJ5ICtcbiAgICAgICdgLiAnICtcbiAgICAgICdNYXliZSB5b3UgYXJlIHVzaW5nIG9sZCBCcm93c2Vyc2xpc3Qgb3IgbWFkZSB0eXBvIGluIHF1ZXJ5LidcbiAgKVxufVxuXG5mdW5jdGlvbiBmaWx0ZXJBbmRyb2lkKGxpc3QsIHZlcnNpb25zLCBjb250ZXh0KSB7XG4gIGlmIChjb250ZXh0Lm1vYmlsZVRvRGVza3RvcCkgcmV0dXJuIGxpc3RcbiAgdmFyIHJlbGVhc2VkID0gYnJvd3NlcnNsaXN0LmRhdGEuYW5kcm9pZC5yZWxlYXNlZFxuICB2YXIgbGFzdCA9IHJlbGVhc2VkW3JlbGVhc2VkLmxlbmd0aCAtIDFdXG4gIHZhciBkaWZmID0gbGFzdCAtIEFORFJPSURfRVZFUkdSRUVOX0ZJUlNUIC0gdmVyc2lvbnNcbiAgaWYgKGRpZmYgPiAwKSB7XG4gICAgcmV0dXJuIGxpc3Quc2xpY2UoLTEpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGxpc3Quc2xpY2UoZGlmZiAtIDEpXG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShxdWVyaWVzLCBjb250ZXh0KSB7XG4gIHJldHVybiBwYXJzZShRVUVSSUVTLCBxdWVyaWVzKS5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgbm9kZSwgaW5kZXgpIHtcbiAgICBpZiAobm9kZS5ub3QgJiYgaW5kZXggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICAgJ1dyaXRlIGFueSBicm93c2VycyBxdWVyeSAoZm9yIGluc3RhbmNlLCBgZGVmYXVsdHNgKSAnICtcbiAgICAgICAgICAnYmVmb3JlIGAnICtcbiAgICAgICAgICBub2RlLnF1ZXJ5ICtcbiAgICAgICAgICAnYCdcbiAgICAgIClcbiAgICB9XG4gICAgdmFyIHR5cGUgPSBRVUVSSUVTW25vZGUudHlwZV1cbiAgICB2YXIgYXJyYXkgPSB0eXBlLnNlbGVjdC5jYWxsKGJyb3dzZXJzbGlzdCwgY29udGV4dCwgbm9kZSkubWFwKGZ1bmN0aW9uIChqKSB7XG4gICAgICB2YXIgcGFydHMgPSBqLnNwbGl0KCcgJylcbiAgICAgIGlmIChwYXJ0c1sxXSA9PT0gJzAnKSB7XG4gICAgICAgIHJldHVybiBwYXJ0c1swXSArICcgJyArIGJ5TmFtZShwYXJ0c1swXSwgY29udGV4dCkudmVyc2lvbnNbMF1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBqXG4gICAgICB9XG4gICAgfSlcblxuICAgIGlmIChub2RlLmNvbXBvc2UgPT09ICdhbmQnKSB7XG4gICAgICBpZiAobm9kZS5ub3QpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5maWx0ZXIoZnVuY3Rpb24gKGopIHtcbiAgICAgICAgICByZXR1cm4gYXJyYXkuaW5kZXhPZihqKSA9PT0gLTFcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZXN1bHQuZmlsdGVyKGZ1bmN0aW9uIChqKSB7XG4gICAgICAgICAgcmV0dXJuIGFycmF5LmluZGV4T2YoaikgIT09IC0xXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChub2RlLm5vdCkge1xuICAgICAgICB2YXIgZmlsdGVyID0ge31cbiAgICAgICAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoaikge1xuICAgICAgICAgIGZpbHRlcltqXSA9IHRydWVcbiAgICAgICAgfSlcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5maWx0ZXIoZnVuY3Rpb24gKGopIHtcbiAgICAgICAgICByZXR1cm4gIWZpbHRlcltqXVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdC5jb25jYXQoYXJyYXkpXG4gICAgfVxuICB9LCBbXSlcbn1cblxuZnVuY3Rpb24gcHJlcGFyZU9wdHMob3B0cykge1xuICBpZiAodHlwZW9mIG9wdHMgPT09ICd1bmRlZmluZWQnKSBvcHRzID0ge31cblxuICBpZiAodHlwZW9mIG9wdHMucGF0aCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBvcHRzLnBhdGggPSBwYXRoLnJlc29sdmUgPyBwYXRoLnJlc29sdmUoJy4nKSA6ICcuJ1xuICB9XG5cbiAgcmV0dXJuIG9wdHNcbn1cblxuZnVuY3Rpb24gcHJlcGFyZVF1ZXJpZXMocXVlcmllcywgb3B0cykge1xuICBpZiAodHlwZW9mIHF1ZXJpZXMgPT09ICd1bmRlZmluZWQnIHx8IHF1ZXJpZXMgPT09IG51bGwpIHtcbiAgICB2YXIgY29uZmlnID0gYnJvd3NlcnNsaXN0LmxvYWRDb25maWcob3B0cylcbiAgICBpZiAoY29uZmlnKSB7XG4gICAgICBxdWVyaWVzID0gY29uZmlnXG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXJpZXMgPSBicm93c2Vyc2xpc3QuZGVmYXVsdHNcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcXVlcmllc1xufVxuXG5mdW5jdGlvbiBjaGVja1F1ZXJpZXMocXVlcmllcykge1xuICBpZiAoISh0eXBlb2YgcXVlcmllcyA9PT0gJ3N0cmluZycgfHwgQXJyYXkuaXNBcnJheShxdWVyaWVzKSkpIHtcbiAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAnQnJvd3NlciBxdWVyaWVzIG11c3QgYmUgYW4gYXJyYXkgb3Igc3RyaW5nLiBHb3QgJyArIHR5cGVvZiBxdWVyaWVzICsgJy4nXG4gICAgKVxuICB9XG59XG5cbnZhciBjYWNoZSA9IHt9XG5cbmZ1bmN0aW9uIGJyb3dzZXJzbGlzdChxdWVyaWVzLCBvcHRzKSB7XG4gIG9wdHMgPSBwcmVwYXJlT3B0cyhvcHRzKVxuICBxdWVyaWVzID0gcHJlcGFyZVF1ZXJpZXMocXVlcmllcywgb3B0cylcbiAgY2hlY2tRdWVyaWVzKHF1ZXJpZXMpXG5cbiAgdmFyIGNvbnRleHQgPSB7XG4gICAgaWdub3JlVW5rbm93blZlcnNpb25zOiBvcHRzLmlnbm9yZVVua25vd25WZXJzaW9ucyxcbiAgICBkYW5nZXJvdXNFeHRlbmQ6IG9wdHMuZGFuZ2Vyb3VzRXh0ZW5kLFxuICAgIG1vYmlsZVRvRGVza3RvcDogb3B0cy5tb2JpbGVUb0Rlc2t0b3AsXG4gICAgcGF0aDogb3B0cy5wYXRoLFxuICAgIGVudjogb3B0cy5lbnZcbiAgfVxuXG4gIGVudi5vbGREYXRhV2FybmluZyhicm93c2Vyc2xpc3QuZGF0YSlcbiAgdmFyIHN0YXRzID0gZW52LmdldFN0YXQob3B0cywgYnJvd3NlcnNsaXN0LmRhdGEpXG4gIGlmIChzdGF0cykge1xuICAgIGNvbnRleHQuY3VzdG9tVXNhZ2UgPSB7fVxuICAgIGZvciAodmFyIGJyb3dzZXIgaW4gc3RhdHMpIHtcbiAgICAgIGZpbGxVc2FnZShjb250ZXh0LmN1c3RvbVVzYWdlLCBicm93c2VyLCBzdGF0c1ticm93c2VyXSlcbiAgICB9XG4gIH1cblxuICB2YXIgY2FjaGVLZXkgPSBKU09OLnN0cmluZ2lmeShbcXVlcmllcywgY29udGV4dF0pXG4gIGlmIChjYWNoZVtjYWNoZUtleV0pIHJldHVybiBjYWNoZVtjYWNoZUtleV1cblxuICB2YXIgcmVzdWx0ID0gdW5pcShyZXNvbHZlKHF1ZXJpZXMsIGNvbnRleHQpKS5zb3J0KGZ1bmN0aW9uIChuYW1lMSwgbmFtZTIpIHtcbiAgICBuYW1lMSA9IG5hbWUxLnNwbGl0KCcgJylcbiAgICBuYW1lMiA9IG5hbWUyLnNwbGl0KCcgJylcbiAgICBpZiAobmFtZTFbMF0gPT09IG5hbWUyWzBdKSB7XG4gICAgICAvLyBhc3N1bXB0aW9ucyBvbiBjYW5pdXNlIGRhdGFcbiAgICAgIC8vIDEpIHZlcnNpb24gcmFuZ2VzIG5ldmVyIG92ZXJsYXBzXG4gICAgICAvLyAyKSBpZiB2ZXJzaW9uIGlzIG5vdCBhIHJhbmdlLCBpdCBuZXZlciBjb250YWlucyBgLWBcbiAgICAgIHZhciB2ZXJzaW9uMSA9IG5hbWUxWzFdLnNwbGl0KCctJylbMF1cbiAgICAgIHZhciB2ZXJzaW9uMiA9IG5hbWUyWzFdLnNwbGl0KCctJylbMF1cbiAgICAgIHJldHVybiBjb21wYXJlU2VtdmVyKHZlcnNpb24yLnNwbGl0KCcuJyksIHZlcnNpb24xLnNwbGl0KCcuJykpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjb21wYXJlKG5hbWUxWzBdLCBuYW1lMlswXSlcbiAgICB9XG4gIH0pXG4gIGlmICghcHJvY2Vzcy5lbnYuQlJPV1NFUlNMSVNUX0RJU0FCTEVfQ0FDSEUpIHtcbiAgICBjYWNoZVtjYWNoZUtleV0gPSByZXN1bHRcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbmJyb3dzZXJzbGlzdC5wYXJzZSA9IGZ1bmN0aW9uIChxdWVyaWVzLCBvcHRzKSB7XG4gIG9wdHMgPSBwcmVwYXJlT3B0cyhvcHRzKVxuICBxdWVyaWVzID0gcHJlcGFyZVF1ZXJpZXMocXVlcmllcywgb3B0cylcbiAgY2hlY2tRdWVyaWVzKHF1ZXJpZXMpXG4gIHJldHVybiBwYXJzZShRVUVSSUVTLCBxdWVyaWVzKVxufVxuXG4vLyBXaWxsIGJlIGZpbGxlZCBieSBDYW4gSSBVc2UgZGF0YSBiZWxvd1xuYnJvd3NlcnNsaXN0LmNhY2hlID0ge31cbmJyb3dzZXJzbGlzdC5kYXRhID0ge31cbmJyb3dzZXJzbGlzdC51c2FnZSA9IHtcbiAgZ2xvYmFsOiB7fSxcbiAgY3VzdG9tOiBudWxsXG59XG5cbi8vIERlZmF1bHQgYnJvd3NlcnMgcXVlcnlcbmJyb3dzZXJzbGlzdC5kZWZhdWx0cyA9IFsnPiAwLjUlJywgJ2xhc3QgMiB2ZXJzaW9ucycsICdGaXJlZm94IEVTUicsICdub3QgZGVhZCddXG5cbi8vIEJyb3dzZXIgbmFtZXMgYWxpYXNlc1xuYnJvd3NlcnNsaXN0LmFsaWFzZXMgPSB7XG4gIGZ4OiAnZmlyZWZveCcsXG4gIGZmOiAnZmlyZWZveCcsXG4gIGlvczogJ2lvc19zYWYnLFxuICBleHBsb3JlcjogJ2llJyxcbiAgYmxhY2tiZXJyeTogJ2JiJyxcbiAgZXhwbG9yZXJtb2JpbGU6ICdpZV9tb2InLFxuICBvcGVyYW1pbmk6ICdvcF9taW5pJyxcbiAgb3BlcmFtb2JpbGU6ICdvcF9tb2InLFxuICBjaHJvbWVhbmRyb2lkOiAnYW5kX2NocicsXG4gIGZpcmVmb3hhbmRyb2lkOiAnYW5kX2ZmJyxcbiAgdWNhbmRyb2lkOiAnYW5kX3VjJyxcbiAgcXFhbmRyb2lkOiAnYW5kX3FxJ1xufVxuXG4vLyBDYW4gSSBVc2Ugb25seSBwcm92aWRlcyBhIGZldyB2ZXJzaW9ucyBmb3Igc29tZSBicm93c2VycyAoZS5nLiBhbmRfY2hyKS5cbi8vIEZhbGxiYWNrIHRvIGEgc2ltaWxhciBicm93c2VyIGZvciB1bmtub3duIHZlcnNpb25zXG5icm93c2Vyc2xpc3QuZGVza3RvcE5hbWVzID0ge1xuICBhbmRfY2hyOiAnY2hyb21lJyxcbiAgYW5kX2ZmOiAnZmlyZWZveCcsXG4gIGllX21vYjogJ2llJyxcbiAgb3BfbW9iOiAnb3BlcmEnLFxuICBhbmRyb2lkOiAnY2hyb21lJyAvLyBoYXMgZXh0cmEgcHJvY2Vzc2luZyBsb2dpY1xufVxuXG4vLyBBbGlhc2VzIHRvIHdvcmsgd2l0aCBqb2luZWQgdmVyc2lvbnMgbGlrZSBgaW9zX3NhZiA3LjAtNy4xYFxuYnJvd3NlcnNsaXN0LnZlcnNpb25BbGlhc2VzID0ge31cblxuYnJvd3NlcnNsaXN0LmNsZWFyQ2FjaGVzID0gZW52LmNsZWFyQ2FjaGVzXG5icm93c2Vyc2xpc3QucGFyc2VDb25maWcgPSBlbnYucGFyc2VDb25maWdcbmJyb3dzZXJzbGlzdC5yZWFkQ29uZmlnID0gZW52LnJlYWRDb25maWdcbmJyb3dzZXJzbGlzdC5maW5kQ29uZmlnID0gZW52LmZpbmRDb25maWdcbmJyb3dzZXJzbGlzdC5sb2FkQ29uZmlnID0gZW52LmxvYWRDb25maWdcblxuYnJvd3NlcnNsaXN0LmNvdmVyYWdlID0gZnVuY3Rpb24gKGJyb3dzZXJzLCBzdGF0cykge1xuICB2YXIgZGF0YVxuICBpZiAodHlwZW9mIHN0YXRzID09PSAndW5kZWZpbmVkJykge1xuICAgIGRhdGEgPSBicm93c2Vyc2xpc3QudXNhZ2UuZ2xvYmFsXG4gIH0gZWxzZSBpZiAoc3RhdHMgPT09ICdteSBzdGF0cycpIHtcbiAgICB2YXIgb3B0cyA9IHt9XG4gICAgb3B0cy5wYXRoID0gcGF0aC5yZXNvbHZlID8gcGF0aC5yZXNvbHZlKCcuJykgOiAnLidcbiAgICB2YXIgY3VzdG9tU3RhdHMgPSBlbnYuZ2V0U3RhdChvcHRzKVxuICAgIGlmICghY3VzdG9tU3RhdHMpIHtcbiAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcignQ3VzdG9tIHVzYWdlIHN0YXRpc3RpY3Mgd2FzIG5vdCBwcm92aWRlZCcpXG4gICAgfVxuICAgIGRhdGEgPSB7fVxuICAgIGZvciAodmFyIGJyb3dzZXIgaW4gY3VzdG9tU3RhdHMpIHtcbiAgICAgIGZpbGxVc2FnZShkYXRhLCBicm93c2VyLCBjdXN0b21TdGF0c1ticm93c2VyXSlcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHN0YXRzID09PSAnc3RyaW5nJykge1xuICAgIGlmIChzdGF0cy5sZW5ndGggPiAyKSB7XG4gICAgICBzdGF0cyA9IHN0YXRzLnRvTG93ZXJDYXNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHMgPSBzdGF0cy50b1VwcGVyQ2FzZSgpXG4gICAgfVxuICAgIGVudi5sb2FkQ291bnRyeShicm93c2Vyc2xpc3QudXNhZ2UsIHN0YXRzLCBicm93c2Vyc2xpc3QuZGF0YSlcbiAgICBkYXRhID0gYnJvd3NlcnNsaXN0LnVzYWdlW3N0YXRzXVxuICB9IGVsc2Uge1xuICAgIGlmICgnZGF0YUJ5QnJvd3NlcicgaW4gc3RhdHMpIHtcbiAgICAgIHN0YXRzID0gc3RhdHMuZGF0YUJ5QnJvd3NlclxuICAgIH1cbiAgICBkYXRhID0ge31cbiAgICBmb3IgKHZhciBuYW1lIGluIHN0YXRzKSB7XG4gICAgICBmb3IgKHZhciB2ZXJzaW9uIGluIHN0YXRzW25hbWVdKSB7XG4gICAgICAgIGRhdGFbbmFtZSArICcgJyArIHZlcnNpb25dID0gc3RhdHNbbmFtZV1bdmVyc2lvbl1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnJvd3NlcnMucmVkdWNlKGZ1bmN0aW9uIChhbGwsIGkpIHtcbiAgICB2YXIgdXNhZ2UgPSBkYXRhW2ldXG4gICAgaWYgKHVzYWdlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHVzYWdlID0gZGF0YVtpLnJlcGxhY2UoLyBcXFMrJC8sICcgMCcpXVxuICAgIH1cbiAgICByZXR1cm4gYWxsICsgKHVzYWdlIHx8IDApXG4gIH0sIDApXG59XG5cbmZ1bmN0aW9uIG5vZGVRdWVyeShjb250ZXh0LCBub2RlKSB7XG4gIHZhciBtYXRjaGVkID0gYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9ucy5maWx0ZXIoZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gaXNWZXJzaW9uc01hdGNoKGksIG5vZGUudmVyc2lvbilcbiAgfSlcbiAgaWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGNvbnRleHQuaWdub3JlVW5rbm93blZlcnNpb25zKSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgICAnVW5rbm93biB2ZXJzaW9uICcgKyBub2RlLnZlcnNpb24gKyAnIG9mIE5vZGUuanMnXG4gICAgICApXG4gICAgfVxuICB9XG4gIHJldHVybiBbJ25vZGUgJyArIG1hdGNoZWRbbWF0Y2hlZC5sZW5ndGggLSAxXV1cbn1cblxuZnVuY3Rpb24gc2luY2VRdWVyeShjb250ZXh0LCBub2RlKSB7XG4gIHZhciB5ZWFyID0gcGFyc2VJbnQobm9kZS55ZWFyKVxuICB2YXIgbW9udGggPSBwYXJzZUludChub2RlLm1vbnRoIHx8ICcwMScpIC0gMVxuICB2YXIgZGF5ID0gcGFyc2VJbnQobm9kZS5kYXkgfHwgJzAxJylcbiAgcmV0dXJuIGZpbHRlckJ5WWVhcihEYXRlLlVUQyh5ZWFyLCBtb250aCwgZGF5LCAwLCAwLCAwKSwgY29udGV4dClcbn1cblxuZnVuY3Rpb24gY292ZXJRdWVyeShjb250ZXh0LCBub2RlKSB7XG4gIHZhciBjb3ZlcmFnZSA9IHBhcnNlRmxvYXQobm9kZS5jb3ZlcmFnZSlcbiAgdmFyIHVzYWdlID0gYnJvd3NlcnNsaXN0LnVzYWdlLmdsb2JhbFxuICBpZiAobm9kZS5wbGFjZSkge1xuICAgIGlmIChub2RlLnBsYWNlLm1hdGNoKC9ebXlcXHMrc3RhdHMkL2kpKSB7XG4gICAgICBpZiAoIWNvbnRleHQuY3VzdG9tVXNhZ2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKCdDdXN0b20gdXNhZ2Ugc3RhdGlzdGljcyB3YXMgbm90IHByb3ZpZGVkJylcbiAgICAgIH1cbiAgICAgIHVzYWdlID0gY29udGV4dC5jdXN0b21Vc2FnZVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcGxhY2VcbiAgICAgIGlmIChub2RlLnBsYWNlLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBwbGFjZSA9IG5vZGUucGxhY2UudG9VcHBlckNhc2UoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGxhY2UgPSBub2RlLnBsYWNlLnRvTG93ZXJDYXNlKClcbiAgICAgIH1cbiAgICAgIGVudi5sb2FkQ291bnRyeShicm93c2Vyc2xpc3QudXNhZ2UsIHBsYWNlLCBicm93c2Vyc2xpc3QuZGF0YSlcbiAgICAgIHVzYWdlID0gYnJvd3NlcnNsaXN0LnVzYWdlW3BsYWNlXVxuICAgIH1cbiAgfVxuICB2YXIgdmVyc2lvbnMgPSBPYmplY3Qua2V5cyh1c2FnZSkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiB1c2FnZVtiXSAtIHVzYWdlW2FdXG4gIH0pXG4gIHZhciBjb3ZlcmFnZWQgPSAwXG4gIHZhciByZXN1bHQgPSBbXVxuICB2YXIgdmVyc2lvblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnNpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmVyc2lvbiA9IHZlcnNpb25zW2ldXG4gICAgaWYgKHVzYWdlW3ZlcnNpb25dID09PSAwKSBicmVha1xuICAgIGNvdmVyYWdlZCArPSB1c2FnZVt2ZXJzaW9uXVxuICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgaWYgKGNvdmVyYWdlZCA+PSBjb3ZlcmFnZSkgYnJlYWtcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbnZhciBRVUVSSUVTID0ge1xuICBsYXN0X21ham9yX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccyttYWpvclxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGFnZW50cykucmVkdWNlKGZ1bmN0aW9uIChzZWxlY3RlZCwgbmFtZSkge1xuICAgICAgICB2YXIgZGF0YSA9IGJ5TmFtZShuYW1lLCBjb250ZXh0KVxuICAgICAgICBpZiAoIWRhdGEpIHJldHVybiBzZWxlY3RlZFxuICAgICAgICB2YXIgbGlzdCA9IGdldE1ham9yVmVyc2lvbnMoZGF0YS5yZWxlYXNlZCwgbm9kZS52ZXJzaW9ucylcbiAgICAgICAgbGlzdCA9IGxpc3QubWFwKG5hbWVNYXBwZXIoZGF0YS5uYW1lKSlcbiAgICAgICAgaWYgKGRhdGEubmFtZSA9PT0gJ2FuZHJvaWQnKSB7XG4gICAgICAgICAgbGlzdCA9IGZpbHRlckFuZHJvaWQobGlzdCwgbm9kZS52ZXJzaW9ucywgY29udGV4dClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWQuY29uY2F0KGxpc3QpXG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIGxhc3RfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb25zJ10sXG4gICAgcmVnZXhwOiAvXmxhc3RcXHMrKFxcZCspXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoYWdlbnRzKS5yZWR1Y2UoZnVuY3Rpb24gKHNlbGVjdGVkLCBuYW1lKSB7XG4gICAgICAgIHZhciBkYXRhID0gYnlOYW1lKG5hbWUsIGNvbnRleHQpXG4gICAgICAgIGlmICghZGF0YSkgcmV0dXJuIHNlbGVjdGVkXG4gICAgICAgIHZhciBsaXN0ID0gZGF0YS5yZWxlYXNlZC5zbGljZSgtbm9kZS52ZXJzaW9ucylcbiAgICAgICAgbGlzdCA9IGxpc3QubWFwKG5hbWVNYXBwZXIoZGF0YS5uYW1lKSlcbiAgICAgICAgaWYgKGRhdGEubmFtZSA9PT0gJ2FuZHJvaWQnKSB7XG4gICAgICAgICAgbGlzdCA9IGZpbHRlckFuZHJvaWQobGlzdCwgbm9kZS52ZXJzaW9ucywgY29udGV4dClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWQuY29uY2F0KGxpc3QpXG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIGxhc3RfZWxlY3Ryb25fbWFqb3JfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb25zJ10sXG4gICAgcmVnZXhwOiAvXmxhc3RcXHMrKFxcZCspXFxzK2VsZWN0cm9uXFxzK21ham9yXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgdmFsaWRWZXJzaW9ucyA9IGdldE1ham9yVmVyc2lvbnMoT2JqZWN0LmtleXMoZTJjKSwgbm9kZS52ZXJzaW9ucylcbiAgICAgIHJldHVybiB2YWxpZFZlcnNpb25zLm1hcChmdW5jdGlvbiAoaSkge1xuICAgICAgICByZXR1cm4gJ2Nocm9tZSAnICsgZTJjW2ldXG4gICAgICB9KVxuICAgIH1cbiAgfSxcbiAgbGFzdF9ub2RlX21ham9yX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccytub2RlXFxzK21ham9yXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gZ2V0TWFqb3JWZXJzaW9ucyhicm93c2Vyc2xpc3Qubm9kZVZlcnNpb25zLCBub2RlLnZlcnNpb25zKS5tYXAoXG4gICAgICAgIGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuICdub2RlICcgKyB2ZXJzaW9uXG4gICAgICAgIH1cbiAgICAgIClcbiAgICB9XG4gIH0sXG4gIGxhc3RfYnJvd3Nlcl9tYWpvcl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnLCAnYnJvd3NlciddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccysoXFx3KylcXHMrbWFqb3JcXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHZhciB2YWxpZFZlcnNpb25zID0gZ2V0TWFqb3JWZXJzaW9ucyhkYXRhLnJlbGVhc2VkLCBub2RlLnZlcnNpb25zKVxuICAgICAgdmFyIGxpc3QgPSB2YWxpZFZlcnNpb25zLm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpXG4gICAgICBpZiAoZGF0YS5uYW1lID09PSAnYW5kcm9pZCcpIHtcbiAgICAgICAgbGlzdCA9IGZpbHRlckFuZHJvaWQobGlzdCwgbm9kZS52ZXJzaW9ucywgY29udGV4dClcbiAgICAgIH1cbiAgICAgIHJldHVybiBsaXN0XG4gICAgfVxuICB9LFxuICBsYXN0X2VsZWN0cm9uX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccytlbGVjdHJvblxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGUyYylcbiAgICAgICAgLnNsaWNlKC1ub2RlLnZlcnNpb25zKVxuICAgICAgICAubWFwKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgcmV0dXJuICdjaHJvbWUgJyArIGUyY1tpXVxuICAgICAgICB9KVxuICAgIH1cbiAgfSxcbiAgbGFzdF9ub2RlX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccytub2RlXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9uc1xuICAgICAgICAuc2xpY2UoLW5vZGUudmVyc2lvbnMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKHZlcnNpb24pIHtcbiAgICAgICAgICByZXR1cm4gJ25vZGUgJyArIHZlcnNpb25cbiAgICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIGxhc3RfYnJvd3Nlcl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnLCAnYnJvd3NlciddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccysoXFx3KylcXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHZhciBsaXN0ID0gZGF0YS5yZWxlYXNlZC5zbGljZSgtbm9kZS52ZXJzaW9ucykubWFwKG5hbWVNYXBwZXIoZGF0YS5uYW1lKSlcbiAgICAgIGlmIChkYXRhLm5hbWUgPT09ICdhbmRyb2lkJykge1xuICAgICAgICBsaXN0ID0gZmlsdGVyQW5kcm9pZChsaXN0LCBub2RlLnZlcnNpb25zLCBjb250ZXh0KVxuICAgICAgfVxuICAgICAgcmV0dXJuIGxpc3RcbiAgICB9XG4gIH0sXG4gIHVucmVsZWFzZWRfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9edW5yZWxlYXNlZFxccyt2ZXJzaW9ucyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoYWdlbnRzKS5yZWR1Y2UoZnVuY3Rpb24gKHNlbGVjdGVkLCBuYW1lKSB7XG4gICAgICAgIHZhciBkYXRhID0gYnlOYW1lKG5hbWUsIGNvbnRleHQpXG4gICAgICAgIGlmICghZGF0YSkgcmV0dXJuIHNlbGVjdGVkXG4gICAgICAgIHZhciBsaXN0ID0gZGF0YS52ZXJzaW9ucy5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YS5yZWxlYXNlZC5pbmRleE9mKHYpID09PSAtMVxuICAgICAgICB9KVxuICAgICAgICBsaXN0ID0gbGlzdC5tYXAobmFtZU1hcHBlcihkYXRhLm5hbWUpKVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWQuY29uY2F0KGxpc3QpXG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIHVucmVsZWFzZWRfZWxlY3Ryb25fdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9edW5yZWxlYXNlZFxccytlbGVjdHJvblxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gW11cbiAgICB9XG4gIH0sXG4gIHVucmVsZWFzZWRfYnJvd3Nlcl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsnYnJvd3NlciddLFxuICAgIHJlZ2V4cDogL151bnJlbGVhc2VkXFxzKyhcXHcrKVxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIGRhdGEgPSBjaGVja05hbWUobm9kZS5icm93c2VyLCBjb250ZXh0KVxuICAgICAgcmV0dXJuIGRhdGEudmVyc2lvbnNcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgIHJldHVybiBkYXRhLnJlbGVhc2VkLmluZGV4T2YodikgPT09IC0xXG4gICAgICAgIH0pXG4gICAgICAgIC5tYXAobmFtZU1hcHBlcihkYXRhLm5hbWUpKVxuICAgIH1cbiAgfSxcbiAgbGFzdF95ZWFyczoge1xuICAgIG1hdGNoZXM6IFsneWVhcnMnXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKi4/XFxkKylcXHMreWVhcnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHJldHVybiBmaWx0ZXJCeVllYXIoRGF0ZS5ub3coKSAtIFlFQVIgKiBub2RlLnllYXJzLCBjb250ZXh0KVxuICAgIH1cbiAgfSxcbiAgc2luY2VfeToge1xuICAgIG1hdGNoZXM6IFsneWVhciddLFxuICAgIHJlZ2V4cDogL15zaW5jZSAoXFxkKykkL2ksXG4gICAgc2VsZWN0OiBzaW5jZVF1ZXJ5XG4gIH0sXG4gIHNpbmNlX3lfbToge1xuICAgIG1hdGNoZXM6IFsneWVhcicsICdtb250aCddLFxuICAgIHJlZ2V4cDogL15zaW5jZSAoXFxkKyktKFxcZCspJC9pLFxuICAgIHNlbGVjdDogc2luY2VRdWVyeVxuICB9LFxuICBzaW5jZV95X21fZDoge1xuICAgIG1hdGNoZXM6IFsneWVhcicsICdtb250aCcsICdkYXknXSxcbiAgICByZWdleHA6IC9ec2luY2UgKFxcZCspLShcXGQrKS0oXFxkKykkL2ksXG4gICAgc2VsZWN0OiBzaW5jZVF1ZXJ5XG4gIH0sXG4gIHBvcHVsYXJpdHk6IHtcbiAgICBtYXRjaGVzOiBbJ3NpZ24nLCAncG9wdWxhcml0eSddLFxuICAgIHJlZ2V4cDogL14oPj0/fDw9PylcXHMqKFxcZCt8XFxkK1xcLlxcZCt8XFwuXFxkKyklJC8sXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIHBvcHVsYXJpdHkgPSBwYXJzZUZsb2F0KG5vZGUucG9wdWxhcml0eSlcbiAgICAgIHZhciB1c2FnZSA9IGJyb3dzZXJzbGlzdC51c2FnZS5nbG9iYWxcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyh1c2FnZSkucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZlcnNpb24pIHtcbiAgICAgICAgaWYgKG5vZGUuc2lnbiA9PT0gJz4nKSB7XG4gICAgICAgICAgaWYgKHVzYWdlW3ZlcnNpb25dID4gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPCcpIHtcbiAgICAgICAgICBpZiAodXNhZ2VbdmVyc2lvbl0gPCBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLnNpZ24gPT09ICc8PScpIHtcbiAgICAgICAgICBpZiAodXNhZ2VbdmVyc2lvbl0gPD0gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodXNhZ2VbdmVyc2lvbl0gPj0gcG9wdWxhcml0eSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICBwb3B1bGFyaXR5X2luX215X3N0YXRzOiB7XG4gICAgbWF0Y2hlczogWydzaWduJywgJ3BvcHVsYXJpdHknXSxcbiAgICByZWdleHA6IC9eKD49P3w8PT8pXFxzKihcXGQrfFxcZCtcXC5cXGQrfFxcLlxcZCspJVxccytpblxccytteVxccytzdGF0cyQvLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBwb3B1bGFyaXR5ID0gcGFyc2VGbG9hdChub2RlLnBvcHVsYXJpdHkpXG4gICAgICBpZiAoIWNvbnRleHQuY3VzdG9tVXNhZ2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKCdDdXN0b20gdXNhZ2Ugc3RhdGlzdGljcyB3YXMgbm90IHByb3ZpZGVkJylcbiAgICAgIH1cbiAgICAgIHZhciB1c2FnZSA9IGNvbnRleHQuY3VzdG9tVXNhZ2VcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyh1c2FnZSkucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZlcnNpb24pIHtcbiAgICAgICAgdmFyIHBlcmNlbnRhZ2UgPSB1c2FnZVt2ZXJzaW9uXVxuICAgICAgICBpZiAocGVyY2VudGFnZSA9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuc2lnbiA9PT0gJz4nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPiBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLnNpZ24gPT09ICc8Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlIDwgcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPD0nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPD0gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocGVyY2VudGFnZSA+PSBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIHBvcHVsYXJpdHlfaW5fY29uZmlnX3N0YXRzOiB7XG4gICAgbWF0Y2hlczogWydzaWduJywgJ3BvcHVsYXJpdHknLCAnY29uZmlnJ10sXG4gICAgcmVnZXhwOiAvXig+PT98PD0/KVxccyooXFxkK3xcXGQrXFwuXFxkK3xcXC5cXGQrKSVcXHMraW5cXHMrKFxcUyspXFxzK3N0YXRzJC8sXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIHBvcHVsYXJpdHkgPSBwYXJzZUZsb2F0KG5vZGUucG9wdWxhcml0eSlcbiAgICAgIHZhciBzdGF0cyA9IGVudi5sb2FkU3RhdChjb250ZXh0LCBub2RlLmNvbmZpZywgYnJvd3NlcnNsaXN0LmRhdGEpXG4gICAgICBpZiAoc3RhdHMpIHtcbiAgICAgICAgY29udGV4dC5jdXN0b21Vc2FnZSA9IHt9XG4gICAgICAgIGZvciAodmFyIGJyb3dzZXIgaW4gc3RhdHMpIHtcbiAgICAgICAgICBmaWxsVXNhZ2UoY29udGV4dC5jdXN0b21Vc2FnZSwgYnJvd3Nlciwgc3RhdHNbYnJvd3Nlcl0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghY29udGV4dC5jdXN0b21Vc2FnZSkge1xuICAgICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoJ0N1c3RvbSB1c2FnZSBzdGF0aXN0aWNzIHdhcyBub3QgcHJvdmlkZWQnKVxuICAgICAgfVxuICAgICAgdmFyIHVzYWdlID0gY29udGV4dC5jdXN0b21Vc2FnZVxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHVzYWdlKS5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgdmVyc2lvbikge1xuICAgICAgICB2YXIgcGVyY2VudGFnZSA9IHVzYWdlW3ZlcnNpb25dXG4gICAgICAgIGlmIChwZXJjZW50YWdlID09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5zaWduID09PSAnPicpIHtcbiAgICAgICAgICBpZiAocGVyY2VudGFnZSA+IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuc2lnbiA9PT0gJzwnKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPCBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLnNpZ24gPT09ICc8PScpIHtcbiAgICAgICAgICBpZiAocGVyY2VudGFnZSA8PSBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChwZXJjZW50YWdlID49IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgIH0sIFtdKVxuICAgIH1cbiAgfSxcbiAgcG9wdWxhcml0eV9pbl9wbGFjZToge1xuICAgIG1hdGNoZXM6IFsnc2lnbicsICdwb3B1bGFyaXR5JywgJ3BsYWNlJ10sXG4gICAgcmVnZXhwOiAvXig+PT98PD0/KVxccyooXFxkK3xcXGQrXFwuXFxkK3xcXC5cXGQrKSVcXHMraW5cXHMrKChhbHQtKT9cXHdcXHcpJC8sXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIHBvcHVsYXJpdHkgPSBwYXJzZUZsb2F0KG5vZGUucG9wdWxhcml0eSlcbiAgICAgIHZhciBwbGFjZSA9IG5vZGUucGxhY2VcbiAgICAgIGlmIChwbGFjZS5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgcGxhY2UgPSBwbGFjZS50b1VwcGVyQ2FzZSgpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwbGFjZSA9IHBsYWNlLnRvTG93ZXJDYXNlKClcbiAgICAgIH1cbiAgICAgIGVudi5sb2FkQ291bnRyeShicm93c2Vyc2xpc3QudXNhZ2UsIHBsYWNlLCBicm93c2Vyc2xpc3QuZGF0YSlcbiAgICAgIHZhciB1c2FnZSA9IGJyb3dzZXJzbGlzdC51c2FnZVtwbGFjZV1cbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyh1c2FnZSkucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZlcnNpb24pIHtcbiAgICAgICAgdmFyIHBlcmNlbnRhZ2UgPSB1c2FnZVt2ZXJzaW9uXVxuICAgICAgICBpZiAocGVyY2VudGFnZSA9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuc2lnbiA9PT0gJz4nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPiBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLnNpZ24gPT09ICc8Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlIDwgcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPD0nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPD0gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocGVyY2VudGFnZSA+PSBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIGNvdmVyOiB7XG4gICAgbWF0Y2hlczogWydjb3ZlcmFnZSddLFxuICAgIHJlZ2V4cDogL15jb3ZlclxccysoXFxkK3xcXGQrXFwuXFxkK3xcXC5cXGQrKSUkL2ksXG4gICAgc2VsZWN0OiBjb3ZlclF1ZXJ5XG4gIH0sXG4gIGNvdmVyX2luOiB7XG4gICAgbWF0Y2hlczogWydjb3ZlcmFnZScsICdwbGFjZSddLFxuICAgIHJlZ2V4cDogL15jb3ZlclxccysoXFxkK3xcXGQrXFwuXFxkK3xcXC5cXGQrKSVcXHMraW5cXHMrKG15XFxzK3N0YXRzfChhbHQtKT9cXHdcXHcpJC9pLFxuICAgIHNlbGVjdDogY292ZXJRdWVyeVxuICB9LFxuICBzdXBwb3J0czoge1xuICAgIG1hdGNoZXM6IFsnZmVhdHVyZSddLFxuICAgIHJlZ2V4cDogL15zdXBwb3J0c1xccysoW1xcdy1dKykkLyxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICBlbnYubG9hZEZlYXR1cmUoYnJvd3NlcnNsaXN0LmNhY2hlLCBub2RlLmZlYXR1cmUpXG4gICAgICB2YXIgZmVhdHVyZXMgPSBicm93c2Vyc2xpc3QuY2FjaGVbbm9kZS5mZWF0dXJlXVxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGZlYXR1cmVzKS5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgdmVyc2lvbikge1xuICAgICAgICB2YXIgZmxhZ3MgPSBmZWF0dXJlc1t2ZXJzaW9uXVxuICAgICAgICBpZiAoZmxhZ3MuaW5kZXhPZigneScpID49IDAgfHwgZmxhZ3MuaW5kZXhPZignYScpID49IDApIHtcbiAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgIH0sIFtdKVxuICAgIH1cbiAgfSxcbiAgZWxlY3Ryb25fcmFuZ2U6IHtcbiAgICBtYXRjaGVzOiBbJ2Zyb20nLCAndG8nXSxcbiAgICByZWdleHA6IC9eZWxlY3Ryb25cXHMrKFtcXGQuXSspXFxzKi1cXHMqKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBmcm9tVG9Vc2UgPSBub3JtYWxpemVFbGVjdHJvbihub2RlLmZyb20pXG4gICAgICB2YXIgdG9Ub1VzZSA9IG5vcm1hbGl6ZUVsZWN0cm9uKG5vZGUudG8pXG4gICAgICB2YXIgZnJvbSA9IHBhcnNlRmxvYXQobm9kZS5mcm9tKVxuICAgICAgdmFyIHRvID0gcGFyc2VGbG9hdChub2RlLnRvKVxuICAgICAgaWYgKCFlMmNbZnJvbVRvVXNlXSkge1xuICAgICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoJ1Vua25vd24gdmVyc2lvbiAnICsgZnJvbSArICcgb2YgZWxlY3Ryb24nKVxuICAgICAgfVxuICAgICAgaWYgKCFlMmNbdG9Ub1VzZV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKCdVbmtub3duIHZlcnNpb24gJyArIHRvICsgJyBvZiBlbGVjdHJvbicpXG4gICAgICB9XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoZTJjKVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgdmFyIHBhcnNlZCA9IHBhcnNlRmxvYXQoaSlcbiAgICAgICAgICByZXR1cm4gcGFyc2VkID49IGZyb20gJiYgcGFyc2VkIDw9IHRvXG4gICAgICAgIH0pXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICByZXR1cm4gJ2Nocm9tZSAnICsgZTJjW2ldXG4gICAgICAgIH0pXG4gICAgfVxuICB9LFxuICBub2RlX3JhbmdlOiB7XG4gICAgbWF0Y2hlczogWydmcm9tJywgJ3RvJ10sXG4gICAgcmVnZXhwOiAvXm5vZGVcXHMrKFtcXGQuXSspXFxzKi1cXHMqKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHJldHVybiBicm93c2Vyc2xpc3Qubm9kZVZlcnNpb25zXG4gICAgICAgIC5maWx0ZXIoc2VtdmVyRmlsdGVyTG9vc2UoJz49Jywgbm9kZS5mcm9tKSlcbiAgICAgICAgLmZpbHRlcihzZW12ZXJGaWx0ZXJMb29zZSgnPD0nLCBub2RlLnRvKSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAodikge1xuICAgICAgICAgIHJldHVybiAnbm9kZSAnICsgdlxuICAgICAgICB9KVxuICAgIH1cbiAgfSxcbiAgYnJvd3Nlcl9yYW5nZToge1xuICAgIG1hdGNoZXM6IFsnYnJvd3NlcicsICdmcm9tJywgJ3RvJ10sXG4gICAgcmVnZXhwOiAvXihcXHcrKVxccysoW1xcZC5dKylcXHMqLVxccyooW1xcZC5dKykkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIGRhdGEgPSBjaGVja05hbWUobm9kZS5icm93c2VyLCBjb250ZXh0KVxuICAgICAgdmFyIGZyb20gPSBwYXJzZUZsb2F0KG5vcm1hbGl6ZVZlcnNpb24oZGF0YSwgbm9kZS5mcm9tKSB8fCBub2RlLmZyb20pXG4gICAgICB2YXIgdG8gPSBwYXJzZUZsb2F0KG5vcm1hbGl6ZVZlcnNpb24oZGF0YSwgbm9kZS50bykgfHwgbm9kZS50bylcbiAgICAgIGZ1bmN0aW9uIGZpbHRlcih2KSB7XG4gICAgICAgIHZhciBwYXJzZWQgPSBwYXJzZUZsb2F0KHYpXG4gICAgICAgIHJldHVybiBwYXJzZWQgPj0gZnJvbSAmJiBwYXJzZWQgPD0gdG9cbiAgICAgIH1cbiAgICAgIHJldHVybiBkYXRhLnJlbGVhc2VkLmZpbHRlcihmaWx0ZXIpLm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpXG4gICAgfVxuICB9LFxuICBlbGVjdHJvbl9yYXk6IHtcbiAgICBtYXRjaGVzOiBbJ3NpZ24nLCAndmVyc2lvbiddLFxuICAgIHJlZ2V4cDogL15lbGVjdHJvblxccyooPj0/fDw9PylcXHMqKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciB2ZXJzaW9uVG9Vc2UgPSBub3JtYWxpemVFbGVjdHJvbihub2RlLnZlcnNpb24pXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoZTJjKVxuICAgICAgICAuZmlsdGVyKGdlbmVyYXRlRmlsdGVyKG5vZGUuc2lnbiwgdmVyc2lvblRvVXNlKSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoaSkge1xuICAgICAgICAgIHJldHVybiAnY2hyb21lICcgKyBlMmNbaV1cbiAgICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIG5vZGVfcmF5OiB7XG4gICAgbWF0Y2hlczogWydzaWduJywgJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9ebm9kZVxccyooPj0/fDw9PylcXHMqKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHJldHVybiBicm93c2Vyc2xpc3Qubm9kZVZlcnNpb25zXG4gICAgICAgIC5maWx0ZXIoZ2VuZXJhdGVTZW12ZXJGaWx0ZXIobm9kZS5zaWduLCBub2RlLnZlcnNpb24pKVxuICAgICAgICAubWFwKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgcmV0dXJuICdub2RlICcgKyB2XG4gICAgICAgIH0pXG4gICAgfVxuICB9LFxuICBicm93c2VyX3JheToge1xuICAgIG1hdGNoZXM6IFsnYnJvd3NlcicsICdzaWduJywgJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9eKFxcdyspXFxzKig+PT98PD0/KVxccyooW1xcZC5dKykkLyxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgdmVyc2lvbiA9IG5vZGUudmVyc2lvblxuICAgICAgdmFyIGRhdGEgPSBjaGVja05hbWUobm9kZS5icm93c2VyLCBjb250ZXh0KVxuICAgICAgdmFyIGFsaWFzID0gYnJvd3NlcnNsaXN0LnZlcnNpb25BbGlhc2VzW2RhdGEubmFtZV1bdmVyc2lvbl1cbiAgICAgIGlmIChhbGlhcykgdmVyc2lvbiA9IGFsaWFzXG4gICAgICByZXR1cm4gZGF0YS5yZWxlYXNlZFxuICAgICAgICAuZmlsdGVyKGdlbmVyYXRlRmlsdGVyKG5vZGUuc2lnbiwgdmVyc2lvbikpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YS5uYW1lICsgJyAnICsgdlxuICAgICAgICB9KVxuICAgIH1cbiAgfSxcbiAgZmlyZWZveF9lc3I6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eKGZpcmVmb3h8ZmZ8ZngpXFxzK2VzciQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBbJ2ZpcmVmb3ggMTAyJ11cbiAgICB9XG4gIH0sXG4gIG9wZXJhX21pbmlfYWxsOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvKG9wZXJhbWluaXxvcF9taW5pKVxccythbGwvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBbJ29wX21pbmkgYWxsJ11cbiAgICB9XG4gIH0sXG4gIGVsZWN0cm9uX3ZlcnNpb246IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9eZWxlY3Ryb25cXHMrKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciB2ZXJzaW9uVG9Vc2UgPSBub3JtYWxpemVFbGVjdHJvbihub2RlLnZlcnNpb24pXG4gICAgICB2YXIgY2hyb21lID0gZTJjW3ZlcnNpb25Ub1VzZV1cbiAgICAgIGlmICghY2hyb21lKSB7XG4gICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICAgICAnVW5rbm93biB2ZXJzaW9uICcgKyBub2RlLnZlcnNpb24gKyAnIG9mIGVsZWN0cm9uJ1xuICAgICAgICApXG4gICAgICB9XG4gICAgICByZXR1cm4gWydjaHJvbWUgJyArIGNocm9tZV1cbiAgICB9XG4gIH0sXG4gIG5vZGVfbWFqb3JfdmVyc2lvbjoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbiddLFxuICAgIHJlZ2V4cDogL15ub2RlXFxzKyhcXGQrKSQvaSxcbiAgICBzZWxlY3Q6IG5vZGVRdWVyeVxuICB9LFxuICBub2RlX21pbm9yX3ZlcnNpb246IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9ebm9kZVxccysoXFxkK1xcLlxcZCspJC9pLFxuICAgIHNlbGVjdDogbm9kZVF1ZXJ5XG4gIH0sXG4gIG5vZGVfcGF0Y2hfdmVyc2lvbjoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbiddLFxuICAgIHJlZ2V4cDogL15ub2RlXFxzKyhcXGQrXFwuXFxkK1xcLlxcZCspJC9pLFxuICAgIHNlbGVjdDogbm9kZVF1ZXJ5XG4gIH0sXG4gIGN1cnJlbnRfbm9kZToge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogL15jdXJyZW50XFxzK25vZGUkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgcmV0dXJuIFtlbnYuY3VycmVudE5vZGUocmVzb2x2ZSwgY29udGV4dCldXG4gICAgfVxuICB9LFxuICBtYWludGFpbmVkX25vZGU6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9ebWFpbnRhaW5lZFxccytub2RlXFxzK3ZlcnNpb25zJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpXG4gICAgICB2YXIgcXVlcmllcyA9IE9iamVjdC5rZXlzKGpzRU9MKVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgbm93IDwgRGF0ZS5wYXJzZShqc0VPTFtrZXldLmVuZCkgJiZcbiAgICAgICAgICAgIG5vdyA+IERhdGUucGFyc2UoanNFT0xba2V5XS5zdGFydCkgJiZcbiAgICAgICAgICAgIGlzRW9sUmVsZWFzZWQoa2V5KVxuICAgICAgICAgIClcbiAgICAgICAgfSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgcmV0dXJuICdub2RlICcgKyBrZXkuc2xpY2UoMSlcbiAgICAgICAgfSlcbiAgICAgIHJldHVybiByZXNvbHZlKHF1ZXJpZXMsIGNvbnRleHQpXG4gICAgfVxuICB9LFxuICBwaGFudG9tanNfMV85OiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXnBoYW50b21qc1xccysxLjkkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gWydzYWZhcmkgNSddXG4gICAgfVxuICB9LFxuICBwaGFudG9tanNfMl8xOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXnBoYW50b21qc1xccysyLjEkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gWydzYWZhcmkgNiddXG4gICAgfVxuICB9LFxuICBicm93c2VyX3ZlcnNpb246IHtcbiAgICBtYXRjaGVzOiBbJ2Jyb3dzZXInLCAndmVyc2lvbiddLFxuICAgIHJlZ2V4cDogL14oXFx3KylcXHMrKHRwfFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciB2ZXJzaW9uID0gbm9kZS52ZXJzaW9uXG4gICAgICBpZiAoL150cCQvaS50ZXN0KHZlcnNpb24pKSB2ZXJzaW9uID0gJ1RQJ1xuICAgICAgdmFyIGRhdGEgPSBjaGVja05hbWUobm9kZS5icm93c2VyLCBjb250ZXh0KVxuICAgICAgdmFyIGFsaWFzID0gbm9ybWFsaXplVmVyc2lvbihkYXRhLCB2ZXJzaW9uKVxuICAgICAgaWYgKGFsaWFzKSB7XG4gICAgICAgIHZlcnNpb24gPSBhbGlhc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHZlcnNpb24uaW5kZXhPZignLicpID09PSAtMSkge1xuICAgICAgICAgIGFsaWFzID0gdmVyc2lvbiArICcuMCdcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhbGlhcyA9IHZlcnNpb24ucmVwbGFjZSgvXFwuMCQvLCAnJylcbiAgICAgICAgfVxuICAgICAgICBhbGlhcyA9IG5vcm1hbGl6ZVZlcnNpb24oZGF0YSwgYWxpYXMpXG4gICAgICAgIGlmIChhbGlhcykge1xuICAgICAgICAgIHZlcnNpb24gPSBhbGlhc1xuICAgICAgICB9IGVsc2UgaWYgKGNvbnRleHQuaWdub3JlVW5rbm93blZlcnNpb25zKSB7XG4gICAgICAgICAgcmV0dXJuIFtdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgICAgICAgJ1Vua25vd24gdmVyc2lvbiAnICsgdmVyc2lvbiArICcgb2YgJyArIG5vZGUuYnJvd3NlclxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIFtkYXRhLm5hbWUgKyAnICcgKyB2ZXJzaW9uXVxuICAgIH1cbiAgfSxcbiAgYnJvd3NlcnNsaXN0X2NvbmZpZzoge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogL15icm93c2Vyc2xpc3QgY29uZmlnJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgIHJldHVybiBicm93c2Vyc2xpc3QodW5kZWZpbmVkLCBjb250ZXh0KVxuICAgIH1cbiAgfSxcbiAgZXh0ZW5kczoge1xuICAgIG1hdGNoZXM6IFsnY29uZmlnJ10sXG4gICAgcmVnZXhwOiAvXmV4dGVuZHMgKC4rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZShlbnYubG9hZFF1ZXJpZXMoY29udGV4dCwgbm9kZS5jb25maWcpLCBjb250ZXh0KVxuICAgIH1cbiAgfSxcbiAgZGVmYXVsdHM6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eZGVmYXVsdHMkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgcmV0dXJuIHJlc29sdmUoYnJvd3NlcnNsaXN0LmRlZmF1bHRzLCBjb250ZXh0KVxuICAgIH1cbiAgfSxcbiAgZGVhZDoge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogL15kZWFkJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgIHZhciBkZWFkID0gW1xuICAgICAgICAnQmFpZHUgPj0gMCcsXG4gICAgICAgICdpZSA8PSAxMScsXG4gICAgICAgICdpZV9tb2IgPD0gMTEnLFxuICAgICAgICAnYmIgPD0gMTAnLFxuICAgICAgICAnb3BfbW9iIDw9IDEyLjEnLFxuICAgICAgICAnc2Ftc3VuZyA0J1xuICAgICAgXVxuICAgICAgcmV0dXJuIHJlc29sdmUoZGVhZCwgY29udGV4dClcbiAgICB9XG4gIH0sXG4gIHVua25vd246IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eKFxcdyspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIGlmIChieU5hbWUobm9kZS5xdWVyeSwgY29udGV4dCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgICAgICdTcGVjaWZ5IHZlcnNpb25zIGluIEJyb3dzZXJzbGlzdCBxdWVyeSBmb3IgYnJvd3NlciAnICsgbm9kZS5xdWVyeVxuICAgICAgICApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyB1bmtub3duUXVlcnkobm9kZS5xdWVyeSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gR2V0IGFuZCBjb252ZXJ0IENhbiBJIFVzZSBkYXRhXG5cbjsoZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBuYW1lIGluIGFnZW50cykge1xuICAgIHZhciBicm93c2VyID0gYWdlbnRzW25hbWVdXG4gICAgYnJvd3NlcnNsaXN0LmRhdGFbbmFtZV0gPSB7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgdmVyc2lvbnM6IG5vcm1hbGl6ZShhZ2VudHNbbmFtZV0udmVyc2lvbnMpLFxuICAgICAgcmVsZWFzZWQ6IG5vcm1hbGl6ZShhZ2VudHNbbmFtZV0udmVyc2lvbnMuc2xpY2UoMCwgLTMpKSxcbiAgICAgIHJlbGVhc2VEYXRlOiBhZ2VudHNbbmFtZV0ucmVsZWFzZV9kYXRlXG4gICAgfVxuICAgIGZpbGxVc2FnZShicm93c2Vyc2xpc3QudXNhZ2UuZ2xvYmFsLCBuYW1lLCBicm93c2VyLnVzYWdlX2dsb2JhbClcblxuICAgIGJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlc1tuYW1lXSA9IHt9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBicm93c2VyLnZlcnNpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZnVsbCA9IGJyb3dzZXIudmVyc2lvbnNbaV1cbiAgICAgIGlmICghZnVsbCkgY29udGludWVcblxuICAgICAgaWYgKGZ1bGwuaW5kZXhPZignLScpICE9PSAtMSkge1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBmdWxsLnNwbGl0KCctJylcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBpbnRlcnZhbC5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlc1tuYW1lXVtpbnRlcnZhbFtqXV0gPSBmdWxsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBicm93c2Vyc2xpc3QudmVyc2lvbkFsaWFzZXMub3BfbW9iWyc1OSddID0gJzU4J1xuXG4gIGJyb3dzZXJzbGlzdC5ub2RlVmVyc2lvbnMgPSBqc1JlbGVhc2VzLm1hcChmdW5jdGlvbiAocmVsZWFzZSkge1xuICAgIHJldHVybiByZWxlYXNlLnZlcnNpb25cbiAgfSlcbn0pKClcblxubW9kdWxlLmV4cG9ydHMgPSBicm93c2Vyc2xpc3RcbiIsInZhciBBTkRfUkVHRVhQID0gL15cXHMrYW5kXFxzKyguKikvaVxudmFyIE9SX1JFR0VYUCA9IC9eKD86LFxccyp8XFxzK29yXFxzKykoLiopL2lcblxuZnVuY3Rpb24gZmxhdHRlbihhcnJheSkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyYXkpKSByZXR1cm4gW2FycmF5XVxuICByZXR1cm4gYXJyYXkucmVkdWNlKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuIGEuY29uY2F0KGZsYXR0ZW4oYikpXG4gIH0sIFtdKVxufVxuXG5mdW5jdGlvbiBmaW5kKHN0cmluZywgcHJlZGljYXRlKSB7XG4gIGZvciAodmFyIG4gPSAxLCBtYXggPSBzdHJpbmcubGVuZ3RoOyBuIDw9IG1heDsgbisrKSB7XG4gICAgdmFyIHBhcnNlZCA9IHN0cmluZy5zdWJzdHIoLW4sIG4pXG4gICAgaWYgKHByZWRpY2F0ZShwYXJzZWQsIG4sIG1heCkpIHtcbiAgICAgIHJldHVybiBzdHJpbmcuc2xpY2UoMCwgLW4pXG4gICAgfVxuICB9XG4gIHJldHVybiAnJ1xufVxuXG5mdW5jdGlvbiBtYXRjaFF1ZXJ5KGFsbCwgcXVlcnkpIHtcbiAgdmFyIG5vZGUgPSB7IHF1ZXJ5OiBxdWVyeSB9XG4gIGlmIChxdWVyeS5pbmRleE9mKCdub3QgJykgPT09IDApIHtcbiAgICBub2RlLm5vdCA9IHRydWVcbiAgICBxdWVyeSA9IHF1ZXJ5LnNsaWNlKDQpXG4gIH1cblxuICBmb3IgKHZhciBuYW1lIGluIGFsbCkge1xuICAgIHZhciB0eXBlID0gYWxsW25hbWVdXG4gICAgdmFyIG1hdGNoID0gcXVlcnkubWF0Y2godHlwZS5yZWdleHApXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBub2RlLnR5cGUgPSBuYW1lXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGUubWF0Y2hlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBub2RlW3R5cGUubWF0Y2hlc1tpXV0gPSBtYXRjaFtpICsgMV1cbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlXG4gICAgfVxuICB9XG5cbiAgbm9kZS50eXBlID0gJ3Vua25vd24nXG4gIHJldHVybiBub2RlXG59XG5cbmZ1bmN0aW9uIG1hdGNoQmxvY2soYWxsLCBzdHJpbmcsIHFzKSB7XG4gIHZhciBub2RlXG4gIHJldHVybiBmaW5kKHN0cmluZywgZnVuY3Rpb24gKHBhcnNlZCwgbiwgbWF4KSB7XG4gICAgaWYgKEFORF9SRUdFWFAudGVzdChwYXJzZWQpKSB7XG4gICAgICBub2RlID0gbWF0Y2hRdWVyeShhbGwsIHBhcnNlZC5tYXRjaChBTkRfUkVHRVhQKVsxXSlcbiAgICAgIG5vZGUuY29tcG9zZSA9ICdhbmQnXG4gICAgICBxcy51bnNoaWZ0KG5vZGUpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0gZWxzZSBpZiAoT1JfUkVHRVhQLnRlc3QocGFyc2VkKSkge1xuICAgICAgbm9kZSA9IG1hdGNoUXVlcnkoYWxsLCBwYXJzZWQubWF0Y2goT1JfUkVHRVhQKVsxXSlcbiAgICAgIG5vZGUuY29tcG9zZSA9ICdvcidcbiAgICAgIHFzLnVuc2hpZnQobm9kZSlcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSBlbHNlIGlmIChuID09PSBtYXgpIHtcbiAgICAgIG5vZGUgPSBtYXRjaFF1ZXJ5KGFsbCwgcGFyc2VkLnRyaW0oKSlcbiAgICAgIG5vZGUuY29tcG9zZSA9ICdvcidcbiAgICAgIHFzLnVuc2hpZnQobm9kZSlcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHJldHVybiBmYWxzZVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlKGFsbCwgcXVlcmllcykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkocXVlcmllcykpIHF1ZXJpZXMgPSBbcXVlcmllc11cbiAgcmV0dXJuIGZsYXR0ZW4oXG4gICAgcXVlcmllcy5tYXAoZnVuY3Rpb24gKGJsb2NrKSB7XG4gICAgICB2YXIgcXMgPSBbXVxuICAgICAgZG8ge1xuICAgICAgICBibG9jayA9IG1hdGNoQmxvY2soYWxsLCBibG9jaywgcXMpXG4gICAgICB9IHdoaWxlIChibG9jaylcbiAgICAgIHJldHVybiBxc1xuICAgIH0pXG4gIClcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEdldEludHJpbnNpYyA9IHJlcXVpcmUoJ2dldC1pbnRyaW5zaWMnKTtcblxudmFyIGNhbGxCaW5kID0gcmVxdWlyZSgnLi8nKTtcblxudmFyICRpbmRleE9mID0gY2FsbEJpbmQoR2V0SW50cmluc2ljKCdTdHJpbmcucHJvdG90eXBlLmluZGV4T2YnKSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY2FsbEJvdW5kSW50cmluc2ljKG5hbWUsIGFsbG93TWlzc2luZykge1xuXHR2YXIgaW50cmluc2ljID0gR2V0SW50cmluc2ljKG5hbWUsICEhYWxsb3dNaXNzaW5nKTtcblx0aWYgKHR5cGVvZiBpbnRyaW5zaWMgPT09ICdmdW5jdGlvbicgJiYgJGluZGV4T2YobmFtZSwgJy5wcm90b3R5cGUuJykgPiAtMSkge1xuXHRcdHJldHVybiBjYWxsQmluZChpbnRyaW5zaWMpO1xuXHR9XG5cdHJldHVybiBpbnRyaW5zaWM7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJ2Z1bmN0aW9uLWJpbmQnKTtcbnZhciBHZXRJbnRyaW5zaWMgPSByZXF1aXJlKCdnZXQtaW50cmluc2ljJyk7XG5cbnZhciAkYXBwbHkgPSBHZXRJbnRyaW5zaWMoJyVGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHklJyk7XG52YXIgJGNhbGwgPSBHZXRJbnRyaW5zaWMoJyVGdW5jdGlvbi5wcm90b3R5cGUuY2FsbCUnKTtcbnZhciAkcmVmbGVjdEFwcGx5ID0gR2V0SW50cmluc2ljKCclUmVmbGVjdC5hcHBseSUnLCB0cnVlKSB8fCBiaW5kLmNhbGwoJGNhbGwsICRhcHBseSk7XG5cbnZhciAkZ09QRCA9IEdldEludHJpbnNpYygnJU9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IlJywgdHJ1ZSk7XG52YXIgJGRlZmluZVByb3BlcnR5ID0gR2V0SW50cmluc2ljKCclT2JqZWN0LmRlZmluZVByb3BlcnR5JScsIHRydWUpO1xudmFyICRtYXggPSBHZXRJbnRyaW5zaWMoJyVNYXRoLm1heCUnKTtcblxuaWYgKCRkZWZpbmVQcm9wZXJ0eSkge1xuXHR0cnkge1xuXHRcdCRkZWZpbmVQcm9wZXJ0eSh7fSwgJ2EnLCB7IHZhbHVlOiAxIH0pO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0Ly8gSUUgOCBoYXMgYSBicm9rZW4gZGVmaW5lUHJvcGVydHlcblx0XHQkZGVmaW5lUHJvcGVydHkgPSBudWxsO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY2FsbEJpbmQob3JpZ2luYWxGdW5jdGlvbikge1xuXHR2YXIgZnVuYyA9ICRyZWZsZWN0QXBwbHkoYmluZCwgJGNhbGwsIGFyZ3VtZW50cyk7XG5cdGlmICgkZ09QRCAmJiAkZGVmaW5lUHJvcGVydHkpIHtcblx0XHR2YXIgZGVzYyA9ICRnT1BEKGZ1bmMsICdsZW5ndGgnKTtcblx0XHRpZiAoZGVzYy5jb25maWd1cmFibGUpIHtcblx0XHRcdC8vIG9yaWdpbmFsIGxlbmd0aCwgcGx1cyB0aGUgcmVjZWl2ZXIsIG1pbnVzIGFueSBhZGRpdGlvbmFsIGFyZ3VtZW50cyAoYWZ0ZXIgdGhlIHJlY2VpdmVyKVxuXHRcdFx0JGRlZmluZVByb3BlcnR5KFxuXHRcdFx0XHRmdW5jLFxuXHRcdFx0XHQnbGVuZ3RoJyxcblx0XHRcdFx0eyB2YWx1ZTogMSArICRtYXgoMCwgb3JpZ2luYWxGdW5jdGlvbi5sZW5ndGggLSAoYXJndW1lbnRzLmxlbmd0aCAtIDEpKSB9XG5cdFx0XHQpO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gZnVuYztcbn07XG5cbnZhciBhcHBseUJpbmQgPSBmdW5jdGlvbiBhcHBseUJpbmQoKSB7XG5cdHJldHVybiAkcmVmbGVjdEFwcGx5KGJpbmQsICRhcHBseSwgYXJndW1lbnRzKTtcbn07XG5cbmlmICgkZGVmaW5lUHJvcGVydHkpIHtcblx0JGRlZmluZVByb3BlcnR5KG1vZHVsZS5leHBvcnRzLCAnYXBwbHknLCB7IHZhbHVlOiBhcHBseUJpbmQgfSk7XG59IGVsc2Uge1xuXHRtb2R1bGUuZXhwb3J0cy5hcHBseSA9IGFwcGx5QmluZDtcbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtBOntBOntKOjAuMDEzMTIxNyxEOjAuMDA2MjExNTIsRTowLjA1ODEyNDYsRjowLjA3NzQ5OTUsQTowLjAwOTY4NzQzLEI6MC41NzE1NTksXCI5QlwiOjAuMDA5Mjk4fSxCOlwibXNcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIjlCXCIsXCJKXCIsXCJEXCIsXCJFXCIsXCJGXCIsXCJBXCIsXCJCXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJJRVwiLEY6e1wiOUJcIjo5NjIzMjMyMDAsSjo5OTg4NzA0MDAsRDoxMTYxMTI5NjAwLEU6MTIzNzQyMDgwMCxGOjEzMDAwNjA4MDAsQToxMzQ2NzE2ODAwLEI6MTM4MTk2ODAwMH19LEI6e0E6e0M6MC4wMDM3NzMsSzowLjAwNDI2NyxMOjAuMDA0MjY4LEc6MC4wMDM3NzMsTTowLjAwMzcwMixOOjAuMDAzNzczLE86MC4wMTUwOTIsUDowLFE6MC4wMDQyOTgsUjowLjAwOTQ0LFM6MC4wMDQwNDMsVDowLjAwMzc3MyxVOjAuMDAzNzczLFY6MC4wMDM5NzQsVzowLjAwMzkwMSxYOjAuMDA0MzE4LFk6MC4wMDM3NzMsWjowLjAwNDExOCxhOjAuMDAzOTM5LGI6MC4wMDc1NDYsZTowLjAwNDExOCxmOjAuMDAzOTM5LGc6MC4wMDM4MDEsaDowLjAwMzkwMSxpOjAuMDAzODU1LGo6MC4wMDM5MjksazowLjAwMzkwMSxsOjAuMDAzNzczLG06MC4wMDc1NDYsbjowLjAwMzc3MyxvOjAuMDExMzE5LHA6MC4wMTEzMTkscTowLjAxODg2NSxyOjAuMDMzOTU3LGM6MS4xMzk0NSxIOjIuODUyMzl9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiQ1wiLFwiS1wiLFwiTFwiLFwiR1wiLFwiTVwiLFwiTlwiLFwiT1wiLFwiUFwiLFwiUVwiLFwiUlwiLFwiU1wiLFwiVFwiLFwiVVwiLFwiVlwiLFwiV1wiLFwiWFwiLFwiWVwiLFwiWlwiLFwiYVwiLFwiYlwiLFwiZVwiLFwiZlwiLFwiZ1wiLFwiaFwiLFwiaVwiLFwialwiLFwia1wiLFwibFwiLFwibVwiLFwiblwiLFwib1wiLFwicFwiLFwicVwiLFwiclwiLFwiY1wiLFwiSFwiLFwiXCIsXCJcIixcIlwiXSxFOlwiRWRnZVwiLEY6e0M6MTQzODEyODAwMCxLOjE0NDcyODY0MDAsTDoxNDcwMDk2MDAwLEc6MTQ5MTg2ODgwMCxNOjE1MDgxOTg0MDAsTjoxNTI1MDQ2NDAwLE86MTU0MjA2NzIwMCxQOjE1NzkwNDY0MDAsUToxNTgxMDMzNjAwLFI6MTU4NjczNjAwMCxTOjE1OTAwMTkyMDAsVDoxNTk0ODU3NjAwLFU6MTU5ODQ4NjQwMCxWOjE2MDIyMDE2MDAsVzoxNjA1ODMwNDAwLFg6MTYxMTM2MDAwMCxZOjE2MTQ4MTYwMDAsWjoxNjE4MzU4NDAwLGE6MTYyMjA3MzYwMCxiOjE2MjY5MTIwMDAsZToxNjMwNjI3MjAwLGY6MTYzMjQ0MTYwMCxnOjE2MzQ3NzQ0MDAsaDoxNjM3NTM5MjAwLGk6MTY0MTQyNzIwMCxqOjE2NDM5MzI4MDAsazoxNjQ2MjY1NjAwLGw6MTY0OTYzNTIwMCxtOjE2NTExOTA0MDAsbjoxNjUzOTU1MjAwLG86MTY1NTk0MjQwMCxwOjE2NTk2NTc2MDAscToxNjYxOTkwNDAwLHI6MTY2NDc1NTIwMCxjOjE2NjY5MTUyMDAsSDoxNjcwMTk4NDAwfSxEOntDOlwibXNcIixLOlwibXNcIixMOlwibXNcIixHOlwibXNcIixNOlwibXNcIixOOlwibXNcIixPOlwibXNcIn19LEM6e0E6e1wiMFwiOjAuMDA0MzE3LFwiMVwiOjAuMDA0MzkzLFwiMlwiOjAuMDA0NDE4LFwiM1wiOjAuMDA4ODM0LFwiNFwiOjAuMDA4MzIyLFwiNVwiOjAuMDA4OTI4LFwiNlwiOjAuMDA0NDcxLFwiN1wiOjAuMDA5Mjg0LFwiOFwiOjAuMDA0NzA3LFwiOVwiOjAuMDA5MDc2LEFDOjAuMDA0MTE4LHJCOjAuMDA0MjcxLEk6MC4wMTE3MDMsczowLjAwNDg3OSxKOjAuMDIwMTM2LEQ6MC4wMDU3MjUsRTowLjAwNDUyNSxGOjAuMDA1MzMsQTowLjAwNDI4MyxCOjAuMDA3NTQ2LEM6MC4wMDQ0NzEsSzowLjAwNDQ4NixMOjAuMDA0NTMsRzowLjAwODMyMixNOjAuMDA0NDE3LE46MC4wMDQ0MjUsTzowLjAwNDE2MSx0OjAuMDA0NDQzLHU6MC4wMDQyODMsdjowLjAwODMyMix3OjAuMDEzNjk4LHg6MC4wMDQxNjEseTowLjAwODc4Nix6OjAuMDA0MTE4LEFCOjAuMDA3NTQ2LEJCOjAuMDA0NzgzLENCOjAuMDAzOTI5LERCOjAuMDA0NzgzLEVCOjAuMDA0ODcsRkI6MC4wMDUwMjksR0I6MC4wMDQ3LEhCOjAuMDk0MzI1LElCOjAuMDA3NTQ2LEpCOjAuMDAzODY3LEtCOjAuMDA0NTI1LExCOjAuMDA0MjkzLE1COjAuMDAzNzczLE5COjAuMDA0NTM4LE9COjAuMDA4MjgyLFBCOjAuMDExNjAxLFFCOjAuMDUyODIyLFJCOjAuMDExNjAxLFNCOjAuMDAzOTI5LFRCOjAuMDAzOTc0LFVCOjAuMDA3NTQ2LFZCOjAuMDExNjAxLFdCOjAuMDAzOTM5LHNCOjAuMDAzNzczLFhCOjAuMDAzOTI5LHRCOjAuMDA0MzU2LFlCOjAuMDA0NDI1LFpCOjAuMDA4MzIyLGFCOjAuMDA0MTUsYkI6MC4wMDQyNjcsY0I6MC4wMDM4MDEsZEI6MC4wMDQyNjcsZUI6MC4wMDM3NzMsZkI6MC4wMDQxNSxnQjowLjAwNDI5MyxoQjowLjAwNDQyNSxkOjAuMDAzNzczLGlCOjAuMDA0MTUsakI6MC4wMDQxNSxrQjowLjAwNDMxOCxsQjowLjAwNDM1NixtQjowLjAwMzk3NCxuQjowLjAzMzk1NyxQOjAuMDAzNzczLFE6MC4wMDM3NzMsUjowLjAwMzc3Myx1QjowLjAwMzc3MyxTOjAuMDAzNzczLFQ6MC4wMDM5MjksVTowLjAwNDI2OCxWOjAuMDAzODAxLFc6MC4wMTEzMTksWDowLjAwNzU0NixZOjAuMDAzNzczLFo6MC4wMDM3NzMsYTowLjAxODg2NSxiOjAuMDAzODAxLGU6MC4wMDM4NTUsZjowLjAxODg2NSxnOjAuMDAzNzczLGg6MC4wMDM3NzMsaTowLjAwMzkwMSxqOjAuMDAzOTAxLGs6MC4wMDc1NDYsbDowLjAwNzU0NixtOjAuMDA3NTQ2LG46MC4wODMwMDYsbzowLjAzMDE4NCxwOjAuMDE1MDkyLHE6MC4wMzAxODQscjowLjA0OTA0OSxjOjEuMTIwNTgsSDowLjkzOTQ3Nyx2QjowLjAxMTMxOSx3QjowLEJDOjAuMDA4Nzg2LENDOjAuMDA0ODd9LEI6XCJtb3pcIixDOltcIkFDXCIsXCJyQlwiLFwiQkNcIixcIkNDXCIsXCJJXCIsXCJzXCIsXCJKXCIsXCJEXCIsXCJFXCIsXCJGXCIsXCJBXCIsXCJCXCIsXCJDXCIsXCJLXCIsXCJMXCIsXCJHXCIsXCJNXCIsXCJOXCIsXCJPXCIsXCJ0XCIsXCJ1XCIsXCJ2XCIsXCJ3XCIsXCJ4XCIsXCJ5XCIsXCJ6XCIsXCIwXCIsXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCJBQlwiLFwiQkJcIixcIkNCXCIsXCJEQlwiLFwiRUJcIixcIkZCXCIsXCJHQlwiLFwiSEJcIixcIklCXCIsXCJKQlwiLFwiS0JcIixcIkxCXCIsXCJNQlwiLFwiTkJcIixcIk9CXCIsXCJQQlwiLFwiUUJcIixcIlJCXCIsXCJTQlwiLFwiVEJcIixcIlVCXCIsXCJWQlwiLFwiV0JcIixcInNCXCIsXCJYQlwiLFwidEJcIixcIllCXCIsXCJaQlwiLFwiYUJcIixcImJCXCIsXCJjQlwiLFwiZEJcIixcImVCXCIsXCJmQlwiLFwiZ0JcIixcImhCXCIsXCJkXCIsXCJpQlwiLFwiakJcIixcImtCXCIsXCJsQlwiLFwibUJcIixcIm5CXCIsXCJQXCIsXCJRXCIsXCJSXCIsXCJ1QlwiLFwiU1wiLFwiVFwiLFwiVVwiLFwiVlwiLFwiV1wiLFwiWFwiLFwiWVwiLFwiWlwiLFwiYVwiLFwiYlwiLFwiZVwiLFwiZlwiLFwiZ1wiLFwiaFwiLFwiaVwiLFwialwiLFwia1wiLFwibFwiLFwibVwiLFwiblwiLFwib1wiLFwicFwiLFwicVwiLFwiclwiLFwiY1wiLFwiSFwiLFwidkJcIixcIndCXCIsXCJcIl0sRTpcIkZpcmVmb3hcIixGOntcIjBcIjoxMzg2NjMzNjAwLFwiMVwiOjEzOTE0NzIwMDAsXCIyXCI6MTM5NTEwMDgwMCxcIjNcIjoxMzk4NzI5NjAwLFwiNFwiOjE0MDIzNTg0MDAsXCI1XCI6MTQwNTk4NzIwMCxcIjZcIjoxNDA5NjE2MDAwLFwiN1wiOjE0MTMyNDQ4MDAsXCI4XCI6MTQxNzM5MjAwMCxcIjlcIjoxNDIxMTA3MjAwLEFDOjExNjE2NDgwMDAsckI6MTIxMzY2MDgwMCxCQzoxMjQ2MzIwMDAwLENDOjEyNjQwMzIwMDAsSToxMzAwNzUyMDAwLHM6MTMwODYxNDQwMCxKOjEzMTM0NTI4MDAsRDoxMzE3MDgxNjAwLEU6MTMxNzA4MTYwMCxGOjEzMjA3MTA0MDAsQToxMzI0MzM5MjAwLEI6MTMyNzk2ODAwMCxDOjEzMzE1OTY4MDAsSzoxMzM1MjI1NjAwLEw6MTMzODg1NDQwMCxHOjEzNDI0ODMyMDAsTToxMzQ2MTEyMDAwLE46MTM0OTc0MDgwMCxPOjEzNTM2Mjg4MDAsdDoxMzU3NjAzMjAwLHU6MTM2MTIzMjAwMCx2OjEzNjQ4NjA4MDAsdzoxMzY4NDg5NjAwLHg6MTM3MjExODQwMCx5OjEzNzU3NDcyMDAsejoxMzc5Mzc2MDAwLEFCOjE0MjQ3MzYwMDAsQkI6MTQyODI3ODQwMCxDQjoxNDMxNDc1MjAwLERCOjE0MzU4ODE2MDAsRUI6MTQzOTI1MTIwMCxGQjoxNDQyODgwMDAwLEdCOjE0NDY1MDg4MDAsSEI6MTQ1MDEzNzYwMCxJQjoxNDUzODUyODAwLEpCOjE0NTczOTUyMDAsS0I6MTQ2MTYyODgwMCxMQjoxNDY1MjU3NjAwLE1COjE0NzAwOTYwMDAsTkI6MTQ3NDMyOTYwMCxPQjoxNDc5MTY4MDAwLFBCOjE0ODUyMTYwMDAsUUI6MTQ4ODg0NDgwMCxSQjoxNDkyNTYwMDAwLFNCOjE0OTczMTIwMDAsVEI6MTUwMjE1MDQwMCxVQjoxNTA2NTU2ODAwLFZCOjE1MTA2MTc2MDAsV0I6MTUxNjY2NTYwMCxzQjoxNTIwOTg1NjAwLFhCOjE1MjU4MjQwMDAsdEI6MTUyOTk3MTIwMCxZQjoxNTM2MTA1NjAwLFpCOjE1NDAyNTI4MDAsYUI6MTU0NDQ4NjQwMCxiQjoxNTQ4NzIwMDAwLGNCOjE1NTI5NTM2MDAsZEI6MTU1ODM5NjgwMCxlQjoxNTYyNjMwNDAwLGZCOjE1Njc0Njg4MDAsZ0I6MTU3MTc4ODgwMCxoQjoxNTc1MzMxMjAwLGQ6MTU3ODM1NTIwMCxpQjoxNTgxMzc5MjAwLGpCOjE1ODM3OTg0MDAsa0I6MTU4NjMwNDAwMCxsQjoxNTg4NjM2ODAwLG1COjE1OTEwNTYwMDAsbkI6MTU5MzQ3NTIwMCxQOjE1OTU4OTQ0MDAsUToxNTk4MzEzNjAwLFI6MTYwMDczMjgwMCx1QjoxNjAzMTUyMDAwLFM6MTYwNTU3MTIwMCxUOjE2MDc5OTA0MDAsVToxNjExNjE5MjAwLFY6MTYxNDAzODQwMCxXOjE2MTY0NTc2MDAsWDoxNjE4NzkwNDAwLFk6MTYyMjUwNTYwMCxaOjE2MjYxMzQ0MDAsYToxNjI4NTUzNjAwLGI6MTYzMDk3MjgwMCxlOjE2MzMzOTIwMDAsZjoxNjM1ODExMjAwLGc6MTYzODgzNTIwMCxoOjE2NDE4NTkyMDAsaToxNjQ0MzY0ODAwLGo6MTY0NjY5NzYwMCxrOjE2NDkxMTY4MDAsbDoxNjUxNTM2MDAwLG06MTY1Mzk1NTIwMCxuOjE2NTYzNzQ0MDAsbzoxNjU4NzkzNjAwLHA6MTY2MTIxMjgwMCxxOjE2NjM2MzIwMDAscjoxNjY2MDUxMjAwLGM6MTY2ODQ3MDQwMCxIOjE2NzA4ODk2MDAsdkI6bnVsbCx3QjpudWxsfX0sRDp7QTp7XCIwXCI6MC4wMDQxNDEsXCIxXCI6MC4wMDQzMjYsXCIyXCI6MC4wMDQ3LFwiM1wiOjAuMDA0NTM4LFwiNFwiOjAuMDA4MzIyLFwiNVwiOjAuMDA4NTk2LFwiNlwiOjAuMDA0NTY2LFwiN1wiOjAuMDA0MTE4LFwiOFwiOjAuMDA3NTQ2LFwiOVwiOjAuMDAzOTAxLEk6MC4wMDQ3MDYsczowLjAwNDg3OSxKOjAuMDA0ODc5LEQ6MC4wMDU1OTEsRTowLjAwNTU5MSxGOjAuMDA1NTkxLEE6MC4wMDQ1MzQsQjowLjAwNDQ2NCxDOjAuMDEwNDI0LEs6MC4wMDgzLEw6MC4wMDQ3MDYsRzowLjAxNTA4NyxNOjAuMDA0MzkzLE46MC4wMDQzOTMsTzowLjAwODY1Mix0OjAuMDA4MzIyLHU6MC4wMDQzOTMsdjowLjAwNDMxNyx3OjAuMDAzOTAxLHg6MC4wMDg3ODYseTowLjAwMzkzOSx6OjAuMDA0NDYxLEFCOjAuMDA0MzM1LEJCOjAuMDA0NDY0LENCOjAuMDE1MDkyLERCOjAuMDAzODY3LEVCOjAuMDE1MDkyLEZCOjAuMDAzNzczLEdCOjAuMDAzOTc0LEhCOjAuMDA3NTQ2LElCOjAuMDA3OTQ4LEpCOjAuMDAzOTc0LEtCOjAuMDAzODY3LExCOjAuMDA3NTQ2LE1COjAuMDIyNjM4LE5COjAuMDQ5MDQ5LE9COjAuMDAzODY3LFBCOjAuMDAzOTI5LFFCOjAuMDA3NTQ2LFJCOjAuMDExMzE5LFNCOjAuMDAzODY3LFRCOjAuMDA3NTQ2LFVCOjAuMDQ1Mjc2LFZCOjAuMDAzNzczLFdCOjAuMDAzNzczLHNCOjAuMDAzNzczLFhCOjAuMDExMzE5LHRCOjAuMDExMzE5LFlCOjAuMDAzNzczLFpCOjAuMDE1MDkyLGFCOjAuMDAzNzczLGJCOjAuMDExMzE5LGNCOjAuMDMwMTg0LGRCOjAuMDA3NTQ2LGVCOjAuMDA3NTQ2LGZCOjAuMDc5MjMzLGdCOjAuMDI2NDExLGhCOjAuMDExMzE5LGQ6MC4wMzc3MyxpQjowLjAxMTMxOSxqQjowLjA0NTI3NixrQjowLjA0MTUwMyxsQjowLjAyNjQxMSxtQjowLjAxMTMxOSxuQjowLjAzMzk1NyxQOjAuMTIwNzM2LFE6MC4wNDE1MDMsUjowLjA0MTUwMyxTOjAuMDc1NDYsVDowLjA0NTI3NixVOjAuMDk0MzI1LFY6MC4wNzU0NixXOjAuMDc5MjMzLFg6MC4wMTg4NjUsWTowLjAzMzk1NyxaOjAuMDI2NDExLGE6MC4wNTY1OTUsYjowLjA0MTUwMyxlOjAuMDQ5MDQ5LGY6MC4wMzM5NTcsZzowLjAyMjYzOCxoOjAuMDQxNTAzLGk6MC4wNTY1OTUsajowLjA5ODA5OCxrOjAuMDQ5MDQ5LGw6MC4wNzkyMzMsbTowLjA2MDM2OCxuOjAuMDk4MDk4LG86MC4yNzkyMDIscDowLjEyNDUwOSxxOjAuMTkyNDIzLHI6MC4yODY3NDgsYzozLjY0ODQ5LEg6MTYuODM4OSx2QjowLjAzMzk1Nyx3QjowLjAxODg2NSxEQzowLjAxMTMxOX0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIklcIixcInNcIixcIkpcIixcIkRcIixcIkVcIixcIkZcIixcIkFcIixcIkJcIixcIkNcIixcIktcIixcIkxcIixcIkdcIixcIk1cIixcIk5cIixcIk9cIixcInRcIixcInVcIixcInZcIixcIndcIixcInhcIixcInlcIixcInpcIixcIjBcIixcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIkFCXCIsXCJCQlwiLFwiQ0JcIixcIkRCXCIsXCJFQlwiLFwiRkJcIixcIkdCXCIsXCJIQlwiLFwiSUJcIixcIkpCXCIsXCJLQlwiLFwiTEJcIixcIk1CXCIsXCJOQlwiLFwiT0JcIixcIlBCXCIsXCJRQlwiLFwiUkJcIixcIlNCXCIsXCJUQlwiLFwiVUJcIixcIlZCXCIsXCJXQlwiLFwic0JcIixcIlhCXCIsXCJ0QlwiLFwiWUJcIixcIlpCXCIsXCJhQlwiLFwiYkJcIixcImNCXCIsXCJkQlwiLFwiZUJcIixcImZCXCIsXCJnQlwiLFwiaEJcIixcImRcIixcImlCXCIsXCJqQlwiLFwia0JcIixcImxCXCIsXCJtQlwiLFwibkJcIixcIlBcIixcIlFcIixcIlJcIixcIlNcIixcIlRcIixcIlVcIixcIlZcIixcIldcIixcIlhcIixcIllcIixcIlpcIixcImFcIixcImJcIixcImVcIixcImZcIixcImdcIixcImhcIixcImlcIixcImpcIixcImtcIixcImxcIixcIm1cIixcIm5cIixcIm9cIixcInBcIixcInFcIixcInJcIixcImNcIixcIkhcIixcInZCXCIsXCJ3QlwiLFwiRENcIl0sRTpcIkNocm9tZVwiLEY6e1wiMFwiOjEzNjE0MDQ4MDAsXCIxXCI6MTM2NDQyODgwMCxcIjJcIjoxMzY5MDk0NDAwLFwiM1wiOjEzNzQxMDU2MDAsXCI0XCI6MTM3Njk1NjgwMCxcIjVcIjoxMzg0MjE0NDAwLFwiNlwiOjEzODk2NTc2MDAsXCI3XCI6MTM5Mjk0MDgwMCxcIjhcIjoxMzk3MDAxNjAwLFwiOVwiOjE0MDA1NDQwMDAsSToxMjY0Mzc3NjAwLHM6MTI3NDc0NTYwMCxKOjEyODMzODU2MDAsRDoxMjg3NjE5MjAwLEU6MTI5MTI0ODAwMCxGOjEyOTY3Nzc2MDAsQToxMjk5NTQyNDAwLEI6MTMwMzg2MjQwMCxDOjEzMDc0MDQ4MDAsSzoxMzEyMjQzMjAwLEw6MTMxNjEzMTIwMCxHOjEzMTYxMzEyMDAsTToxMzE5NTAwODAwLE46MTMyMzczNDQwMCxPOjEzMjg2NTkyMDAsdDoxMzMyODkyODAwLHU6MTMzNzA0MDAwMCx2OjEzNDA2Njg4MDAsdzoxMzQzNjkyODAwLHg6MTM0ODUzMTIwMCx5OjEzNTIyNDY0MDAsejoxMzU3ODYyNDAwLEFCOjE0MDU0Njg4MDAsQkI6MTQwOTAxMTIwMCxDQjoxNDEyNjQwMDAwLERCOjE0MTYyNjg4MDAsRUI6MTQyMTc5ODQwMCxGQjoxNDI1NTEzNjAwLEdCOjE0Mjk0MDE2MDAsSEI6MTQzMjA4MDAwMCxJQjoxNDM3NTIzMjAwLEpCOjE0NDExNTIwMDAsS0I6MTQ0NDc4MDgwMCxMQjoxNDQ5MDE0NDAwLE1COjE0NTMyNDgwMDAsTkI6MTQ1Njk2MzIwMCxPQjoxNDYwNTkyMDAwLFBCOjE0NjQxMzQ0MDAsUUI6MTQ2OTA1OTIwMCxSQjoxNDcyNjAxNjAwLFNCOjE0NzYyMzA0MDAsVEI6MTQ4MDU1MDQwMCxVQjoxNDg1MzAyNDAwLFZCOjE0ODkwMTc2MDAsV0I6MTQ5MjU2MDAwMCxzQjoxNDk2NzA3MjAwLFhCOjE1MDA5NDA4MDAsdEI6MTUwNDU2OTYwMCxZQjoxNTA4MTk4NDAwLFpCOjE1MTI1MTg0MDAsYUI6MTUxNjc1MjAwMCxiQjoxNTIwMjk0NDAwLGNCOjE1MjM5MjMyMDAsZEI6MTUyNzU1MjAwMCxlQjoxNTMyMzkwNDAwLGZCOjE1MzYwMTkyMDAsZ0I6MTUzOTY0ODAwMCxoQjoxNTQzOTY4MDAwLGQ6MTU0ODcyMDAwMCxpQjoxNTUyMzQ4ODAwLGpCOjE1NTU5Nzc2MDAsa0I6MTU1OTYwNjQwMCxsQjoxNTY0NDQ0ODAwLG1COjE1NjgwNzM2MDAsbkI6MTU3MTcwMjQwMCxQOjE1NzU5MzYwMDAsUToxNTgwODYwODAwLFI6MTU4NjMwNDAwMCxTOjE1ODk4NDY0MDAsVDoxNTk0Njg0ODAwLFU6MTU5ODMxMzYwMCxWOjE2MDE5NDI0MDAsVzoxNjA1NTcxMjAwLFg6MTYxMTAxNDQwMCxZOjE2MTQ1NTY4MDAsWjoxNjE4MjcyMDAwLGE6MTYyMTk4NzIwMCxiOjE2MjY3MzkyMDAsZToxNjMwMzY4MDAwLGY6MTYzMjI2ODgwMCxnOjE2MzQ2MDE2MDAsaDoxNjM3MDIwODAwLGk6MTY0MTM0MDgwMCxqOjE2NDM2NzM2MDAsazoxNjQ2MDkyODAwLGw6MTY0ODUxMjAwMCxtOjE2NTA5MzEyMDAsbjoxNjUzMzUwNDAwLG86MTY1NTc2OTYwMCxwOjE2NTkzOTg0MDAscToxNjYxODE3NjAwLHI6MTY2NDIzNjgwMCxjOjE2NjY2NTYwMDAsSDoxNjY5NjgwMDAwLHZCOm51bGwsd0I6bnVsbCxEQzpudWxsfX0sRTp7QTp7STowLHM6MC4wMDgzMjIsSjowLjAwNDY1NixEOjAuMDA0NDY1LEU6MC4wMDM5NzQsRjowLjAwMzkyOSxBOjAuMDA0NDI1LEI6MC4wMDQzMTgsQzowLjAwMzgwMSxLOjAuMDE4ODY1LEw6MC4wOTQzMjUsRzowLjAyMjYzOCxFQzowLHhCOjAuMDA4NjkyLEZDOjAuMDExMzE5LEdDOjAuMDA0NTYsSEM6MC4wMDQyODMsSUM6MC4wMjI2MzgseUI6MC4wMDc4MDIsb0I6MC4wMDc1NDYscEI6MC4wMzM5NTcsekI6MC4xODg2NSxKQzowLjI1NjU2NCxLQzowLjA0MTUwMyxcIjBCXCI6MC4wMzc3MyxcIjFCXCI6MC4wOTQzMjUsXCIyQlwiOjAuMTkyNDIzLFwiM0JcIjoxLjMxMyxxQjowLjE2MjIzOSxcIjRCXCI6MC42NDE0MSxcIjVCXCI6MC4xNDMzNzQsXCI2QlwiOjAsTEM6MH0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiRUNcIixcInhCXCIsXCJJXCIsXCJzXCIsXCJGQ1wiLFwiSlwiLFwiR0NcIixcIkRcIixcIkhDXCIsXCJFXCIsXCJGXCIsXCJJQ1wiLFwiQVwiLFwieUJcIixcIkJcIixcIm9CXCIsXCJDXCIsXCJwQlwiLFwiS1wiLFwiekJcIixcIkxcIixcIkpDXCIsXCJHXCIsXCJLQ1wiLFwiMEJcIixcIjFCXCIsXCIyQlwiLFwiM0JcIixcInFCXCIsXCI0QlwiLFwiNUJcIixcIjZCXCIsXCJMQ1wiLFwiXCJdLEU6XCJTYWZhcmlcIixGOntFQzoxMjA1Nzk4NDAwLHhCOjEyMjY1MzQ0MDAsSToxMjQ0NDE5MjAwLHM6MTI3NTg2ODgwMCxGQzoxMzExMTIwMDAwLEo6MTM0MzE3NDQwMCxHQzoxMzgyNDAwMDAwLEQ6MTM4MjQwMDAwMCxIQzoxNDEwOTk4NDAwLEU6MTQxMzQxNzYwMCxGOjE0NDM2NTc2MDAsSUM6MTQ1ODUxODQwMCxBOjE0NzQzMjk2MDAseUI6MTQ5MDU3MjgwMCxCOjE1MDU3NzkyMDAsb0I6MTUyMjI4MTYwMCxDOjE1MzcxNDI0MDAscEI6MTU1MzQ3MjAwMCxLOjE1Njg4NTEyMDAsekI6MTU4NTAwODAwMCxMOjE2MDAyMTQ0MDAsSkM6MTYxOTM5NTIwMCxHOjE2MzIwOTYwMDAsS0M6MTYzNTI5MjgwMCxcIjBCXCI6MTYzOTM1MzYwMCxcIjFCXCI6MTY0NzIxNjAwMCxcIjJCXCI6MTY1Mjc0NTYwMCxcIjNCXCI6MTY1ODI3NTIwMCxxQjoxNjYyOTQwODAwLFwiNEJcIjoxNjY2NTY5NjAwLFwiNUJcIjoxNjcwODg5NjAwLFwiNkJcIjpudWxsLExDOm51bGx9fSxGOntBOntcIjBcIjowLjAwNTU5NSxcIjFcIjowLjAwNDM5MyxcIjJcIjowLjAwNzU0NixcIjNcIjowLjAwNDg3OSxcIjRcIjowLjAwNDg3OSxcIjVcIjowLjAwMzc3MyxcIjZcIjowLjAwNTE1MixcIjdcIjowLjAwNTAxNCxcIjhcIjowLjAwOTc1OCxcIjlcIjowLjAwNDg3OSxGOjAuMDA4MixCOjAuMDE2NTgxLEM6MC4wMDQzMTcsRzowLjAwNjg1LE06MC4wMDY4NSxOOjAuMDA2ODUsTzowLjAwNTAxNCx0OjAuMDA2MDE1LHU6MC4wMDQ4NzksdjowLjAwNjU5Nyx3OjAuMDA2NTk3LHg6MC4wMTM0MzQseTowLjAwNjcwMix6OjAuMDA2MDE1LEFCOjAuMDAzNzczLEJCOjAuMDA0MjgzLENCOjAuMDA0MzY3LERCOjAuMDA0NTM0LEVCOjAuMDA3NTQ2LEZCOjAuMDA0MjI3LEdCOjAuMDA0NDE4LEhCOjAuMDA0MTYxLElCOjAuMDA0MjI3LEpCOjAuMDA0NzI1LEtCOjAuMDE1MDkyLExCOjAuMDA4OTQyLE1COjAuMDA0NzA3LE5COjAuMDA0ODI3LE9COjAuMDA0NzA3LFBCOjAuMDA0NzA3LFFCOjAuMDA0MzI2LFJCOjAuMDA4OTIyLFNCOjAuMDE0MzQ5LFRCOjAuMDA0NDI1LFVCOjAuMDA0NzIsVkI6MC4wMDQ0MjUsV0I6MC4wMDQ0MjUsWEI6MC4wMDQ3MixZQjowLjAwNDUzMixaQjowLjAwNDU2NixhQjowLjAyMjgzLGJCOjAuMDA4NjcsY0I6MC4wMDQ2NTYsZEI6MC4wMDQ2NDIsZUI6MC4wMDM5MjksZkI6MC4wMDk0NCxnQjowLjAwNDI5MyxoQjowLjAwMzkyOSxkOjAuMDA0Mjk4LGlCOjAuMDk2NjkyLGpCOjAuMDA0MjAxLGtCOjAuMDA0MTQxLGxCOjAuMDA0MjU3LG1COjAuMDAzOTM5LG5COjAuMDA4MjM2LFA6MC4wMDM4NTUsUTowLjAwMzkzOSxSOjAuMDA4NTE0LHVCOjAuMDAzOTM5LFM6MC4wMDM5MzksVDowLjAwMzcwMixVOjAuMDA3NTQ2LFY6MC4wMDM4NTUsVzowLjAwMzg1NSxYOjAuMDAzOTI5LFk6MC4wMDc4MDIsWjowLjAxMTcwMyxhOjAuMDA3NTQ2LGI6MC4yMDc1MTUsTUM6MC4wMDY4NSxOQzowLE9DOjAuMDA4MzkyLFBDOjAuMDA0NzA2LG9COjAuMDA2MjI5LFwiN0JcIjowLjAwNDg3OSxRQzowLjAwODc4NixwQjowLjAwNDcyfSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIkZcIixcIk1DXCIsXCJOQ1wiLFwiT0NcIixcIlBDXCIsXCJCXCIsXCJvQlwiLFwiN0JcIixcIlFDXCIsXCJDXCIsXCJwQlwiLFwiR1wiLFwiTVwiLFwiTlwiLFwiT1wiLFwidFwiLFwidVwiLFwidlwiLFwid1wiLFwieFwiLFwieVwiLFwielwiLFwiMFwiLFwiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiQUJcIixcIkJCXCIsXCJDQlwiLFwiREJcIixcIkVCXCIsXCJGQlwiLFwiR0JcIixcIkhCXCIsXCJJQlwiLFwiSkJcIixcIktCXCIsXCJMQlwiLFwiTUJcIixcIk5CXCIsXCJPQlwiLFwiUEJcIixcIlFCXCIsXCJSQlwiLFwiU0JcIixcIlRCXCIsXCJVQlwiLFwiVkJcIixcIldCXCIsXCJYQlwiLFwiWUJcIixcIlpCXCIsXCJhQlwiLFwiYkJcIixcImNCXCIsXCJkQlwiLFwiZUJcIixcImZCXCIsXCJnQlwiLFwiaEJcIixcImRcIixcImlCXCIsXCJqQlwiLFwia0JcIixcImxCXCIsXCJtQlwiLFwibkJcIixcIlBcIixcIlFcIixcIlJcIixcInVCXCIsXCJTXCIsXCJUXCIsXCJVXCIsXCJWXCIsXCJXXCIsXCJYXCIsXCJZXCIsXCJaXCIsXCJhXCIsXCJiXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJPcGVyYVwiLEY6e1wiMFwiOjE0MTcxMzI4MDAsXCIxXCI6MTQyMjMxNjgwMCxcIjJcIjoxNDI1OTQ1NjAwLFwiM1wiOjE0MzAxNzkyMDAsXCI0XCI6MTQzMzgwODAwMCxcIjVcIjoxNDM4NjQ2NDAwLFwiNlwiOjE0NDI0NDgwMDAsXCI3XCI6MTQ0NTkwNDAwMCxcIjhcIjoxNDQ5MTAwODAwLFwiOVwiOjE0NTQzNzEyMDAsRjoxMTUwNzYxNjAwLE1DOjEyMjM0MjQwMDAsTkM6MTI1MTc2MzIwMCxPQzoxMjY3NDg4MDAwLFBDOjEyNzc5NDI0MDAsQjoxMjkyNDU3NjAwLG9COjEzMDI1NjY0MDAsXCI3QlwiOjEzMDkyMTkyMDAsUUM6MTMyMzEyOTYwMCxDOjEzMjMxMjk2MDAscEI6MTM1MjA3MzYwMCxHOjEzNzI3MjMyMDAsTToxMzc3NTYxNjAwLE46MTM4MTEwNDAwMCxPOjEzODYyODgwMDAsdDoxMzkwODY3MjAwLHU6MTM5Mzg5MTIwMCx2OjEzOTkzMzQ0MDAsdzoxNDAxNzUzNjAwLHg6MTQwNTk4NzIwMCx5OjE0MDk2MTYwMDAsejoxNDEzMzMxMjAwLEFCOjE0NTczMDg4MDAsQkI6MTQ2MjMyMDAwMCxDQjoxNDY1MzQ0MDAwLERCOjE0NzAwOTYwMDAsRUI6MTQ3NDMyOTYwMCxGQjoxNDc3MjY3MjAwLEdCOjE0ODE1ODcyMDAsSEI6MTQ4NjQyNTYwMCxJQjoxNDkwMDU0NDAwLEpCOjE0OTQzNzQ0MDAsS0I6MTQ5ODAwMzIwMCxMQjoxNTAyMjM2ODAwLE1COjE1MDY0NzA0MDAsTkI6MTUxMDA5OTIwMCxPQjoxNTE1MDI0MDAwLFBCOjE1MTc5NjE2MDAsUUI6MTUyMTY3NjgwMCxSQjoxNTI1OTEwNDAwLFNCOjE1MzAxNDQwMDAsVEI6MTUzNDk4MjQwMCxVQjoxNTM3ODMzNjAwLFZCOjE1NDMzNjMyMDAsV0I6MTU0ODIwMTYwMCxYQjoxNTU0NzY4MDAwLFlCOjE1NjE1OTM2MDAsWkI6MTU2NjI1OTIwMCxhQjoxNTcwNDA2NDAwLGJCOjE1NzM2ODk2MDAsY0I6MTU3ODQ0MTYwMCxkQjoxNTgzOTcxMjAwLGVCOjE1ODc1MTM2MDAsZkI6MTU5Mjk1NjgwMCxnQjoxNTk1ODk0NDAwLGhCOjE2MDAxMjgwMDAsZDoxNjAzMjM4NDAwLGlCOjE2MTM1MjAwMDAsakI6MTYxMjIyNDAwMCxrQjoxNjE2NTQ0MDAwLGxCOjE2MTk1NjgwMDAsbUI6MTYyMzcxNTIwMCxuQjoxNjI3OTQ4ODAwLFA6MTYzMTU3NzYwMCxROjE2MzMzOTIwMDAsUjoxNjM1OTg0MDAwLHVCOjE2Mzg0MDMyMDAsUzoxNjQyNTUwNDAwLFQ6MTY0NDk2OTYwMCxVOjE2NDc5OTM2MDAsVjoxNjUwNDEyODAwLFc6MTY1Mjc0NTYwMCxYOjE2NTQ2NDY0MDAsWToxNjU3MTUyMDAwLFo6MTY2MDc4MDgwMCxhOjE2NjMxMTM2MDAsYjoxNjY4ODE2MDAwfSxEOntGOlwib1wiLEI6XCJvXCIsQzpcIm9cIixNQzpcIm9cIixOQzpcIm9cIixPQzpcIm9cIixQQzpcIm9cIixvQjpcIm9cIixcIjdCXCI6XCJvXCIsUUM6XCJvXCIscEI6XCJvXCJ9fSxHOntBOntFOjAseEI6MCxSQzowLFwiOEJcIjowLjAwNDcwMTk1LFNDOjAuMDA0NzAxOTUsVEM6MC4wMDMxMzQ2MyxVQzowLjAxNDEwNTgsVkM6MC4wMDYyNjkyNixXQzowLjAxODgwNzgsWEM6MC4wNjExMjUzLFlDOjAuMDA3ODM2NTgsWkM6MC4xMDY1NzcsYUM6MC4wMjgyMTE3LGJDOjAuMDI2NjQ0NCxjQzowLjAyNTA3NzEsZEM6MC40MDU5MzUsZUM6MC4wNDIzMTc1LGZDOjAuMDEwOTcxMixnQzowLjAzOTE4MjksaEM6MC4xNDEwNTgsaUM6MC4zNDAxMDgsakM6MC42NDczMDEsa0M6MC4xODY1MTEsXCIwQlwiOjAuMjM5Nzk5LFwiMUJcIjowLjMwNDA1OSxcIjJCXCI6MC41NDY5OTMsXCIzQlwiOjIuMzE0OTMscUI6Mi4wOTg2NCxcIjRCXCI6Ni4zMzE5NixcIjVCXCI6MC42OTQzMjEsXCI2QlwiOjAuMDE1NjczMn0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJ4QlwiLFwiUkNcIixcIjhCXCIsXCJTQ1wiLFwiVENcIixcIlVDXCIsXCJFXCIsXCJWQ1wiLFwiV0NcIixcIlhDXCIsXCJZQ1wiLFwiWkNcIixcImFDXCIsXCJiQ1wiLFwiY0NcIixcImRDXCIsXCJlQ1wiLFwiZkNcIixcImdDXCIsXCJoQ1wiLFwiaUNcIixcImpDXCIsXCJrQ1wiLFwiMEJcIixcIjFCXCIsXCIyQlwiLFwiM0JcIixcInFCXCIsXCI0QlwiLFwiNUJcIixcIjZCXCIsXCJcIixcIlwiXSxFOlwiU2FmYXJpIG9uIGlPU1wiLEY6e3hCOjEyNzAyNTI4MDAsUkM6MTI4MzkwNDAwMCxcIjhCXCI6MTI5OTYyODgwMCxTQzoxMzMxMDc4NDAwLFRDOjEzNTkzMzEyMDAsVUM6MTM5NDQwOTYwMCxFOjE0MTA5MTIwMDAsVkM6MTQxMzc2MzIwMCxXQzoxNDQyMzYxNjAwLFhDOjE0NTg1MTg0MDAsWUM6MTQ3MzcyNDgwMCxaQzoxNDkwNTcyODAwLGFDOjE1MDU3NzkyMDAsYkM6MTUyMjI4MTYwMCxjQzoxNTM3MTQyNDAwLGRDOjE1NTM0NzIwMDAsZUM6MTU2ODg1MTIwMCxmQzoxNTcyMjIwODAwLGdDOjE1ODAxNjk2MDAsaEM6MTU4NTAwODAwMCxpQzoxNjAwMjE0NDAwLGpDOjE2MTkzOTUyMDAsa0M6MTYzMjA5NjAwMCxcIjBCXCI6MTYzOTM1MzYwMCxcIjFCXCI6MTY0NzIxNjAwMCxcIjJCXCI6MTY1MjY1OTIwMCxcIjNCXCI6MTY1ODI3NTIwMCxxQjoxNjYyOTQwODAwLFwiNEJcIjoxNjY2NTY5NjAwLFwiNUJcIjoxNjcwODg5NjAwLFwiNkJcIjpudWxsfX0sSDp7QTp7bEM6MC45NjY5ODh9LEI6XCJvXCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJsQ1wiLFwiXCIsXCJcIixcIlwiXSxFOlwiT3BlcmEgTWluaVwiLEY6e2xDOjE0MjY0NjQwMDB9fSxJOntBOntyQjowLEk6MC4wMzA2OTUxLEg6MCxtQzowLG5DOjAuMDIwNDYzNCxvQzowLHBDOjAuMDIwNDYzNCxcIjhCXCI6MC4wODE4NTM3LHFDOjAsckM6MC40MTk1fSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJtQ1wiLFwibkNcIixcIm9DXCIsXCJyQlwiLFwiSVwiLFwicENcIixcIjhCXCIsXCJxQ1wiLFwickNcIixcIkhcIixcIlwiLFwiXCIsXCJcIl0sRTpcIkFuZHJvaWQgQnJvd3NlclwiLEY6e21DOjEyNTY1MTUyMDAsbkM6MTI3NDMxMzYwMCxvQzoxMjkxNTkzNjAwLHJCOjEyOTgzMzI4MDAsSToxMzE4ODk2MDAwLHBDOjEzNDE3OTIwMDAsXCI4QlwiOjEzNzQ2MjQwMDAscUM6MTM4NjU0NzIwMCxyQzoxNDAxNjY3MjAwLEg6MTY2OTkzOTIwMH19LEo6e0E6e0Q6MCxBOjB9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJEXCIsXCJBXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJCbGFja2JlcnJ5IEJyb3dzZXJcIixGOntEOjEzMjUzNzYwMDAsQToxMzU5NTA0MDAwfX0sSzp7QTp7QTowLEI6MCxDOjAsZDowLjAxMTEzOTEsb0I6MCxcIjdCXCI6MCxwQjowfSxCOlwib1wiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiQVwiLFwiQlwiLFwib0JcIixcIjdCXCIsXCJDXCIsXCJwQlwiLFwiZFwiLFwiXCIsXCJcIixcIlwiXSxFOlwiT3BlcmEgTW9iaWxlXCIsRjp7QToxMjg3MTAwODAwLEI6MTMwMDc1MjAwMCxvQjoxMzE0ODM1MjAwLFwiN0JcIjoxMzE4MjkxMjAwLEM6MTMzMDMwMDgwMCxwQjoxMzQ5NzQwODAwLGQ6MTY2NjgyODgwMH0sRDp7ZDpcIndlYmtpdFwifX0sTDp7QTp7SDo0MS41NDI2fSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJIXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJDaHJvbWUgZm9yIEFuZHJvaWRcIixGOntIOjE2Njk5MzkyMDB9fSxNOntBOntjOjAuMjkyNzE2fSxCOlwibW96XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJjXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJGaXJlZm94IGZvciBBbmRyb2lkXCIsRjp7YzoxNjY4NDcwNDAwfX0sTjp7QTp7QTowLjAxMTU5MzQsQjowLjAyMjY2NH0sQjpcIm1zXCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiQVwiLFwiQlwiLFwiXCIsXCJcIixcIlwiXSxFOlwiSUUgTW9iaWxlXCIsRjp7QToxMzQwMTUwNDAwLEI6MTM1MzQ1NjAwMH19LE86e0E6e3NDOjEuNzUwMDd9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcInNDXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJVQyBCcm93c2VyIGZvciBBbmRyb2lkXCIsRjp7c0M6MTYzNDY4ODAwMH0sRDp7c0M6XCJ3ZWJraXRcIn19LFA6e0E6e0k6MC4xNjY0MDksdEM6MC4wMTAzNTQzLHVDOjAuMDEwMzA0LHZDOjAuMDUyMDAyOCx3QzowLjAxMDM1ODQseEM6MC4wMTA0NDQzLHlCOjAuMDEwNTA0Myx5QzowLjAzMTIwMTcsekM6MC4wMTA0MDA2LFwiMENcIjowLjA1MjAwMjgsXCIxQ1wiOjAuMDYyNDAzMyxcIjJDXCI6MC4wMzEyMDE3LHFCOjAuMTE0NDA2LFwiM0NcIjowLjEyNDgwNyxcIjRDXCI6MC4yNDk2MTMsXCI1Q1wiOjIuMjU2OTJ9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIklcIixcInRDXCIsXCJ1Q1wiLFwidkNcIixcIndDXCIsXCJ4Q1wiLFwieUJcIixcInlDXCIsXCJ6Q1wiLFwiMENcIixcIjFDXCIsXCIyQ1wiLFwicUJcIixcIjNDXCIsXCI0Q1wiLFwiNUNcIixcIlwiLFwiXCIsXCJcIl0sRTpcIlNhbXN1bmcgSW50ZXJuZXRcIixGOntJOjE0NjEwMjQwMDAsdEM6MTQ4MTg0NjQwMCx1QzoxNTA5NDA4MDAwLHZDOjE1MjgzMjk2MDAsd0M6MTU0NjEyODAwMCx4QzoxNTU0MTYzMjAwLHlCOjE1Njc5MDA4MDAseUM6MTU4MjU4ODgwMCx6QzoxNTkzNDc1MjAwLFwiMENcIjoxNjA1NjU3NjAwLFwiMUNcIjoxNjE4NTMxMjAwLFwiMkNcIjoxNjI5MDcyMDAwLHFCOjE2NDA3MzYwMDAsXCIzQ1wiOjE2NTE3MDg4MDAsXCI0Q1wiOjE2NTk2NTc2MDAsXCI1Q1wiOjE2NjcyNjA4MDB9fSxROntBOnt6QjowLjE5OTI5Nn0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiekJcIixcIlwiLFwiXCIsXCJcIl0sRTpcIlFRIEJyb3dzZXJcIixGOnt6QjoxNjYzNzE4NDAwfX0sUjp7QTp7XCI2Q1wiOjB9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIjZDXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJCYWlkdSBCcm93c2VyXCIsRjp7XCI2Q1wiOjE2NjMwMjcyMDB9fSxTOntBOntcIjdDXCI6MC4wNjg1MDh9LEI6XCJtb3pcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIjdDXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJLYWlPUyBCcm93c2VyXCIsRjp7XCI3Q1wiOjE1Mjc4MTEyMDB9fX07XG4iLCJtb2R1bGUuZXhwb3J0cz17XCIwXCI6XCIyNlwiLFwiMVwiOlwiMjdcIixcIjJcIjpcIjI4XCIsXCIzXCI6XCIyOVwiLFwiNFwiOlwiMzBcIixcIjVcIjpcIjMxXCIsXCI2XCI6XCIzMlwiLFwiN1wiOlwiMzNcIixcIjhcIjpcIjM0XCIsXCI5XCI6XCIzNVwiLEE6XCIxMFwiLEI6XCIxMVwiLEM6XCIxMlwiLEQ6XCI3XCIsRTpcIjhcIixGOlwiOVwiLEc6XCIxNVwiLEg6XCIxMDhcIixJOlwiNFwiLEo6XCI2XCIsSzpcIjEzXCIsTDpcIjE0XCIsTTpcIjE2XCIsTjpcIjE3XCIsTzpcIjE4XCIsUDpcIjc5XCIsUTpcIjgwXCIsUjpcIjgxXCIsUzpcIjgzXCIsVDpcIjg0XCIsVTpcIjg1XCIsVjpcIjg2XCIsVzpcIjg3XCIsWDpcIjg4XCIsWTpcIjg5XCIsWjpcIjkwXCIsYTpcIjkxXCIsYjpcIjkyXCIsYzpcIjEwN1wiLGQ6XCI3MlwiLGU6XCI5M1wiLGY6XCI5NFwiLGc6XCI5NVwiLGg6XCI5NlwiLGk6XCI5N1wiLGo6XCI5OFwiLGs6XCI5OVwiLGw6XCIxMDBcIixtOlwiMTAxXCIsbjpcIjEwMlwiLG86XCIxMDNcIixwOlwiMTA0XCIscTpcIjEwNVwiLHI6XCIxMDZcIixzOlwiNVwiLHQ6XCIxOVwiLHU6XCIyMFwiLHY6XCIyMVwiLHc6XCIyMlwiLHg6XCIyM1wiLHk6XCIyNFwiLHo6XCIyNVwiLEFCOlwiMzZcIixCQjpcIjM3XCIsQ0I6XCIzOFwiLERCOlwiMzlcIixFQjpcIjQwXCIsRkI6XCI0MVwiLEdCOlwiNDJcIixIQjpcIjQzXCIsSUI6XCI0NFwiLEpCOlwiNDVcIixLQjpcIjQ2XCIsTEI6XCI0N1wiLE1COlwiNDhcIixOQjpcIjQ5XCIsT0I6XCI1MFwiLFBCOlwiNTFcIixRQjpcIjUyXCIsUkI6XCI1M1wiLFNCOlwiNTRcIixUQjpcIjU1XCIsVUI6XCI1NlwiLFZCOlwiNTdcIixXQjpcIjU4XCIsWEI6XCI2MFwiLFlCOlwiNjJcIixaQjpcIjYzXCIsYUI6XCI2NFwiLGJCOlwiNjVcIixjQjpcIjY2XCIsZEI6XCI2N1wiLGVCOlwiNjhcIixmQjpcIjY5XCIsZ0I6XCI3MFwiLGhCOlwiNzFcIixpQjpcIjczXCIsakI6XCI3NFwiLGtCOlwiNzVcIixsQjpcIjc2XCIsbUI6XCI3N1wiLG5COlwiNzhcIixvQjpcIjExLjFcIixwQjpcIjEyLjFcIixxQjpcIjE2LjBcIixyQjpcIjNcIixzQjpcIjU5XCIsdEI6XCI2MVwiLHVCOlwiODJcIix2QjpcIjEwOVwiLHdCOlwiMTEwXCIseEI6XCIzLjJcIix5QjpcIjEwLjFcIix6QjpcIjEzLjFcIixcIjBCXCI6XCIxNS4yLTE1LjNcIixcIjFCXCI6XCIxNS40XCIsXCIyQlwiOlwiMTUuNVwiLFwiM0JcIjpcIjE1LjZcIixcIjRCXCI6XCIxNi4xXCIsXCI1QlwiOlwiMTYuMlwiLFwiNkJcIjpcIjE2LjNcIixcIjdCXCI6XCIxMS41XCIsXCI4QlwiOlwiNC4yLTQuM1wiLFwiOUJcIjpcIjUuNVwiLEFDOlwiMlwiLEJDOlwiMy41XCIsQ0M6XCIzLjZcIixEQzpcIjExMVwiLEVDOlwiMy4xXCIsRkM6XCI1LjFcIixHQzpcIjYuMVwiLEhDOlwiNy4xXCIsSUM6XCI5LjFcIixKQzpcIjE0LjFcIixLQzpcIjE1LjFcIixMQzpcIlRQXCIsTUM6XCI5LjUtOS42XCIsTkM6XCIxMC4wLTEwLjFcIixPQzpcIjEwLjVcIixQQzpcIjEwLjZcIixRQzpcIjExLjZcIixSQzpcIjQuMC00LjFcIixTQzpcIjUuMC01LjFcIixUQzpcIjYuMC02LjFcIixVQzpcIjcuMC03LjFcIixWQzpcIjguMS04LjRcIixXQzpcIjkuMC05LjJcIixYQzpcIjkuM1wiLFlDOlwiMTAuMC0xMC4yXCIsWkM6XCIxMC4zXCIsYUM6XCIxMS4wLTExLjJcIixiQzpcIjExLjMtMTEuNFwiLGNDOlwiMTIuMC0xMi4xXCIsZEM6XCIxMi4yLTEyLjVcIixlQzpcIjEzLjAtMTMuMVwiLGZDOlwiMTMuMlwiLGdDOlwiMTMuM1wiLGhDOlwiMTMuNC0xMy43XCIsaUM6XCIxNC4wLTE0LjRcIixqQzpcIjE0LjUtMTQuOFwiLGtDOlwiMTUuMC0xNS4xXCIsbEM6XCJhbGxcIixtQzpcIjIuMVwiLG5DOlwiMi4yXCIsb0M6XCIyLjNcIixwQzpcIjQuMVwiLHFDOlwiNC40XCIsckM6XCI0LjQuMy00LjQuNFwiLHNDOlwiMTMuNFwiLHRDOlwiNS4wLTUuNFwiLHVDOlwiNi4yLTYuNFwiLHZDOlwiNy4yLTcuNFwiLHdDOlwiOC4yXCIseEM6XCI5LjJcIix5QzpcIjExLjEtMTEuMlwiLHpDOlwiMTIuMFwiLFwiMENcIjpcIjEzLjBcIixcIjFDXCI6XCIxNC4wXCIsXCIyQ1wiOlwiMTUuMFwiLFwiM0NcIjpcIjE3LjBcIixcIjRDXCI6XCIxOC4wXCIsXCI1Q1wiOlwiMTkuMFwiLFwiNkNcIjpcIjEzLjE4XCIsXCI3Q1wiOlwiMi41XCJ9O1xuIiwibW9kdWxlLmV4cG9ydHM9e0E6XCJpZVwiLEI6XCJlZGdlXCIsQzpcImZpcmVmb3hcIixEOlwiY2hyb21lXCIsRTpcInNhZmFyaVwiLEY6XCJvcGVyYVwiLEc6XCJpb3Nfc2FmXCIsSDpcIm9wX21pbmlcIixJOlwiYW5kcm9pZFwiLEo6XCJiYlwiLEs6XCJvcF9tb2JcIixMOlwiYW5kX2NoclwiLE06XCJhbmRfZmZcIixOOlwiaWVfbW9iXCIsTzpcImFuZF91Y1wiLFA6XCJzYW1zdW5nXCIsUTpcImFuZF9xcVwiLFI6XCJiYWlkdVwiLFM6XCJrYWlvc1wifTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5jb25zdCBicm93c2VycyA9IHJlcXVpcmUoJy4vYnJvd3NlcnMnKS5icm93c2Vyc1xuY29uc3QgdmVyc2lvbnMgPSByZXF1aXJlKCcuL2Jyb3dzZXJWZXJzaW9ucycpLmJyb3dzZXJWZXJzaW9uc1xuY29uc3QgYWdlbnRzRGF0YSA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvYWdlbnRzJylcblxuZnVuY3Rpb24gdW5wYWNrQnJvd3NlclZlcnNpb25zKHZlcnNpb25zRGF0YSkge1xuICByZXR1cm4gT2JqZWN0LmtleXModmVyc2lvbnNEYXRhKS5yZWR1Y2UoKHVzYWdlLCB2ZXJzaW9uKSA9PiB7XG4gICAgdXNhZ2VbdmVyc2lvbnNbdmVyc2lvbl1dID0gdmVyc2lvbnNEYXRhW3ZlcnNpb25dXG4gICAgcmV0dXJuIHVzYWdlXG4gIH0sIHt9KVxufVxuXG5tb2R1bGUuZXhwb3J0cy5hZ2VudHMgPSBPYmplY3Qua2V5cyhhZ2VudHNEYXRhKS5yZWR1Y2UoKG1hcCwga2V5KSA9PiB7XG4gIGxldCB2ZXJzaW9uc0RhdGEgPSBhZ2VudHNEYXRhW2tleV1cbiAgbWFwW2Jyb3dzZXJzW2tleV1dID0gT2JqZWN0LmtleXModmVyc2lvbnNEYXRhKS5yZWR1Y2UoKGRhdGEsIGVudHJ5KSA9PiB7XG4gICAgaWYgKGVudHJ5ID09PSAnQScpIHtcbiAgICAgIGRhdGEudXNhZ2VfZ2xvYmFsID0gdW5wYWNrQnJvd3NlclZlcnNpb25zKHZlcnNpb25zRGF0YVtlbnRyeV0pXG4gICAgfSBlbHNlIGlmIChlbnRyeSA9PT0gJ0MnKSB7XG4gICAgICBkYXRhLnZlcnNpb25zID0gdmVyc2lvbnNEYXRhW2VudHJ5XS5yZWR1Y2UoKGxpc3QsIHZlcnNpb24pID0+IHtcbiAgICAgICAgaWYgKHZlcnNpb24gPT09ICcnKSB7XG4gICAgICAgICAgbGlzdC5wdXNoKG51bGwpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGlzdC5wdXNoKHZlcnNpb25zW3ZlcnNpb25dKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0XG4gICAgICB9LCBbXSlcbiAgICB9IGVsc2UgaWYgKGVudHJ5ID09PSAnRCcpIHtcbiAgICAgIGRhdGEucHJlZml4X2V4Y2VwdGlvbnMgPSB1bnBhY2tCcm93c2VyVmVyc2lvbnModmVyc2lvbnNEYXRhW2VudHJ5XSlcbiAgICB9IGVsc2UgaWYgKGVudHJ5ID09PSAnRScpIHtcbiAgICAgIGRhdGEuYnJvd3NlciA9IHZlcnNpb25zRGF0YVtlbnRyeV1cbiAgICB9IGVsc2UgaWYgKGVudHJ5ID09PSAnRicpIHtcbiAgICAgIGRhdGEucmVsZWFzZV9kYXRlID0gT2JqZWN0LmtleXModmVyc2lvbnNEYXRhW2VudHJ5XSkucmVkdWNlKFxuICAgICAgICAobWFwMiwga2V5MikgPT4ge1xuICAgICAgICAgIG1hcDJbdmVyc2lvbnNba2V5Ml1dID0gdmVyc2lvbnNEYXRhW2VudHJ5XVtrZXkyXVxuICAgICAgICAgIHJldHVybiBtYXAyXG4gICAgICAgIH0sXG4gICAgICAgIHt9XG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGVudHJ5IGlzIEJcbiAgICAgIGRhdGEucHJlZml4ID0gdmVyc2lvbnNEYXRhW2VudHJ5XVxuICAgIH1cbiAgICByZXR1cm4gZGF0YVxuICB9LCB7fSlcbiAgcmV0dXJuIG1hcFxufSwge30pXG4iLCJtb2R1bGUuZXhwb3J0cy5icm93c2VyVmVyc2lvbnMgPSByZXF1aXJlKCcuLi8uLi9kYXRhL2Jyb3dzZXJWZXJzaW9ucycpXG4iLCJtb2R1bGUuZXhwb3J0cy5icm93c2VycyA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvYnJvd3NlcnMnKVxuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgXCIuZ2xvdyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjaztcXG4gIGJvcmRlci1zdHlsZTogc29saWQ7XFxuICBib3JkZXItY29sb3I6IGdyZWVuO1xcbiAgYm9yZGVyLXdpZHRoOiA1cHg7XFxuICBcXG4gIGJveC1zaGFkb3c6IDAgMCA0MHB4IGJsYWNrO1xcbn1cXG5cXG4ubmF2QnV0dG9uIHtcXG4gIGJhY2tncm91bmQtY29sb3I6IGdyZWVuO1xcbiAgY29sb3I6IGJsYWNrO1xcblxcbiAgYm9yZGVyLXJhZGl1czogNXB4O1xcbiAgYm9yZGVyLXdpZHRoOiAwcHg7XFxuXFxuICBmb250LXNpemU6IHgtbGFyZ2U7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG4gIHBhZGRpbmc6IDVweDtcXG59XFxuXFxuLm5hdkJ1dHRvbjpob3ZlciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjaztcXG4gIGNvbG9yOiBncmVlbjtcXG5cXG4gIG91dGxpbmUtc3R5bGU6IHNvbGlkO1xcbiAgb3V0bGluZS13aWR0aDogMnB4O1xcbn1cXG5cXG4uZm9vdGVyIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuICBnYXA6IDEwcHg7XFxuICBwYWRkaW5nOiAxMHB4O1xcbiAgd2lkdGg6IDkwMHB4O1xcbn1cIiwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvZ2xvYmFsLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLHVCQUF1QjtFQUN2QixtQkFBbUI7RUFDbkIsbUJBQW1CO0VBQ25CLGlCQUFpQjs7RUFFakIsMEJBQTBCO0FBQzVCOztBQUVBO0VBQ0UsdUJBQXVCO0VBQ3ZCLFlBQVk7O0VBRVosa0JBQWtCO0VBQ2xCLGlCQUFpQjs7RUFFakIsa0JBQWtCO0VBQ2xCLGlCQUFpQjtFQUNqQixZQUFZO0FBQ2Q7O0FBRUE7RUFDRSx1QkFBdUI7RUFDdkIsWUFBWTs7RUFFWixvQkFBb0I7RUFDcEIsa0JBQWtCO0FBQ3BCOztBQUVBO0VBQ0UsYUFBYTtFQUNiLHVCQUF1QjtFQUN2QixtQkFBbUI7RUFDbkIsU0FBUztFQUNULGFBQWE7RUFDYixZQUFZO0FBQ2RcIixcInNvdXJjZXNDb250ZW50XCI6W1wiLmdsb3cge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7XFxuICBib3JkZXItc3R5bGU6IHNvbGlkO1xcbiAgYm9yZGVyLWNvbG9yOiBncmVlbjtcXG4gIGJvcmRlci13aWR0aDogNXB4O1xcbiAgXFxuICBib3gtc2hhZG93OiAwIDAgNDBweCBibGFjaztcXG59XFxuXFxuLm5hdkJ1dHRvbiB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBncmVlbjtcXG4gIGNvbG9yOiBibGFjaztcXG5cXG4gIGJvcmRlci1yYWRpdXM6IDVweDtcXG4gIGJvcmRlci13aWR0aDogMHB4O1xcblxcbiAgZm9udC1zaXplOiB4LWxhcmdlO1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxuICBwYWRkaW5nOiA1cHg7XFxufVxcblxcbi5uYXZCdXR0b246aG92ZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7XFxuICBjb2xvcjogZ3JlZW47XFxuXFxuICBvdXRsaW5lLXN0eWxlOiBzb2xpZDtcXG4gIG91dGxpbmUtd2lkdGg6IDJweDtcXG59XFxuXFxuLmZvb3RlciB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XFxuICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgZ2FwOiAxMHB4O1xcbiAgcGFkZGluZzogMTBweDtcXG4gIHdpZHRoOiA5MDBweDtcXG59XCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfR0VUX1VSTF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9nZXRVcmwuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX1VSTF9JTVBPUlRfMF9fXyA9IG5ldyBVUkwoXCJpbWdzL25vb2RsZXN0di5wbmdcIiwgaW1wb3J0Lm1ldGEudXJsKTtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbnZhciBfX19DU1NfTE9BREVSX1VSTF9SRVBMQUNFTUVOVF8wX19fID0gX19fQ1NTX0xPQURFUl9HRVRfVVJMX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX1VSTF9JTVBPUlRfMF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgXCIuaGVhZGVyIHtcXG4gICAgYmFja2dyb3VuZC1pbWFnZTogdXJsKFwiICsgX19fQ1NTX0xPQURFUl9VUkxfUkVQTEFDRU1FTlRfMF9fXyArIFwiKTtcXG4gICAgYmFja2dyb3VuZC1zaXplOiBjb3ZlcjtcXG4gICAgYmFja2dyb3VuZC1yZXBlYXQ6IG5vLXJlcGVhdDtcXG4gICAgYmFja2dyb3VuZC1wb3NpdGlvbjogY2VudGVyO1xcblxcbiAgICB3aWR0aDogOTAwcHg7XFxuICAgIGhlaWdodDogNjAwcHg7XFxuXFxuICAgIGRpc3BsYXk6aW5saW5lLWJsb2NrO1xcbn1cXG5cXG4ub3BhcXVle1xcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuNSk7XFxuICAgIGZvbnQtc2l6ZTogeHgtbGFyZ2U7XFxuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gICAgY29sb3I6IHdoaXRlO1xcbiAgICBtYXJnaW4tdG9wOiAyNTBweDtcXG59XFxuXFxuLm5hdkJhciB7XFxuICAgIGRpc3BsYXk6IGZsZXg7XFxuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG5cXG4gICAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7XFxuICAgIHBhZGRpbmc6IDVweCAxMHB4O1xcbn1cXG5cXG4udGl0bGVJbWd7XFxuICAgIHdpZHRoOiAxNTBweDtcXG4gICAgaGVpZ2h0OiA1MHB4O1xcbn1cXG5cXG4ubWFwIHtcXG4gICAgd2lkdGg6IDkwMHB4O1xcbn1cXG5cXG4uc3RvcmVIb3Vyc3tcXG4gICAgd2lkdGg6IDkwMHB4O1xcbiAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgICBwYWRkaW5nOiA1cHggMTBweDtcXG4gICAgZm9udC1zaXplOiB4LWxhcmdlO1xcbn1cXG5cXG4uc3RvcmVIb3VycyB0YWJsZSB7XFxuICAgIGZsZXg6IDE7XFxufVxcblxcbi5zdG9yZUhvdXJzIHRhYmxlIHRyIHtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xcbn1cXG5cXG4uc3RvcmVIb3VycyB0YWJsZSB0aCB7XFxuICAgIHBhZGRpbmc6IDVweDtcXG4gICAgdGV4dC1hbGlnbjogbGVmdDtcXG59XFxuXFxuLmluZm9ybWF0aW9uIHtcXG4gICAgcGFkZGluZzogMjVweDtcXG4gICAgZm9udC1zaXplOiBsYXJnZTtcXG59XCIsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL2luaXRpYWxQYWdlLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtJQUNJLHlEQUEyQztJQUMzQyxzQkFBc0I7SUFDdEIsNEJBQTRCO0lBQzVCLDJCQUEyQjs7SUFFM0IsWUFBWTtJQUNaLGFBQWE7O0lBRWIsb0JBQW9CO0FBQ3hCOztBQUVBO0lBQ0ksb0NBQW9DO0lBQ3BDLG1CQUFtQjtJQUNuQixrQkFBa0I7SUFDbEIsWUFBWTtJQUNaLGlCQUFpQjtBQUNyQjs7QUFFQTtJQUNJLGFBQWE7SUFDYiw4QkFBOEI7SUFDOUIsbUJBQW1COztJQUVuQix1QkFBdUI7SUFDdkIsaUJBQWlCO0FBQ3JCOztBQUVBO0lBQ0ksWUFBWTtJQUNaLFlBQVk7QUFDaEI7O0FBRUE7SUFDSSxZQUFZO0FBQ2hCOztBQUVBO0lBQ0ksWUFBWTtJQUNaLGFBQWE7SUFDYixtQkFBbUI7SUFDbkIsaUJBQWlCO0lBQ2pCLGtCQUFrQjtBQUN0Qjs7QUFFQTtJQUNJLE9BQU87QUFDWDs7QUFFQTtJQUNJLGFBQWE7SUFDYiw4QkFBOEI7SUFDOUIsbUJBQW1CO0FBQ3ZCOztBQUVBO0lBQ0ksWUFBWTtJQUNaLGdCQUFnQjtBQUNwQjs7QUFFQTtJQUNJLGFBQWE7SUFDYixnQkFBZ0I7QUFDcEJcIixcInNvdXJjZXNDb250ZW50XCI6W1wiLmhlYWRlciB7XFxuICAgIGJhY2tncm91bmQtaW1hZ2U6IHVybCgnaW1ncy9ub29kbGVzdHYucG5nJyk7XFxuICAgIGJhY2tncm91bmQtc2l6ZTogY292ZXI7XFxuICAgIGJhY2tncm91bmQtcmVwZWF0OiBuby1yZXBlYXQ7XFxuICAgIGJhY2tncm91bmQtcG9zaXRpb246IGNlbnRlcjtcXG5cXG4gICAgd2lkdGg6IDkwMHB4O1xcbiAgICBoZWlnaHQ6IDYwMHB4O1xcblxcbiAgICBkaXNwbGF5OmlubGluZS1ibG9jaztcXG59XFxuXFxuLm9wYXF1ZXtcXG4gICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjUpO1xcbiAgICBmb250LXNpemU6IHh4LWxhcmdlO1xcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICAgIGNvbG9yOiB3aGl0ZTtcXG4gICAgbWFyZ2luLXRvcDogMjUwcHg7XFxufVxcblxcbi5uYXZCYXIge1xcbiAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XFxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuXFxuICAgIGJhY2tncm91bmQtY29sb3I6IGJsYWNrO1xcbiAgICBwYWRkaW5nOiA1cHggMTBweDtcXG59XFxuXFxuLnRpdGxlSW1ne1xcbiAgICB3aWR0aDogMTUwcHg7XFxuICAgIGhlaWdodDogNTBweDtcXG59XFxuXFxuLm1hcCB7XFxuICAgIHdpZHRoOiA5MDBweDtcXG59XFxuXFxuLnN0b3JlSG91cnN7XFxuICAgIHdpZHRoOiA5MDBweDtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG4gICAgcGFkZGluZzogNXB4IDEwcHg7XFxuICAgIGZvbnQtc2l6ZTogeC1sYXJnZTtcXG59XFxuXFxuLnN0b3JlSG91cnMgdGFibGUge1xcbiAgICBmbGV4OiAxO1xcbn1cXG5cXG4uc3RvcmVIb3VycyB0YWJsZSB0ciB7XFxuICAgIGRpc3BsYXk6IGZsZXg7XFxuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG59XFxuXFxuLnN0b3JlSG91cnMgdGFibGUgdGgge1xcbiAgICBwYWRkaW5nOiA1cHg7XFxuICAgIHRleHQtYWxpZ246IGxlZnQ7XFxufVxcblxcbi5pbmZvcm1hdGlvbiB7XFxuICAgIHBhZGRpbmc6IDI1cHg7XFxuICAgIGZvbnQtc2l6ZTogbGFyZ2U7XFxufVwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBcIi5tZW51Q29udGFpbmVyIHtcXG4gIHdpZHRoOiA5MDBweDtcXG59XFxuXFxuLm1lbnUge1xcbiAgd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IDc1MHB4O1xcbiAgZm9udC1zaXplOiB4LWxhcmdlO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbn1cXG5cXG4ubWVudSAgKntcXG4gIG91dGxpbmUtc3R5bGU6IHNvbGlkO1xcbiAgb3V0bGluZS1jb2xvcjogZ3JlZW47XFxufVxcblxcbi5tZW51IGNhcHRpb24ge1xcbiAgZm9udC1zaXplOiB4eC1sYXJnZTtcXG59XFxuXCIsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL21lbnUuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsWUFBWTtBQUNkOztBQUVBO0VBQ0UsV0FBVztFQUNYLGFBQWE7RUFDYixrQkFBa0I7RUFDbEIsa0JBQWtCO0FBQ3BCOztBQUVBO0VBQ0Usb0JBQW9CO0VBQ3BCLG9CQUFvQjtBQUN0Qjs7QUFFQTtFQUNFLG1CQUFtQjtBQUNyQlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIubWVudUNvbnRhaW5lciB7XFxuICB3aWR0aDogOTAwcHg7XFxufVxcblxcbi5tZW51IHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgaGVpZ2h0OiA3NTBweDtcXG4gIGZvbnQtc2l6ZTogeC1sYXJnZTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG59XFxuXFxuLm1lbnUgICp7XFxuICBvdXRsaW5lLXN0eWxlOiBzb2xpZDtcXG4gIG91dGxpbmUtY29sb3I6IGdyZWVuO1xcbn1cXG5cXG4ubWVudSBjYXB0aW9uIHtcXG4gIGZvbnQtc2l6ZTogeHgtbGFyZ2U7XFxufVxcblwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLypcbiAgTUlUIExpY2Vuc2UgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcbiAgQXV0aG9yIFRvYmlhcyBLb3BwZXJzIEBzb2tyYVxuKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcpIHtcbiAgdmFyIGxpc3QgPSBbXTtcblxuICAvLyByZXR1cm4gdGhlIGxpc3Qgb2YgbW9kdWxlcyBhcyBjc3Mgc3RyaW5nXG4gIGxpc3QudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHZhciBjb250ZW50ID0gXCJcIjtcbiAgICAgIHZhciBuZWVkTGF5ZXIgPSB0eXBlb2YgaXRlbVs1XSAhPT0gXCJ1bmRlZmluZWRcIjtcbiAgICAgIGlmIChpdGVtWzRdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChpdGVtWzRdLCBcIikge1wiKTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtWzJdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAbWVkaWEgXCIuY29uY2F0KGl0ZW1bMl0sIFwiIHtcIik7XG4gICAgICB9XG4gICAgICBpZiAobmVlZExheWVyKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAbGF5ZXJcIi5jb25jYXQoaXRlbVs1XS5sZW5ndGggPiAwID8gXCIgXCIuY29uY2F0KGl0ZW1bNV0pIDogXCJcIiwgXCIge1wiKTtcbiAgICAgIH1cbiAgICAgIGNvbnRlbnQgKz0gY3NzV2l0aE1hcHBpbmdUb1N0cmluZyhpdGVtKTtcbiAgICAgIGlmIChuZWVkTGF5ZXIpIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtWzJdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJ9XCI7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVs0XSkge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfSkuam9pbihcIlwiKTtcbiAgfTtcblxuICAvLyBpbXBvcnQgYSBsaXN0IG9mIG1vZHVsZXMgaW50byB0aGUgbGlzdFxuICBsaXN0LmkgPSBmdW5jdGlvbiBpKG1vZHVsZXMsIG1lZGlhLCBkZWR1cGUsIHN1cHBvcnRzLCBsYXllcikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlcyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgbW9kdWxlcyA9IFtbbnVsbCwgbW9kdWxlcywgdW5kZWZpbmVkXV07XG4gICAgfVxuICAgIHZhciBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzID0ge307XG4gICAgaWYgKGRlZHVwZSkge1xuICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCB0aGlzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIHZhciBpZCA9IHRoaXNba11bMF07XG4gICAgICAgIGlmIChpZCAhPSBudWxsKSB7XG4gICAgICAgICAgYWxyZWFkeUltcG9ydGVkTW9kdWxlc1tpZF0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIF9rID0gMDsgX2sgPCBtb2R1bGVzLmxlbmd0aDsgX2srKykge1xuICAgICAgdmFyIGl0ZW0gPSBbXS5jb25jYXQobW9kdWxlc1tfa10pO1xuICAgICAgaWYgKGRlZHVwZSAmJiBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2l0ZW1bMF1dKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBsYXllciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBpZiAodHlwZW9mIGl0ZW1bNV0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICBpdGVtWzVdID0gbGF5ZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQGxheWVyXCIuY29uY2F0KGl0ZW1bNV0ubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChpdGVtWzVdKSA6IFwiXCIsIFwiIHtcIikuY29uY2F0KGl0ZW1bMV0sIFwifVwiKTtcbiAgICAgICAgICBpdGVtWzVdID0gbGF5ZXI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChtZWRpYSkge1xuICAgICAgICBpZiAoIWl0ZW1bMl0pIHtcbiAgICAgICAgICBpdGVtWzJdID0gbWVkaWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQG1lZGlhIFwiLmNvbmNhdChpdGVtWzJdLCBcIiB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVsyXSA9IG1lZGlhO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc3VwcG9ydHMpIHtcbiAgICAgICAgaWYgKCFpdGVtWzRdKSB7XG4gICAgICAgICAgaXRlbVs0XSA9IFwiXCIuY29uY2F0KHN1cHBvcnRzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtWzFdID0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChpdGVtWzRdLCBcIikge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bNF0gPSBzdXBwb3J0cztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGlzdC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGxpc3Q7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIGlmICghdXJsKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICB1cmwgPSBTdHJpbmcodXJsLl9fZXNNb2R1bGUgPyB1cmwuZGVmYXVsdCA6IHVybCk7XG5cbiAgLy8gSWYgdXJsIGlzIGFscmVhZHkgd3JhcHBlZCBpbiBxdW90ZXMsIHJlbW92ZSB0aGVtXG4gIGlmICgvXlsnXCJdLipbJ1wiXSQvLnRlc3QodXJsKSkge1xuICAgIHVybCA9IHVybC5zbGljZSgxLCAtMSk7XG4gIH1cbiAgaWYgKG9wdGlvbnMuaGFzaCkge1xuICAgIHVybCArPSBvcHRpb25zLmhhc2g7XG4gIH1cblxuICAvLyBTaG91bGQgdXJsIGJlIHdyYXBwZWQ/XG4gIC8vIFNlZSBodHRwczovL2RyYWZ0cy5jc3N3Zy5vcmcvY3NzLXZhbHVlcy0zLyN1cmxzXG4gIGlmICgvW1wiJygpIFxcdFxcbl18KCUyMCkvLnRlc3QodXJsKSB8fCBvcHRpb25zLm5lZWRRdW90ZXMpIHtcbiAgICByZXR1cm4gXCJcXFwiXCIuY29uY2F0KHVybC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykucmVwbGFjZSgvXFxuL2csIFwiXFxcXG5cIiksIFwiXFxcIlwiKTtcbiAgfVxuICByZXR1cm4gdXJsO1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaXRlbSkge1xuICB2YXIgY29udGVudCA9IGl0ZW1bMV07XG4gIHZhciBjc3NNYXBwaW5nID0gaXRlbVszXTtcbiAgaWYgKCFjc3NNYXBwaW5nKSB7XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH1cbiAgaWYgKHR5cGVvZiBidG9hID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB2YXIgYmFzZTY0ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoY3NzTWFwcGluZykpKSk7XG4gICAgdmFyIGRhdGEgPSBcInNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LFwiLmNvbmNhdChiYXNlNjQpO1xuICAgIHZhciBzb3VyY2VNYXBwaW5nID0gXCIvKiMgXCIuY29uY2F0KGRhdGEsIFwiICovXCIpO1xuICAgIHJldHVybiBbY29udGVudF0uY29uY2F0KFtzb3VyY2VNYXBwaW5nXSkuam9pbihcIlxcblwiKTtcbiAgfVxuICByZXR1cm4gW2NvbnRlbnRdLmpvaW4oXCJcXG5cIik7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gW1tcIk5hbWVcIixcIkhQIHJlc3RvcmVkXCIsXCJSYWRzXCIsXCJXZWlnaHRcIixcIlZhbHVlXCJdLFtcIkFuZ2xlciBNZWF0XCIsXCIzNVwiLFwiMTBcIixcIjAuNVwiLFwiMjBcIl0sW1wiQmFrZWQgYmxvYXRmbHlcIixcIjQwXCIsXCIwXCIsXCIwLjVcIixcIjE1XCJdLFtcIkRlYXRoY2xhdyBFZ2cgb21lbGV0dGVcIixcIjExNVwiLFwiMFwiLFwiMC4xXCIsXCI4MFwiXSxbXCJEZWF0aGNsYXcgU3RlYWtcIixcIjE4NVwiLFwiMFwiLFwiMVwiLFwiMTMwXCJdLFtcIkdyaWxsZWQgUmFkcm9hY2hcIixcIjMwXCIsXCIwXCIsXCIwLjVcIixcIjdcIl0sW1wiSGFwcHkgQmlydGhkYXkgU3dlZXRyb2xsXCIsXCIyMFwiLFwiNFwiLFwiMFwiLFwiMFwiXSxbXCJJZ3VhbmEgb24gYSBzdGlja1wiLFwiNDBcIixcIjBcIixcIjAuMVwiLFwiMzNcIl0sW1wiTWlyZWx1cmsgY2FrZVwiLFwiMTQwXCIsXCIwXCIsXCIwLjFcIixcIjM1XCJdLFtcIk1vbGUgcmF0IGNodW5rc1wiLFwiNTBcIixcIjBcIixcIjAuNVwiLFwiOFwiXSxbXCJSYWRzY29wcmlhbiBzdGVha1wiLFwiMTUwXCIsXCIwXCIsXCIxXCIsXCI2NVwiXSxbXCJOb29kbGUgY3VwXCIsXCIyMFwiLFwiMFwiLFwiMC41XCIsXCIxMFwiXV0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0XCIwLjIwXCI6IFwiMzlcIixcblx0XCIwLjIxXCI6IFwiNDFcIixcblx0XCIwLjIyXCI6IFwiNDFcIixcblx0XCIwLjIzXCI6IFwiNDFcIixcblx0XCIwLjI0XCI6IFwiNDFcIixcblx0XCIwLjI1XCI6IFwiNDJcIixcblx0XCIwLjI2XCI6IFwiNDJcIixcblx0XCIwLjI3XCI6IFwiNDNcIixcblx0XCIwLjI4XCI6IFwiNDNcIixcblx0XCIwLjI5XCI6IFwiNDNcIixcblx0XCIwLjMwXCI6IFwiNDRcIixcblx0XCIwLjMxXCI6IFwiNDVcIixcblx0XCIwLjMyXCI6IFwiNDVcIixcblx0XCIwLjMzXCI6IFwiNDVcIixcblx0XCIwLjM0XCI6IFwiNDVcIixcblx0XCIwLjM1XCI6IFwiNDVcIixcblx0XCIwLjM2XCI6IFwiNDdcIixcblx0XCIwLjM3XCI6IFwiNDlcIixcblx0XCIxLjBcIjogXCI0OVwiLFxuXHRcIjEuMVwiOiBcIjUwXCIsXG5cdFwiMS4yXCI6IFwiNTFcIixcblx0XCIxLjNcIjogXCI1MlwiLFxuXHRcIjEuNFwiOiBcIjUzXCIsXG5cdFwiMS41XCI6IFwiNTRcIixcblx0XCIxLjZcIjogXCI1NlwiLFxuXHRcIjEuN1wiOiBcIjU4XCIsXG5cdFwiMS44XCI6IFwiNTlcIixcblx0XCIyLjBcIjogXCI2MVwiLFxuXHRcIjIuMVwiOiBcIjYxXCIsXG5cdFwiMy4wXCI6IFwiNjZcIixcblx0XCIzLjFcIjogXCI2NlwiLFxuXHRcIjQuMFwiOiBcIjY5XCIsXG5cdFwiNC4xXCI6IFwiNjlcIixcblx0XCI0LjJcIjogXCI2OVwiLFxuXHRcIjUuMFwiOiBcIjczXCIsXG5cdFwiNi4wXCI6IFwiNzZcIixcblx0XCI2LjFcIjogXCI3NlwiLFxuXHRcIjcuMFwiOiBcIjc4XCIsXG5cdFwiNy4xXCI6IFwiNzhcIixcblx0XCI3LjJcIjogXCI3OFwiLFxuXHRcIjcuM1wiOiBcIjc4XCIsXG5cdFwiOC4wXCI6IFwiODBcIixcblx0XCI4LjFcIjogXCI4MFwiLFxuXHRcIjguMlwiOiBcIjgwXCIsXG5cdFwiOC4zXCI6IFwiODBcIixcblx0XCI4LjRcIjogXCI4MFwiLFxuXHRcIjguNVwiOiBcIjgwXCIsXG5cdFwiOS4wXCI6IFwiODNcIixcblx0XCI5LjFcIjogXCI4M1wiLFxuXHRcIjkuMlwiOiBcIjgzXCIsXG5cdFwiOS4zXCI6IFwiODNcIixcblx0XCI5LjRcIjogXCI4M1wiLFxuXHRcIjEwLjBcIjogXCI4NVwiLFxuXHRcIjEwLjFcIjogXCI4NVwiLFxuXHRcIjEwLjJcIjogXCI4NVwiLFxuXHRcIjEwLjNcIjogXCI4NVwiLFxuXHRcIjEwLjRcIjogXCI4NVwiLFxuXHRcIjExLjBcIjogXCI4N1wiLFxuXHRcIjExLjFcIjogXCI4N1wiLFxuXHRcIjExLjJcIjogXCI4N1wiLFxuXHRcIjExLjNcIjogXCI4N1wiLFxuXHRcIjExLjRcIjogXCI4N1wiLFxuXHRcIjExLjVcIjogXCI4N1wiLFxuXHRcIjEyLjBcIjogXCI4OVwiLFxuXHRcIjEyLjFcIjogXCI4OVwiLFxuXHRcIjEyLjJcIjogXCI4OVwiLFxuXHRcIjEzLjBcIjogXCI5MVwiLFxuXHRcIjEzLjFcIjogXCI5MVwiLFxuXHRcIjEzLjJcIjogXCI5MVwiLFxuXHRcIjEzLjNcIjogXCI5MVwiLFxuXHRcIjEzLjRcIjogXCI5MVwiLFxuXHRcIjEzLjVcIjogXCI5MVwiLFxuXHRcIjEzLjZcIjogXCI5MVwiLFxuXHRcIjE0LjBcIjogXCI5M1wiLFxuXHRcIjE0LjFcIjogXCI5M1wiLFxuXHRcIjE0LjJcIjogXCI5M1wiLFxuXHRcIjE1LjBcIjogXCI5NFwiLFxuXHRcIjE1LjFcIjogXCI5NFwiLFxuXHRcIjE1LjJcIjogXCI5NFwiLFxuXHRcIjE1LjNcIjogXCI5NFwiLFxuXHRcIjE1LjRcIjogXCI5NFwiLFxuXHRcIjE1LjVcIjogXCI5NFwiLFxuXHRcIjE2LjBcIjogXCI5NlwiLFxuXHRcIjE2LjFcIjogXCI5NlwiLFxuXHRcIjE2LjJcIjogXCI5NlwiLFxuXHRcIjE3LjBcIjogXCI5OFwiLFxuXHRcIjE3LjFcIjogXCI5OFwiLFxuXHRcIjE3LjJcIjogXCI5OFwiLFxuXHRcIjE3LjNcIjogXCI5OFwiLFxuXHRcIjE3LjRcIjogXCI5OFwiLFxuXHRcIjE4LjBcIjogXCIxMDBcIixcblx0XCIxOC4xXCI6IFwiMTAwXCIsXG5cdFwiMTguMlwiOiBcIjEwMFwiLFxuXHRcIjE4LjNcIjogXCIxMDBcIixcblx0XCIxOS4wXCI6IFwiMTAyXCIsXG5cdFwiMTkuMVwiOiBcIjEwMlwiLFxuXHRcIjIwLjBcIjogXCIxMDRcIixcblx0XCIyMC4xXCI6IFwiMTA0XCIsXG5cdFwiMjAuMlwiOiBcIjEwNFwiLFxuXHRcIjIwLjNcIjogXCIxMDRcIixcblx0XCIyMS4wXCI6IFwiMTA2XCIsXG5cdFwiMjEuMVwiOiBcIjEwNlwiLFxuXHRcIjIyLjBcIjogXCIxMDhcIlxufTsiLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludCBuby1pbnZhbGlkLXRoaXM6IDEgKi9cblxudmFyIEVSUk9SX01FU1NBR0UgPSAnRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgY2FsbGVkIG9uIGluY29tcGF0aWJsZSAnO1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciBmdW5jVHlwZSA9ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYmluZCh0aGF0KSB7XG4gICAgdmFyIHRhcmdldCA9IHRoaXM7XG4gICAgaWYgKHR5cGVvZiB0YXJnZXQgIT09ICdmdW5jdGlvbicgfHwgdG9TdHIuY2FsbCh0YXJnZXQpICE9PSBmdW5jVHlwZSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEVSUk9SX01FU1NBR0UgKyB0YXJnZXQpO1xuICAgIH1cbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgIHZhciBib3VuZDtcbiAgICB2YXIgYmluZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcyBpbnN0YW5jZW9mIGJvdW5kKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gdGFyZ2V0LmFwcGx5KFxuICAgICAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICAgICAgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmIChPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldC5hcHBseShcbiAgICAgICAgICAgICAgICB0aGF0LFxuICAgICAgICAgICAgICAgIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGJvdW5kTGVuZ3RoID0gTWF0aC5tYXgoMCwgdGFyZ2V0Lmxlbmd0aCAtIGFyZ3MubGVuZ3RoKTtcbiAgICB2YXIgYm91bmRBcmdzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib3VuZExlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJvdW5kQXJncy5wdXNoKCckJyArIGkpO1xuICAgIH1cblxuICAgIGJvdW5kID0gRnVuY3Rpb24oJ2JpbmRlcicsICdyZXR1cm4gZnVuY3Rpb24gKCcgKyBib3VuZEFyZ3Muam9pbignLCcpICsgJyl7IHJldHVybiBiaW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpOyB9JykoYmluZGVyKTtcblxuICAgIGlmICh0YXJnZXQucHJvdG90eXBlKSB7XG4gICAgICAgIHZhciBFbXB0eSA9IGZ1bmN0aW9uIEVtcHR5KCkge307XG4gICAgICAgIEVtcHR5LnByb3RvdHlwZSA9IHRhcmdldC5wcm90b3R5cGU7XG4gICAgICAgIGJvdW5kLnByb3RvdHlwZSA9IG5ldyBFbXB0eSgpO1xuICAgICAgICBFbXB0eS5wcm90b3R5cGUgPSBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBib3VuZDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbXBsZW1lbnRhdGlvbiA9IHJlcXVpcmUoJy4vaW1wbGVtZW50YXRpb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCB8fCBpbXBsZW1lbnRhdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHVuZGVmaW5lZDtcblxudmFyICRTeW50YXhFcnJvciA9IFN5bnRheEVycm9yO1xudmFyICRGdW5jdGlvbiA9IEZ1bmN0aW9uO1xudmFyICRUeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb25zaXN0ZW50LXJldHVyblxudmFyIGdldEV2YWxsZWRDb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIChleHByZXNzaW9uU3ludGF4KSB7XG5cdHRyeSB7XG5cdFx0cmV0dXJuICRGdW5jdGlvbignXCJ1c2Ugc3RyaWN0XCI7IHJldHVybiAoJyArIGV4cHJlc3Npb25TeW50YXggKyAnKS5jb25zdHJ1Y3RvcjsnKSgpO1xuXHR9IGNhdGNoIChlKSB7fVxufTtcblxudmFyICRnT1BEID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbmlmICgkZ09QRCkge1xuXHR0cnkge1xuXHRcdCRnT1BEKHt9LCAnJyk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHQkZ09QRCA9IG51bGw7IC8vIHRoaXMgaXMgSUUgOCwgd2hpY2ggaGFzIGEgYnJva2VuIGdPUERcblx0fVxufVxuXG52YXIgdGhyb3dUeXBlRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdHRocm93IG5ldyAkVHlwZUVycm9yKCk7XG59O1xudmFyIFRocm93VHlwZUVycm9yID0gJGdPUERcblx0PyAoZnVuY3Rpb24gKCkge1xuXHRcdHRyeSB7XG5cdFx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLWV4cHJlc3Npb25zLCBuby1jYWxsZXIsIG5vLXJlc3RyaWN0ZWQtcHJvcGVydGllc1xuXHRcdFx0YXJndW1lbnRzLmNhbGxlZTsgLy8gSUUgOCBkb2VzIG5vdCB0aHJvdyBoZXJlXG5cdFx0XHRyZXR1cm4gdGhyb3dUeXBlRXJyb3I7XG5cdFx0fSBjYXRjaCAoY2FsbGVlVGhyb3dzKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHQvLyBJRSA4IHRocm93cyBvbiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGFyZ3VtZW50cywgJycpXG5cdFx0XHRcdHJldHVybiAkZ09QRChhcmd1bWVudHMsICdjYWxsZWUnKS5nZXQ7XG5cdFx0XHR9IGNhdGNoIChnT1BEdGhyb3dzKSB7XG5cdFx0XHRcdHJldHVybiB0aHJvd1R5cGVFcnJvcjtcblx0XHRcdH1cblx0XHR9XG5cdH0oKSlcblx0OiB0aHJvd1R5cGVFcnJvcjtcblxudmFyIGhhc1N5bWJvbHMgPSByZXF1aXJlKCdoYXMtc3ltYm9scycpKCk7XG5cbnZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiAoeCkgeyByZXR1cm4geC5fX3Byb3RvX187IH07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcHJvdG9cblxudmFyIG5lZWRzRXZhbCA9IHt9O1xuXG52YXIgVHlwZWRBcnJheSA9IHR5cGVvZiBVaW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IGdldFByb3RvKFVpbnQ4QXJyYXkpO1xuXG52YXIgSU5UUklOU0lDUyA9IHtcblx0JyVBZ2dyZWdhdGVFcnJvciUnOiB0eXBlb2YgQWdncmVnYXRlRXJyb3IgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogQWdncmVnYXRlRXJyb3IsXG5cdCclQXJyYXklJzogQXJyYXksXG5cdCclQXJyYXlCdWZmZXIlJzogdHlwZW9mIEFycmF5QnVmZmVyID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEFycmF5QnVmZmVyLFxuXHQnJUFycmF5SXRlcmF0b3JQcm90b3R5cGUlJzogaGFzU3ltYm9scyA/IGdldFByb3RvKFtdW1N5bWJvbC5pdGVyYXRvcl0oKSkgOiB1bmRlZmluZWQsXG5cdCclQXN5bmNGcm9tU3luY0l0ZXJhdG9yUHJvdG90eXBlJSc6IHVuZGVmaW5lZCxcblx0JyVBc3luY0Z1bmN0aW9uJSc6IG5lZWRzRXZhbCxcblx0JyVBc3luY0dlbmVyYXRvciUnOiBuZWVkc0V2YWwsXG5cdCclQXN5bmNHZW5lcmF0b3JGdW5jdGlvbiUnOiBuZWVkc0V2YWwsXG5cdCclQXN5bmNJdGVyYXRvclByb3RvdHlwZSUnOiBuZWVkc0V2YWwsXG5cdCclQXRvbWljcyUnOiB0eXBlb2YgQXRvbWljcyA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBBdG9taWNzLFxuXHQnJUJpZ0ludCUnOiB0eXBlb2YgQmlnSW50ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEJpZ0ludCxcblx0JyVCb29sZWFuJSc6IEJvb2xlYW4sXG5cdCclRGF0YVZpZXclJzogdHlwZW9mIERhdGFWaWV3ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IERhdGFWaWV3LFxuXHQnJURhdGUlJzogRGF0ZSxcblx0JyVkZWNvZGVVUkklJzogZGVjb2RlVVJJLFxuXHQnJWRlY29kZVVSSUNvbXBvbmVudCUnOiBkZWNvZGVVUklDb21wb25lbnQsXG5cdCclZW5jb2RlVVJJJSc6IGVuY29kZVVSSSxcblx0JyVlbmNvZGVVUklDb21wb25lbnQlJzogZW5jb2RlVVJJQ29tcG9uZW50LFxuXHQnJUVycm9yJSc6IEVycm9yLFxuXHQnJWV2YWwlJzogZXZhbCwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1ldmFsXG5cdCclRXZhbEVycm9yJSc6IEV2YWxFcnJvcixcblx0JyVGbG9hdDMyQXJyYXklJzogdHlwZW9mIEZsb2F0MzJBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBGbG9hdDMyQXJyYXksXG5cdCclRmxvYXQ2NEFycmF5JSc6IHR5cGVvZiBGbG9hdDY0QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogRmxvYXQ2NEFycmF5LFxuXHQnJUZpbmFsaXphdGlvblJlZ2lzdHJ5JSc6IHR5cGVvZiBGaW5hbGl6YXRpb25SZWdpc3RyeSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBGaW5hbGl6YXRpb25SZWdpc3RyeSxcblx0JyVGdW5jdGlvbiUnOiAkRnVuY3Rpb24sXG5cdCclR2VuZXJhdG9yRnVuY3Rpb24lJzogbmVlZHNFdmFsLFxuXHQnJUludDhBcnJheSUnOiB0eXBlb2YgSW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEludDhBcnJheSxcblx0JyVJbnQxNkFycmF5JSc6IHR5cGVvZiBJbnQxNkFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEludDE2QXJyYXksXG5cdCclSW50MzJBcnJheSUnOiB0eXBlb2YgSW50MzJBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBJbnQzMkFycmF5LFxuXHQnJWlzRmluaXRlJSc6IGlzRmluaXRlLFxuXHQnJWlzTmFOJSc6IGlzTmFOLFxuXHQnJUl0ZXJhdG9yUHJvdG90eXBlJSc6IGhhc1N5bWJvbHMgPyBnZXRQcm90byhnZXRQcm90byhbXVtTeW1ib2wuaXRlcmF0b3JdKCkpKSA6IHVuZGVmaW5lZCxcblx0JyVKU09OJSc6IHR5cGVvZiBKU09OID09PSAnb2JqZWN0JyA/IEpTT04gOiB1bmRlZmluZWQsXG5cdCclTWFwJSc6IHR5cGVvZiBNYXAgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogTWFwLFxuXHQnJU1hcEl0ZXJhdG9yUHJvdG90eXBlJSc6IHR5cGVvZiBNYXAgPT09ICd1bmRlZmluZWQnIHx8ICFoYXNTeW1ib2xzID8gdW5kZWZpbmVkIDogZ2V0UHJvdG8obmV3IE1hcCgpW1N5bWJvbC5pdGVyYXRvcl0oKSksXG5cdCclTWF0aCUnOiBNYXRoLFxuXHQnJU51bWJlciUnOiBOdW1iZXIsXG5cdCclT2JqZWN0JSc6IE9iamVjdCxcblx0JyVwYXJzZUZsb2F0JSc6IHBhcnNlRmxvYXQsXG5cdCclcGFyc2VJbnQlJzogcGFyc2VJbnQsXG5cdCclUHJvbWlzZSUnOiB0eXBlb2YgUHJvbWlzZSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBQcm9taXNlLFxuXHQnJVByb3h5JSc6IHR5cGVvZiBQcm94eSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBQcm94eSxcblx0JyVSYW5nZUVycm9yJSc6IFJhbmdlRXJyb3IsXG5cdCclUmVmZXJlbmNlRXJyb3IlJzogUmVmZXJlbmNlRXJyb3IsXG5cdCclUmVmbGVjdCUnOiB0eXBlb2YgUmVmbGVjdCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBSZWZsZWN0LFxuXHQnJVJlZ0V4cCUnOiBSZWdFeHAsXG5cdCclU2V0JSc6IHR5cGVvZiBTZXQgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogU2V0LFxuXHQnJVNldEl0ZXJhdG9yUHJvdG90eXBlJSc6IHR5cGVvZiBTZXQgPT09ICd1bmRlZmluZWQnIHx8ICFoYXNTeW1ib2xzID8gdW5kZWZpbmVkIDogZ2V0UHJvdG8obmV3IFNldCgpW1N5bWJvbC5pdGVyYXRvcl0oKSksXG5cdCclU2hhcmVkQXJyYXlCdWZmZXIlJzogdHlwZW9mIFNoYXJlZEFycmF5QnVmZmVyID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFNoYXJlZEFycmF5QnVmZmVyLFxuXHQnJVN0cmluZyUnOiBTdHJpbmcsXG5cdCclU3RyaW5nSXRlcmF0b3JQcm90b3R5cGUlJzogaGFzU3ltYm9scyA/IGdldFByb3RvKCcnW1N5bWJvbC5pdGVyYXRvcl0oKSkgOiB1bmRlZmluZWQsXG5cdCclU3ltYm9sJSc6IGhhc1N5bWJvbHMgPyBTeW1ib2wgOiB1bmRlZmluZWQsXG5cdCclU3ludGF4RXJyb3IlJzogJFN5bnRheEVycm9yLFxuXHQnJVRocm93VHlwZUVycm9yJSc6IFRocm93VHlwZUVycm9yLFxuXHQnJVR5cGVkQXJyYXklJzogVHlwZWRBcnJheSxcblx0JyVUeXBlRXJyb3IlJzogJFR5cGVFcnJvcixcblx0JyVVaW50OEFycmF5JSc6IHR5cGVvZiBVaW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQ4QXJyYXksXG5cdCclVWludDhDbGFtcGVkQXJyYXklJzogdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQ4Q2xhbXBlZEFycmF5LFxuXHQnJVVpbnQxNkFycmF5JSc6IHR5cGVvZiBVaW50MTZBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50MTZBcnJheSxcblx0JyVVaW50MzJBcnJheSUnOiB0eXBlb2YgVWludDMyQXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogVWludDMyQXJyYXksXG5cdCclVVJJRXJyb3IlJzogVVJJRXJyb3IsXG5cdCclV2Vha01hcCUnOiB0eXBlb2YgV2Vha01hcCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBXZWFrTWFwLFxuXHQnJVdlYWtSZWYlJzogdHlwZW9mIFdlYWtSZWYgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogV2Vha1JlZixcblx0JyVXZWFrU2V0JSc6IHR5cGVvZiBXZWFrU2V0ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFdlYWtTZXRcbn07XG5cbnZhciBkb0V2YWwgPSBmdW5jdGlvbiBkb0V2YWwobmFtZSkge1xuXHR2YXIgdmFsdWU7XG5cdGlmIChuYW1lID09PSAnJUFzeW5jRnVuY3Rpb24lJykge1xuXHRcdHZhbHVlID0gZ2V0RXZhbGxlZENvbnN0cnVjdG9yKCdhc3luYyBmdW5jdGlvbiAoKSB7fScpO1xuXHR9IGVsc2UgaWYgKG5hbWUgPT09ICclR2VuZXJhdG9yRnVuY3Rpb24lJykge1xuXHRcdHZhbHVlID0gZ2V0RXZhbGxlZENvbnN0cnVjdG9yKCdmdW5jdGlvbiogKCkge30nKTtcblx0fSBlbHNlIGlmIChuYW1lID09PSAnJUFzeW5jR2VuZXJhdG9yRnVuY3Rpb24lJykge1xuXHRcdHZhbHVlID0gZ2V0RXZhbGxlZENvbnN0cnVjdG9yKCdhc3luYyBmdW5jdGlvbiogKCkge30nKTtcblx0fSBlbHNlIGlmIChuYW1lID09PSAnJUFzeW5jR2VuZXJhdG9yJScpIHtcblx0XHR2YXIgZm4gPSBkb0V2YWwoJyVBc3luY0dlbmVyYXRvckZ1bmN0aW9uJScpO1xuXHRcdGlmIChmbikge1xuXHRcdFx0dmFsdWUgPSBmbi5wcm90b3R5cGU7XG5cdFx0fVxuXHR9IGVsc2UgaWYgKG5hbWUgPT09ICclQXN5bmNJdGVyYXRvclByb3RvdHlwZSUnKSB7XG5cdFx0dmFyIGdlbiA9IGRvRXZhbCgnJUFzeW5jR2VuZXJhdG9yJScpO1xuXHRcdGlmIChnZW4pIHtcblx0XHRcdHZhbHVlID0gZ2V0UHJvdG8oZ2VuLnByb3RvdHlwZSk7XG5cdFx0fVxuXHR9XG5cblx0SU5UUklOU0lDU1tuYW1lXSA9IHZhbHVlO1xuXG5cdHJldHVybiB2YWx1ZTtcbn07XG5cbnZhciBMRUdBQ1lfQUxJQVNFUyA9IHtcblx0JyVBcnJheUJ1ZmZlclByb3RvdHlwZSUnOiBbJ0FycmF5QnVmZmVyJywgJ3Byb3RvdHlwZSddLFxuXHQnJUFycmF5UHJvdG90eXBlJSc6IFsnQXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclQXJyYXlQcm90b19lbnRyaWVzJSc6IFsnQXJyYXknLCAncHJvdG90eXBlJywgJ2VudHJpZXMnXSxcblx0JyVBcnJheVByb3RvX2ZvckVhY2glJzogWydBcnJheScsICdwcm90b3R5cGUnLCAnZm9yRWFjaCddLFxuXHQnJUFycmF5UHJvdG9fa2V5cyUnOiBbJ0FycmF5JywgJ3Byb3RvdHlwZScsICdrZXlzJ10sXG5cdCclQXJyYXlQcm90b192YWx1ZXMlJzogWydBcnJheScsICdwcm90b3R5cGUnLCAndmFsdWVzJ10sXG5cdCclQXN5bmNGdW5jdGlvblByb3RvdHlwZSUnOiBbJ0FzeW5jRnVuY3Rpb24nLCAncHJvdG90eXBlJ10sXG5cdCclQXN5bmNHZW5lcmF0b3IlJzogWydBc3luY0dlbmVyYXRvckZ1bmN0aW9uJywgJ3Byb3RvdHlwZSddLFxuXHQnJUFzeW5jR2VuZXJhdG9yUHJvdG90eXBlJSc6IFsnQXN5bmNHZW5lcmF0b3JGdW5jdGlvbicsICdwcm90b3R5cGUnLCAncHJvdG90eXBlJ10sXG5cdCclQm9vbGVhblByb3RvdHlwZSUnOiBbJ0Jvb2xlYW4nLCAncHJvdG90eXBlJ10sXG5cdCclRGF0YVZpZXdQcm90b3R5cGUlJzogWydEYXRhVmlldycsICdwcm90b3R5cGUnXSxcblx0JyVEYXRlUHJvdG90eXBlJSc6IFsnRGF0ZScsICdwcm90b3R5cGUnXSxcblx0JyVFcnJvclByb3RvdHlwZSUnOiBbJ0Vycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJUV2YWxFcnJvclByb3RvdHlwZSUnOiBbJ0V2YWxFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVGbG9hdDMyQXJyYXlQcm90b3R5cGUlJzogWydGbG9hdDMyQXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclRmxvYXQ2NEFycmF5UHJvdG90eXBlJSc6IFsnRmxvYXQ2NEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJUZ1bmN0aW9uUHJvdG90eXBlJSc6IFsnRnVuY3Rpb24nLCAncHJvdG90eXBlJ10sXG5cdCclR2VuZXJhdG9yJSc6IFsnR2VuZXJhdG9yRnVuY3Rpb24nLCAncHJvdG90eXBlJ10sXG5cdCclR2VuZXJhdG9yUHJvdG90eXBlJSc6IFsnR2VuZXJhdG9yRnVuY3Rpb24nLCAncHJvdG90eXBlJywgJ3Byb3RvdHlwZSddLFxuXHQnJUludDhBcnJheVByb3RvdHlwZSUnOiBbJ0ludDhBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVJbnQxNkFycmF5UHJvdG90eXBlJSc6IFsnSW50MTZBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVJbnQzMkFycmF5UHJvdG90eXBlJSc6IFsnSW50MzJBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVKU09OUGFyc2UlJzogWydKU09OJywgJ3BhcnNlJ10sXG5cdCclSlNPTlN0cmluZ2lmeSUnOiBbJ0pTT04nLCAnc3RyaW5naWZ5J10sXG5cdCclTWFwUHJvdG90eXBlJSc6IFsnTWFwJywgJ3Byb3RvdHlwZSddLFxuXHQnJU51bWJlclByb3RvdHlwZSUnOiBbJ051bWJlcicsICdwcm90b3R5cGUnXSxcblx0JyVPYmplY3RQcm90b3R5cGUlJzogWydPYmplY3QnLCAncHJvdG90eXBlJ10sXG5cdCclT2JqUHJvdG9fdG9TdHJpbmclJzogWydPYmplY3QnLCAncHJvdG90eXBlJywgJ3RvU3RyaW5nJ10sXG5cdCclT2JqUHJvdG9fdmFsdWVPZiUnOiBbJ09iamVjdCcsICdwcm90b3R5cGUnLCAndmFsdWVPZiddLFxuXHQnJVByb21pc2VQcm90b3R5cGUlJzogWydQcm9taXNlJywgJ3Byb3RvdHlwZSddLFxuXHQnJVByb21pc2VQcm90b190aGVuJSc6IFsnUHJvbWlzZScsICdwcm90b3R5cGUnLCAndGhlbiddLFxuXHQnJVByb21pc2VfYWxsJSc6IFsnUHJvbWlzZScsICdhbGwnXSxcblx0JyVQcm9taXNlX3JlamVjdCUnOiBbJ1Byb21pc2UnLCAncmVqZWN0J10sXG5cdCclUHJvbWlzZV9yZXNvbHZlJSc6IFsnUHJvbWlzZScsICdyZXNvbHZlJ10sXG5cdCclUmFuZ2VFcnJvclByb3RvdHlwZSUnOiBbJ1JhbmdlRXJyb3InLCAncHJvdG90eXBlJ10sXG5cdCclUmVmZXJlbmNlRXJyb3JQcm90b3R5cGUlJzogWydSZWZlcmVuY2VFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVSZWdFeHBQcm90b3R5cGUlJzogWydSZWdFeHAnLCAncHJvdG90eXBlJ10sXG5cdCclU2V0UHJvdG90eXBlJSc6IFsnU2V0JywgJ3Byb3RvdHlwZSddLFxuXHQnJVNoYXJlZEFycmF5QnVmZmVyUHJvdG90eXBlJSc6IFsnU2hhcmVkQXJyYXlCdWZmZXInLCAncHJvdG90eXBlJ10sXG5cdCclU3RyaW5nUHJvdG90eXBlJSc6IFsnU3RyaW5nJywgJ3Byb3RvdHlwZSddLFxuXHQnJVN5bWJvbFByb3RvdHlwZSUnOiBbJ1N5bWJvbCcsICdwcm90b3R5cGUnXSxcblx0JyVTeW50YXhFcnJvclByb3RvdHlwZSUnOiBbJ1N5bnRheEVycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJVR5cGVkQXJyYXlQcm90b3R5cGUlJzogWydUeXBlZEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJVR5cGVFcnJvclByb3RvdHlwZSUnOiBbJ1R5cGVFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVVaW50OEFycmF5UHJvdG90eXBlJSc6IFsnVWludDhBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVVaW50OENsYW1wZWRBcnJheVByb3RvdHlwZSUnOiBbJ1VpbnQ4Q2xhbXBlZEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJVVpbnQxNkFycmF5UHJvdG90eXBlJSc6IFsnVWludDE2QXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclVWludDMyQXJyYXlQcm90b3R5cGUlJzogWydVaW50MzJBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVVUklFcnJvclByb3RvdHlwZSUnOiBbJ1VSSUVycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJVdlYWtNYXBQcm90b3R5cGUlJzogWydXZWFrTWFwJywgJ3Byb3RvdHlwZSddLFxuXHQnJVdlYWtTZXRQcm90b3R5cGUlJzogWydXZWFrU2V0JywgJ3Byb3RvdHlwZSddXG59O1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJ2Z1bmN0aW9uLWJpbmQnKTtcbnZhciBoYXNPd24gPSByZXF1aXJlKCdoYXMnKTtcbnZhciAkY29uY2F0ID0gYmluZC5jYWxsKEZ1bmN0aW9uLmNhbGwsIEFycmF5LnByb3RvdHlwZS5jb25jYXQpO1xudmFyICRzcGxpY2VBcHBseSA9IGJpbmQuY2FsbChGdW5jdGlvbi5hcHBseSwgQXJyYXkucHJvdG90eXBlLnNwbGljZSk7XG52YXIgJHJlcGxhY2UgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlKTtcbnZhciAkc3RyU2xpY2UgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgU3RyaW5nLnByb3RvdHlwZS5zbGljZSk7XG52YXIgJGV4ZWMgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgUmVnRXhwLnByb3RvdHlwZS5leGVjKTtcblxuLyogYWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9sb2Rhc2gvbG9kYXNoL2Jsb2IvNC4xNy4xNS9kaXN0L2xvZGFzaC5qcyNMNjczNS1MNjc0NCAqL1xudmFyIHJlUHJvcE5hbWUgPSAvW14lLltcXF1dK3xcXFsoPzooLT9cXGQrKD86XFwuXFxkKyk/KXwoW1wiJ10pKCg/Oig/IVxcMilbXlxcXFxdfFxcXFwuKSo/KVxcMilcXF18KD89KD86XFwufFxcW1xcXSkoPzpcXC58XFxbXFxdfCUkKSkvZztcbnZhciByZUVzY2FwZUNoYXIgPSAvXFxcXChcXFxcKT8vZzsgLyoqIFVzZWQgdG8gbWF0Y2ggYmFja3NsYXNoZXMgaW4gcHJvcGVydHkgcGF0aHMuICovXG52YXIgc3RyaW5nVG9QYXRoID0gZnVuY3Rpb24gc3RyaW5nVG9QYXRoKHN0cmluZykge1xuXHR2YXIgZmlyc3QgPSAkc3RyU2xpY2Uoc3RyaW5nLCAwLCAxKTtcblx0dmFyIGxhc3QgPSAkc3RyU2xpY2Uoc3RyaW5nLCAtMSk7XG5cdGlmIChmaXJzdCA9PT0gJyUnICYmIGxhc3QgIT09ICclJykge1xuXHRcdHRocm93IG5ldyAkU3ludGF4RXJyb3IoJ2ludmFsaWQgaW50cmluc2ljIHN5bnRheCwgZXhwZWN0ZWQgY2xvc2luZyBgJWAnKTtcblx0fSBlbHNlIGlmIChsYXN0ID09PSAnJScgJiYgZmlyc3QgIT09ICclJykge1xuXHRcdHRocm93IG5ldyAkU3ludGF4RXJyb3IoJ2ludmFsaWQgaW50cmluc2ljIHN5bnRheCwgZXhwZWN0ZWQgb3BlbmluZyBgJWAnKTtcblx0fVxuXHR2YXIgcmVzdWx0ID0gW107XG5cdCRyZXBsYWNlKHN0cmluZywgcmVQcm9wTmFtZSwgZnVuY3Rpb24gKG1hdGNoLCBudW1iZXIsIHF1b3RlLCBzdWJTdHJpbmcpIHtcblx0XHRyZXN1bHRbcmVzdWx0Lmxlbmd0aF0gPSBxdW90ZSA/ICRyZXBsYWNlKHN1YlN0cmluZywgcmVFc2NhcGVDaGFyLCAnJDEnKSA6IG51bWJlciB8fCBtYXRjaDtcblx0fSk7XG5cdHJldHVybiByZXN1bHQ7XG59O1xuLyogZW5kIGFkYXB0YXRpb24gKi9cblxudmFyIGdldEJhc2VJbnRyaW5zaWMgPSBmdW5jdGlvbiBnZXRCYXNlSW50cmluc2ljKG5hbWUsIGFsbG93TWlzc2luZykge1xuXHR2YXIgaW50cmluc2ljTmFtZSA9IG5hbWU7XG5cdHZhciBhbGlhcztcblx0aWYgKGhhc093bihMRUdBQ1lfQUxJQVNFUywgaW50cmluc2ljTmFtZSkpIHtcblx0XHRhbGlhcyA9IExFR0FDWV9BTElBU0VTW2ludHJpbnNpY05hbWVdO1xuXHRcdGludHJpbnNpY05hbWUgPSAnJScgKyBhbGlhc1swXSArICclJztcblx0fVxuXG5cdGlmIChoYXNPd24oSU5UUklOU0lDUywgaW50cmluc2ljTmFtZSkpIHtcblx0XHR2YXIgdmFsdWUgPSBJTlRSSU5TSUNTW2ludHJpbnNpY05hbWVdO1xuXHRcdGlmICh2YWx1ZSA9PT0gbmVlZHNFdmFsKSB7XG5cdFx0XHR2YWx1ZSA9IGRvRXZhbChpbnRyaW5zaWNOYW1lKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgJiYgIWFsbG93TWlzc2luZykge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2ludHJpbnNpYyAnICsgbmFtZSArICcgZXhpc3RzLCBidXQgaXMgbm90IGF2YWlsYWJsZS4gUGxlYXNlIGZpbGUgYW4gaXNzdWUhJyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGFsaWFzOiBhbGlhcyxcblx0XHRcdG5hbWU6IGludHJpbnNpY05hbWUsXG5cdFx0XHR2YWx1ZTogdmFsdWVcblx0XHR9O1xuXHR9XG5cblx0dGhyb3cgbmV3ICRTeW50YXhFcnJvcignaW50cmluc2ljICcgKyBuYW1lICsgJyBkb2VzIG5vdCBleGlzdCEnKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gR2V0SW50cmluc2ljKG5hbWUsIGFsbG93TWlzc2luZykge1xuXHRpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnIHx8IG5hbWUubGVuZ3RoID09PSAwKSB7XG5cdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2ludHJpbnNpYyBuYW1lIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nJyk7XG5cdH1cblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIHR5cGVvZiBhbGxvd01pc3NpbmcgIT09ICdib29sZWFuJykge1xuXHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdcImFsbG93TWlzc2luZ1wiIGFyZ3VtZW50IG11c3QgYmUgYSBib29sZWFuJyk7XG5cdH1cblxuXHRpZiAoJGV4ZWMoL14lP1teJV0qJT8kLywgbmFtZSkgPT09IG51bGwpIHtcblx0XHR0aHJvdyBuZXcgJFN5bnRheEVycm9yKCdgJWAgbWF5IG5vdCBiZSBwcmVzZW50IGFueXdoZXJlIGJ1dCBhdCB0aGUgYmVnaW5uaW5nIGFuZCBlbmQgb2YgdGhlIGludHJpbnNpYyBuYW1lJyk7XG5cdH1cblx0dmFyIHBhcnRzID0gc3RyaW5nVG9QYXRoKG5hbWUpO1xuXHR2YXIgaW50cmluc2ljQmFzZU5hbWUgPSBwYXJ0cy5sZW5ndGggPiAwID8gcGFydHNbMF0gOiAnJztcblxuXHR2YXIgaW50cmluc2ljID0gZ2V0QmFzZUludHJpbnNpYygnJScgKyBpbnRyaW5zaWNCYXNlTmFtZSArICclJywgYWxsb3dNaXNzaW5nKTtcblx0dmFyIGludHJpbnNpY1JlYWxOYW1lID0gaW50cmluc2ljLm5hbWU7XG5cdHZhciB2YWx1ZSA9IGludHJpbnNpYy52YWx1ZTtcblx0dmFyIHNraXBGdXJ0aGVyQ2FjaGluZyA9IGZhbHNlO1xuXG5cdHZhciBhbGlhcyA9IGludHJpbnNpYy5hbGlhcztcblx0aWYgKGFsaWFzKSB7XG5cdFx0aW50cmluc2ljQmFzZU5hbWUgPSBhbGlhc1swXTtcblx0XHQkc3BsaWNlQXBwbHkocGFydHMsICRjb25jYXQoWzAsIDFdLCBhbGlhcykpO1xuXHR9XG5cblx0Zm9yICh2YXIgaSA9IDEsIGlzT3duID0gdHJ1ZTsgaSA8IHBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0dmFyIHBhcnQgPSBwYXJ0c1tpXTtcblx0XHR2YXIgZmlyc3QgPSAkc3RyU2xpY2UocGFydCwgMCwgMSk7XG5cdFx0dmFyIGxhc3QgPSAkc3RyU2xpY2UocGFydCwgLTEpO1xuXHRcdGlmIChcblx0XHRcdChcblx0XHRcdFx0KGZpcnN0ID09PSAnXCInIHx8IGZpcnN0ID09PSBcIidcIiB8fCBmaXJzdCA9PT0gJ2AnKVxuXHRcdFx0XHR8fCAobGFzdCA9PT0gJ1wiJyB8fCBsYXN0ID09PSBcIidcIiB8fCBsYXN0ID09PSAnYCcpXG5cdFx0XHQpXG5cdFx0XHQmJiBmaXJzdCAhPT0gbGFzdFxuXHRcdCkge1xuXHRcdFx0dGhyb3cgbmV3ICRTeW50YXhFcnJvcigncHJvcGVydHkgbmFtZXMgd2l0aCBxdW90ZXMgbXVzdCBoYXZlIG1hdGNoaW5nIHF1b3RlcycpO1xuXHRcdH1cblx0XHRpZiAocGFydCA9PT0gJ2NvbnN0cnVjdG9yJyB8fCAhaXNPd24pIHtcblx0XHRcdHNraXBGdXJ0aGVyQ2FjaGluZyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0aW50cmluc2ljQmFzZU5hbWUgKz0gJy4nICsgcGFydDtcblx0XHRpbnRyaW5zaWNSZWFsTmFtZSA9ICclJyArIGludHJpbnNpY0Jhc2VOYW1lICsgJyUnO1xuXG5cdFx0aWYgKGhhc093bihJTlRSSU5TSUNTLCBpbnRyaW5zaWNSZWFsTmFtZSkpIHtcblx0XHRcdHZhbHVlID0gSU5UUklOU0lDU1tpbnRyaW5zaWNSZWFsTmFtZV07XG5cdFx0fSBlbHNlIGlmICh2YWx1ZSAhPSBudWxsKSB7XG5cdFx0XHRpZiAoIShwYXJ0IGluIHZhbHVlKSkge1xuXHRcdFx0XHRpZiAoIWFsbG93TWlzc2luZykge1xuXHRcdFx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdiYXNlIGludHJpbnNpYyBmb3IgJyArIG5hbWUgKyAnIGV4aXN0cywgYnV0IHRoZSBwcm9wZXJ0eSBpcyBub3QgYXZhaWxhYmxlLicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB2b2lkIHVuZGVmaW5lZDtcblx0XHRcdH1cblx0XHRcdGlmICgkZ09QRCAmJiAoaSArIDEpID49IHBhcnRzLmxlbmd0aCkge1xuXHRcdFx0XHR2YXIgZGVzYyA9ICRnT1BEKHZhbHVlLCBwYXJ0KTtcblx0XHRcdFx0aXNPd24gPSAhIWRlc2M7XG5cblx0XHRcdFx0Ly8gQnkgY29udmVudGlvbiwgd2hlbiBhIGRhdGEgcHJvcGVydHkgaXMgY29udmVydGVkIHRvIGFuIGFjY2Vzc29yXG5cdFx0XHRcdC8vIHByb3BlcnR5IHRvIGVtdWxhdGUgYSBkYXRhIHByb3BlcnR5IHRoYXQgZG9lcyBub3Qgc3VmZmVyIGZyb21cblx0XHRcdFx0Ly8gdGhlIG92ZXJyaWRlIG1pc3Rha2UsIHRoYXQgYWNjZXNzb3IncyBnZXR0ZXIgaXMgbWFya2VkIHdpdGhcblx0XHRcdFx0Ly8gYW4gYG9yaWdpbmFsVmFsdWVgIHByb3BlcnR5LiBIZXJlLCB3aGVuIHdlIGRldGVjdCB0aGlzLCB3ZVxuXHRcdFx0XHQvLyB1cGhvbGQgdGhlIGlsbHVzaW9uIGJ5IHByZXRlbmRpbmcgdG8gc2VlIHRoYXQgb3JpZ2luYWwgZGF0YVxuXHRcdFx0XHQvLyBwcm9wZXJ0eSwgaS5lLiwgcmV0dXJuaW5nIHRoZSB2YWx1ZSByYXRoZXIgdGhhbiB0aGUgZ2V0dGVyXG5cdFx0XHRcdC8vIGl0c2VsZi5cblx0XHRcdFx0aWYgKGlzT3duICYmICdnZXQnIGluIGRlc2MgJiYgISgnb3JpZ2luYWxWYWx1ZScgaW4gZGVzYy5nZXQpKSB7XG5cdFx0XHRcdFx0dmFsdWUgPSBkZXNjLmdldDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YWx1ZSA9IHZhbHVlW3BhcnRdO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpc093biA9IGhhc093bih2YWx1ZSwgcGFydCk7XG5cdFx0XHRcdHZhbHVlID0gdmFsdWVbcGFydF07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChpc093biAmJiAhc2tpcEZ1cnRoZXJDYWNoaW5nKSB7XG5cdFx0XHRcdElOVFJJTlNJQ1NbaW50cmluc2ljUmVhbE5hbWVdID0gdmFsdWU7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiB2YWx1ZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvcmlnU3ltYm9sID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sO1xudmFyIGhhc1N5bWJvbFNoYW0gPSByZXF1aXJlKCcuL3NoYW1zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaGFzTmF0aXZlU3ltYm9scygpIHtcblx0aWYgKHR5cGVvZiBvcmlnU3ltYm9sICE9PSAnZnVuY3Rpb24nKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ2Z1bmN0aW9uJykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKHR5cGVvZiBvcmlnU3ltYm9sKCdmb28nKSAhPT0gJ3N5bWJvbCcpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmICh0eXBlb2YgU3ltYm9sKCdiYXInKSAhPT0gJ3N5bWJvbCcpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0cmV0dXJuIGhhc1N5bWJvbFNoYW0oKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludCBjb21wbGV4aXR5OiBbMiwgMThdLCBtYXgtc3RhdGVtZW50czogWzIsIDMzXSAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBoYXNTeW1ib2xzKCkge1xuXHRpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyAhPT0gJ2Z1bmN0aW9uJykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09ICdzeW1ib2wnKSB7IHJldHVybiB0cnVlOyB9XG5cblx0dmFyIG9iaiA9IHt9O1xuXHR2YXIgc3ltID0gU3ltYm9sKCd0ZXN0Jyk7XG5cdHZhciBzeW1PYmogPSBPYmplY3Qoc3ltKTtcblx0aWYgKHR5cGVvZiBzeW0gPT09ICdzdHJpbmcnKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ltKSAhPT0gJ1tvYmplY3QgU3ltYm9sXScpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ltT2JqKSAhPT0gJ1tvYmplY3QgU3ltYm9sXScpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0Ly8gdGVtcCBkaXNhYmxlZCBwZXIgaHR0cHM6Ly9naXRodWIuY29tL2xqaGFyYi9vYmplY3QuYXNzaWduL2lzc3Vlcy8xN1xuXHQvLyBpZiAoc3ltIGluc3RhbmNlb2YgU3ltYm9sKSB7IHJldHVybiBmYWxzZTsgfVxuXHQvLyB0ZW1wIGRpc2FibGVkIHBlciBodHRwczovL2dpdGh1Yi5jb20vV2ViUmVmbGVjdGlvbi9nZXQtb3duLXByb3BlcnR5LXN5bWJvbHMvaXNzdWVzLzRcblx0Ly8gaWYgKCEoc3ltT2JqIGluc3RhbmNlb2YgU3ltYm9sKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHQvLyBpZiAodHlwZW9mIFN5bWJvbC5wcm90b3R5cGUudG9TdHJpbmcgIT09ICdmdW5jdGlvbicpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdC8vIGlmIChTdHJpbmcoc3ltKSAhPT0gU3ltYm9sLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN5bSkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0dmFyIHN5bVZhbCA9IDQyO1xuXHRvYmpbc3ltXSA9IHN5bVZhbDtcblx0Zm9yIChzeW0gaW4gb2JqKSB7IHJldHVybiBmYWxzZTsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXJlc3RyaWN0ZWQtc3ludGF4LCBuby11bnJlYWNoYWJsZS1sb29wXG5cdGlmICh0eXBlb2YgT2JqZWN0LmtleXMgPT09ICdmdW5jdGlvbicgJiYgT2JqZWN0LmtleXMob2JqKS5sZW5ndGggIT09IDApIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0aWYgKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyA9PT0gJ2Z1bmN0aW9uJyAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopLmxlbmd0aCAhPT0gMCkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHR2YXIgc3ltcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMob2JqKTtcblx0aWYgKHN5bXMubGVuZ3RoICE9PSAxIHx8IHN5bXNbMF0gIT09IHN5bSkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRpZiAoIU9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChvYmosIHN5bSkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0aWYgKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgc3ltKTtcblx0XHRpZiAoZGVzY3JpcHRvci52YWx1ZSAhPT0gc3ltVmFsIHx8IGRlc2NyaXB0b3IuZW51bWVyYWJsZSAhPT0gdHJ1ZSkgeyByZXR1cm4gZmFsc2U7IH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGJpbmQgPSByZXF1aXJlKCdmdW5jdGlvbi1iaW5kJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gYmluZC5jYWxsKEZ1bmN0aW9uLmNhbGwsIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgR2V0SW50cmluc2ljID0gcmVxdWlyZSgnZ2V0LWludHJpbnNpYycpO1xudmFyIGhhcyA9IHJlcXVpcmUoJ2hhcycpO1xudmFyIGNoYW5uZWwgPSByZXF1aXJlKCdzaWRlLWNoYW5uZWwnKSgpO1xuXG52YXIgJFR5cGVFcnJvciA9IEdldEludHJpbnNpYygnJVR5cGVFcnJvciUnKTtcblxudmFyIFNMT1QgPSB7XG5cdGFzc2VydDogZnVuY3Rpb24gKE8sIHNsb3QpIHtcblx0XHRpZiAoIU8gfHwgKHR5cGVvZiBPICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgTyAhPT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdgT2AgaXMgbm90IGFuIG9iamVjdCcpO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHNsb3QgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYHNsb3RgIG11c3QgYmUgYSBzdHJpbmcnKTtcblx0XHR9XG5cdFx0Y2hhbm5lbC5hc3NlcnQoTyk7XG5cdFx0aWYgKCFTTE9ULmhhcyhPLCBzbG90KSkge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2BzbG90YCBpcyBub3QgcHJlc2VudCBvbiBgT2AnKTtcblx0XHR9XG5cdH0sXG5cdGdldDogZnVuY3Rpb24gKE8sIHNsb3QpIHtcblx0XHRpZiAoIU8gfHwgKHR5cGVvZiBPICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgTyAhPT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdgT2AgaXMgbm90IGFuIG9iamVjdCcpO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHNsb3QgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYHNsb3RgIG11c3QgYmUgYSBzdHJpbmcnKTtcblx0XHR9XG5cdFx0dmFyIHNsb3RzID0gY2hhbm5lbC5nZXQoTyk7XG5cdFx0cmV0dXJuIHNsb3RzICYmIHNsb3RzWyckJyArIHNsb3RdO1xuXHR9LFxuXHRoYXM6IGZ1bmN0aW9uIChPLCBzbG90KSB7XG5cdFx0aWYgKCFPIHx8ICh0eXBlb2YgTyAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIE8gIT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYE9gIGlzIG5vdCBhbiBvYmplY3QnKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBzbG90ICE9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2BzbG90YCBtdXN0IGJlIGEgc3RyaW5nJyk7XG5cdFx0fVxuXHRcdHZhciBzbG90cyA9IGNoYW5uZWwuZ2V0KE8pO1xuXHRcdHJldHVybiAhIXNsb3RzICYmIGhhcyhzbG90cywgJyQnICsgc2xvdCk7XG5cdH0sXG5cdHNldDogZnVuY3Rpb24gKE8sIHNsb3QsIFYpIHtcblx0XHRpZiAoIU8gfHwgKHR5cGVvZiBPICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgTyAhPT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdgT2AgaXMgbm90IGFuIG9iamVjdCcpO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHNsb3QgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYHNsb3RgIG11c3QgYmUgYSBzdHJpbmcnKTtcblx0XHR9XG5cdFx0dmFyIHNsb3RzID0gY2hhbm5lbC5nZXQoTyk7XG5cdFx0aWYgKCFzbG90cykge1xuXHRcdFx0c2xvdHMgPSB7fTtcblx0XHRcdGNoYW5uZWwuc2V0KE8sIHNsb3RzKTtcblx0XHR9XG5cdFx0c2xvdHNbJyQnICsgc2xvdF0gPSBWO1xuXHR9XG59O1xuXG5pZiAoT2JqZWN0LmZyZWV6ZSkge1xuXHRPYmplY3QuZnJlZXplKFNMT1QpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNMT1Q7XG4iLCJ2YXIgaGFzTWFwID0gdHlwZW9mIE1hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBNYXAucHJvdG90eXBlO1xudmFyIG1hcFNpemVEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciAmJiBoYXNNYXAgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKE1hcC5wcm90b3R5cGUsICdzaXplJykgOiBudWxsO1xudmFyIG1hcFNpemUgPSBoYXNNYXAgJiYgbWFwU2l6ZURlc2NyaXB0b3IgJiYgdHlwZW9mIG1hcFNpemVEZXNjcmlwdG9yLmdldCA9PT0gJ2Z1bmN0aW9uJyA/IG1hcFNpemVEZXNjcmlwdG9yLmdldCA6IG51bGw7XG52YXIgbWFwRm9yRWFjaCA9IGhhc01hcCAmJiBNYXAucHJvdG90eXBlLmZvckVhY2g7XG52YXIgaGFzU2V0ID0gdHlwZW9mIFNldCA9PT0gJ2Z1bmN0aW9uJyAmJiBTZXQucHJvdG90eXBlO1xudmFyIHNldFNpemVEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciAmJiBoYXNTZXQgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKFNldC5wcm90b3R5cGUsICdzaXplJykgOiBudWxsO1xudmFyIHNldFNpemUgPSBoYXNTZXQgJiYgc2V0U2l6ZURlc2NyaXB0b3IgJiYgdHlwZW9mIHNldFNpemVEZXNjcmlwdG9yLmdldCA9PT0gJ2Z1bmN0aW9uJyA/IHNldFNpemVEZXNjcmlwdG9yLmdldCA6IG51bGw7XG52YXIgc2V0Rm9yRWFjaCA9IGhhc1NldCAmJiBTZXQucHJvdG90eXBlLmZvckVhY2g7XG52YXIgaGFzV2Vha01hcCA9IHR5cGVvZiBXZWFrTWFwID09PSAnZnVuY3Rpb24nICYmIFdlYWtNYXAucHJvdG90eXBlO1xudmFyIHdlYWtNYXBIYXMgPSBoYXNXZWFrTWFwID8gV2Vha01hcC5wcm90b3R5cGUuaGFzIDogbnVsbDtcbnZhciBoYXNXZWFrU2V0ID0gdHlwZW9mIFdlYWtTZXQgPT09ICdmdW5jdGlvbicgJiYgV2Vha1NldC5wcm90b3R5cGU7XG52YXIgd2Vha1NldEhhcyA9IGhhc1dlYWtTZXQgPyBXZWFrU2V0LnByb3RvdHlwZS5oYXMgOiBudWxsO1xudmFyIGhhc1dlYWtSZWYgPSB0eXBlb2YgV2Vha1JlZiA9PT0gJ2Z1bmN0aW9uJyAmJiBXZWFrUmVmLnByb3RvdHlwZTtcbnZhciB3ZWFrUmVmRGVyZWYgPSBoYXNXZWFrUmVmID8gV2Vha1JlZi5wcm90b3R5cGUuZGVyZWYgOiBudWxsO1xudmFyIGJvb2xlYW5WYWx1ZU9mID0gQm9vbGVhbi5wcm90b3R5cGUudmFsdWVPZjtcbnZhciBvYmplY3RUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgZnVuY3Rpb25Ub1N0cmluZyA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZztcbnZhciAkbWF0Y2ggPSBTdHJpbmcucHJvdG90eXBlLm1hdGNoO1xudmFyICRzbGljZSA9IFN0cmluZy5wcm90b3R5cGUuc2xpY2U7XG52YXIgJHJlcGxhY2UgPSBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2U7XG52YXIgJHRvVXBwZXJDYXNlID0gU3RyaW5nLnByb3RvdHlwZS50b1VwcGVyQ2FzZTtcbnZhciAkdG9Mb3dlckNhc2UgPSBTdHJpbmcucHJvdG90eXBlLnRvTG93ZXJDYXNlO1xudmFyICR0ZXN0ID0gUmVnRXhwLnByb3RvdHlwZS50ZXN0O1xudmFyICRjb25jYXQgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0O1xudmFyICRqb2luID0gQXJyYXkucHJvdG90eXBlLmpvaW47XG52YXIgJGFyclNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyICRmbG9vciA9IE1hdGguZmxvb3I7XG52YXIgYmlnSW50VmFsdWVPZiA9IHR5cGVvZiBCaWdJbnQgPT09ICdmdW5jdGlvbicgPyBCaWdJbnQucHJvdG90eXBlLnZhbHVlT2YgOiBudWxsO1xudmFyIGdPUFMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIHN5bVRvU3RyaW5nID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSAnc3ltYm9sJyA/IFN5bWJvbC5wcm90b3R5cGUudG9TdHJpbmcgOiBudWxsO1xudmFyIGhhc1NoYW1tZWRTeW1ib2xzID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSAnb2JqZWN0Jztcbi8vIGllLCBgaGFzLXRvc3RyaW5ndGFnL3NoYW1zXG52YXIgdG9TdHJpbmdUYWcgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIFN5bWJvbC50b1N0cmluZ1RhZyAmJiAodHlwZW9mIFN5bWJvbC50b1N0cmluZ1RhZyA9PT0gaGFzU2hhbW1lZFN5bWJvbHMgPyAnb2JqZWN0JyA6ICdzeW1ib2wnKVxuICAgID8gU3ltYm9sLnRvU3RyaW5nVGFnXG4gICAgOiBudWxsO1xudmFyIGlzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbnZhciBnUE8gPSAodHlwZW9mIFJlZmxlY3QgPT09ICdmdW5jdGlvbicgPyBSZWZsZWN0LmdldFByb3RvdHlwZU9mIDogT2JqZWN0LmdldFByb3RvdHlwZU9mKSB8fCAoXG4gICAgW10uX19wcm90b19fID09PSBBcnJheS5wcm90b3R5cGUgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wcm90b1xuICAgICAgICA/IGZ1bmN0aW9uIChPKSB7XG4gICAgICAgICAgICByZXR1cm4gTy5fX3Byb3RvX187IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcHJvdG9cbiAgICAgICAgfVxuICAgICAgICA6IG51bGxcbik7XG5cbmZ1bmN0aW9uIGFkZE51bWVyaWNTZXBhcmF0b3IobnVtLCBzdHIpIHtcbiAgICBpZiAoXG4gICAgICAgIG51bSA9PT0gSW5maW5pdHlcbiAgICAgICAgfHwgbnVtID09PSAtSW5maW5pdHlcbiAgICAgICAgfHwgbnVtICE9PSBudW1cbiAgICAgICAgfHwgKG51bSAmJiBudW0gPiAtMTAwMCAmJiBudW0gPCAxMDAwKVxuICAgICAgICB8fCAkdGVzdC5jYWxsKC9lLywgc3RyKVxuICAgICkge1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICB2YXIgc2VwUmVnZXggPSAvWzAtOV0oPz0oPzpbMC05XXszfSkrKD8hWzAtOV0pKS9nO1xuICAgIGlmICh0eXBlb2YgbnVtID09PSAnbnVtYmVyJykge1xuICAgICAgICB2YXIgaW50ID0gbnVtIDwgMCA/IC0kZmxvb3IoLW51bSkgOiAkZmxvb3IobnVtKTsgLy8gdHJ1bmMobnVtKVxuICAgICAgICBpZiAoaW50ICE9PSBudW0pIHtcbiAgICAgICAgICAgIHZhciBpbnRTdHIgPSBTdHJpbmcoaW50KTtcbiAgICAgICAgICAgIHZhciBkZWMgPSAkc2xpY2UuY2FsbChzdHIsIGludFN0ci5sZW5ndGggKyAxKTtcbiAgICAgICAgICAgIHJldHVybiAkcmVwbGFjZS5jYWxsKGludFN0ciwgc2VwUmVnZXgsICckJl8nKSArICcuJyArICRyZXBsYWNlLmNhbGwoJHJlcGxhY2UuY2FsbChkZWMsIC8oWzAtOV17M30pL2csICckJl8nKSwgL18kLywgJycpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAkcmVwbGFjZS5jYWxsKHN0ciwgc2VwUmVnZXgsICckJl8nKTtcbn1cblxudmFyIHV0aWxJbnNwZWN0ID0gcmVxdWlyZSgnLi91dGlsLmluc3BlY3QnKTtcbnZhciBpbnNwZWN0Q3VzdG9tID0gdXRpbEluc3BlY3QuY3VzdG9tO1xudmFyIGluc3BlY3RTeW1ib2wgPSBpc1N5bWJvbChpbnNwZWN0Q3VzdG9tKSA/IGluc3BlY3RDdXN0b20gOiBudWxsO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluc3BlY3RfKG9iaiwgb3B0aW9ucywgZGVwdGgsIHNlZW4pIHtcbiAgICB2YXIgb3B0cyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBpZiAoaGFzKG9wdHMsICdxdW90ZVN0eWxlJykgJiYgKG9wdHMucXVvdGVTdHlsZSAhPT0gJ3NpbmdsZScgJiYgb3B0cy5xdW90ZVN0eWxlICE9PSAnZG91YmxlJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9uIFwicXVvdGVTdHlsZVwiIG11c3QgYmUgXCJzaW5nbGVcIiBvciBcImRvdWJsZVwiJyk7XG4gICAgfVxuICAgIGlmIChcbiAgICAgICAgaGFzKG9wdHMsICdtYXhTdHJpbmdMZW5ndGgnKSAmJiAodHlwZW9mIG9wdHMubWF4U3RyaW5nTGVuZ3RoID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgPyBvcHRzLm1heFN0cmluZ0xlbmd0aCA8IDAgJiYgb3B0cy5tYXhTdHJpbmdMZW5ndGggIT09IEluZmluaXR5XG4gICAgICAgICAgICA6IG9wdHMubWF4U3RyaW5nTGVuZ3RoICE9PSBudWxsXG4gICAgICAgIClcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9uIFwibWF4U3RyaW5nTGVuZ3RoXCIsIGlmIHByb3ZpZGVkLCBtdXN0IGJlIGEgcG9zaXRpdmUgaW50ZWdlciwgSW5maW5pdHksIG9yIGBudWxsYCcpO1xuICAgIH1cbiAgICB2YXIgY3VzdG9tSW5zcGVjdCA9IGhhcyhvcHRzLCAnY3VzdG9tSW5zcGVjdCcpID8gb3B0cy5jdXN0b21JbnNwZWN0IDogdHJ1ZTtcbiAgICBpZiAodHlwZW9mIGN1c3RvbUluc3BlY3QgIT09ICdib29sZWFuJyAmJiBjdXN0b21JbnNwZWN0ICE9PSAnc3ltYm9sJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb24gXCJjdXN0b21JbnNwZWN0XCIsIGlmIHByb3ZpZGVkLCBtdXN0IGJlIGB0cnVlYCwgYGZhbHNlYCwgb3IgYFxcJ3N5bWJvbFxcJ2AnKTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICAgIGhhcyhvcHRzLCAnaW5kZW50JylcbiAgICAgICAgJiYgb3B0cy5pbmRlbnQgIT09IG51bGxcbiAgICAgICAgJiYgb3B0cy5pbmRlbnQgIT09ICdcXHQnXG4gICAgICAgICYmICEocGFyc2VJbnQob3B0cy5pbmRlbnQsIDEwKSA9PT0gb3B0cy5pbmRlbnQgJiYgb3B0cy5pbmRlbnQgPiAwKVxuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb24gXCJpbmRlbnRcIiBtdXN0IGJlIFwiXFxcXHRcIiwgYW4gaW50ZWdlciA+IDAsIG9yIGBudWxsYCcpO1xuICAgIH1cbiAgICBpZiAoaGFzKG9wdHMsICdudW1lcmljU2VwYXJhdG9yJykgJiYgdHlwZW9mIG9wdHMubnVtZXJpY1NlcGFyYXRvciAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbiBcIm51bWVyaWNTZXBhcmF0b3JcIiwgaWYgcHJvdmlkZWQsIG11c3QgYmUgYHRydWVgIG9yIGBmYWxzZWAnKTtcbiAgICB9XG4gICAgdmFyIG51bWVyaWNTZXBhcmF0b3IgPSBvcHRzLm51bWVyaWNTZXBhcmF0b3I7XG5cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuICd1bmRlZmluZWQnO1xuICAgIH1cbiAgICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgcmV0dXJuIG9iaiA/ICd0cnVlJyA6ICdmYWxzZSc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBpbnNwZWN0U3RyaW5nKG9iaiwgb3B0cyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnbnVtYmVyJykge1xuICAgICAgICBpZiAob2JqID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gSW5maW5pdHkgLyBvYmogPiAwID8gJzAnIDogJy0wJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3RyID0gU3RyaW5nKG9iaik7XG4gICAgICAgIHJldHVybiBudW1lcmljU2VwYXJhdG9yID8gYWRkTnVtZXJpY1NlcGFyYXRvcihvYmosIHN0cikgOiBzdHI7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnYmlnaW50Jykge1xuICAgICAgICB2YXIgYmlnSW50U3RyID0gU3RyaW5nKG9iaikgKyAnbic7XG4gICAgICAgIHJldHVybiBudW1lcmljU2VwYXJhdG9yID8gYWRkTnVtZXJpY1NlcGFyYXRvcihvYmosIGJpZ0ludFN0cikgOiBiaWdJbnRTdHI7XG4gICAgfVxuXG4gICAgdmFyIG1heERlcHRoID0gdHlwZW9mIG9wdHMuZGVwdGggPT09ICd1bmRlZmluZWQnID8gNSA6IG9wdHMuZGVwdGg7XG4gICAgaWYgKHR5cGVvZiBkZXB0aCA9PT0gJ3VuZGVmaW5lZCcpIHsgZGVwdGggPSAwOyB9XG4gICAgaWYgKGRlcHRoID49IG1heERlcHRoICYmIG1heERlcHRoID4gMCAmJiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gaXNBcnJheShvYmopID8gJ1tBcnJheV0nIDogJ1tPYmplY3RdJztcbiAgICB9XG5cbiAgICB2YXIgaW5kZW50ID0gZ2V0SW5kZW50KG9wdHMsIGRlcHRoKTtcblxuICAgIGlmICh0eXBlb2Ygc2VlbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgc2VlbiA9IFtdO1xuICAgIH0gZWxzZSBpZiAoaW5kZXhPZihzZWVuLCBvYmopID49IDApIHtcbiAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNwZWN0KHZhbHVlLCBmcm9tLCBub0luZGVudCkge1xuICAgICAgICBpZiAoZnJvbSkge1xuICAgICAgICAgICAgc2VlbiA9ICRhcnJTbGljZS5jYWxsKHNlZW4pO1xuICAgICAgICAgICAgc2Vlbi5wdXNoKGZyb20pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub0luZGVudCkge1xuICAgICAgICAgICAgdmFyIG5ld09wdHMgPSB7XG4gICAgICAgICAgICAgICAgZGVwdGg6IG9wdHMuZGVwdGhcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoaGFzKG9wdHMsICdxdW90ZVN0eWxlJykpIHtcbiAgICAgICAgICAgICAgICBuZXdPcHRzLnF1b3RlU3R5bGUgPSBvcHRzLnF1b3RlU3R5bGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5zcGVjdF8odmFsdWUsIG5ld09wdHMsIGRlcHRoICsgMSwgc2Vlbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluc3BlY3RfKHZhbHVlLCBvcHRzLCBkZXB0aCArIDEsIHNlZW4pO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nICYmICFpc1JlZ0V4cChvYmopKSB7IC8vIGluIG9sZGVyIGVuZ2luZXMsIHJlZ2V4ZXMgYXJlIGNhbGxhYmxlXG4gICAgICAgIHZhciBuYW1lID0gbmFtZU9mKG9iaik7XG4gICAgICAgIHZhciBrZXlzID0gYXJyT2JqS2V5cyhvYmosIGluc3BlY3QpO1xuICAgICAgICByZXR1cm4gJ1tGdW5jdGlvbicgKyAobmFtZSA/ICc6ICcgKyBuYW1lIDogJyAoYW5vbnltb3VzKScpICsgJ10nICsgKGtleXMubGVuZ3RoID4gMCA/ICcgeyAnICsgJGpvaW4uY2FsbChrZXlzLCAnLCAnKSArICcgfScgOiAnJyk7XG4gICAgfVxuICAgIGlmIChpc1N5bWJvbChvYmopKSB7XG4gICAgICAgIHZhciBzeW1TdHJpbmcgPSBoYXNTaGFtbWVkU3ltYm9scyA/ICRyZXBsYWNlLmNhbGwoU3RyaW5nKG9iaiksIC9eKFN5bWJvbFxcKC4qXFwpKV9bXildKiQvLCAnJDEnKSA6IHN5bVRvU3RyaW5nLmNhbGwob2JqKTtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmICFoYXNTaGFtbWVkU3ltYm9scyA/IG1hcmtCb3hlZChzeW1TdHJpbmcpIDogc3ltU3RyaW5nO1xuICAgIH1cbiAgICBpZiAoaXNFbGVtZW50KG9iaikpIHtcbiAgICAgICAgdmFyIHMgPSAnPCcgKyAkdG9Mb3dlckNhc2UuY2FsbChTdHJpbmcob2JqLm5vZGVOYW1lKSk7XG4gICAgICAgIHZhciBhdHRycyA9IG9iai5hdHRyaWJ1dGVzIHx8IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGF0dHJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBzICs9ICcgJyArIGF0dHJzW2ldLm5hbWUgKyAnPScgKyB3cmFwUXVvdGVzKHF1b3RlKGF0dHJzW2ldLnZhbHVlKSwgJ2RvdWJsZScsIG9wdHMpO1xuICAgICAgICB9XG4gICAgICAgIHMgKz0gJz4nO1xuICAgICAgICBpZiAob2JqLmNoaWxkTm9kZXMgJiYgb2JqLmNoaWxkTm9kZXMubGVuZ3RoKSB7IHMgKz0gJy4uLic7IH1cbiAgICAgICAgcyArPSAnPC8nICsgJHRvTG93ZXJDYXNlLmNhbGwoU3RyaW5nKG9iai5ub2RlTmFtZSkpICsgJz4nO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9XG4gICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICBpZiAob2JqLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gJ1tdJzsgfVxuICAgICAgICB2YXIgeHMgPSBhcnJPYmpLZXlzKG9iaiwgaW5zcGVjdCk7XG4gICAgICAgIGlmIChpbmRlbnQgJiYgIXNpbmdsZUxpbmVWYWx1ZXMoeHMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1snICsgaW5kZW50ZWRKb2luKHhzLCBpbmRlbnQpICsgJ10nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnWyAnICsgJGpvaW4uY2FsbCh4cywgJywgJykgKyAnIF0nO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcihvYmopKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IGFyck9iaktleXMob2JqLCBpbnNwZWN0KTtcbiAgICAgICAgaWYgKCEoJ2NhdXNlJyBpbiBFcnJvci5wcm90b3R5cGUpICYmICdjYXVzZScgaW4gb2JqICYmICFpc0VudW1lcmFibGUuY2FsbChvYmosICdjYXVzZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3sgWycgKyBTdHJpbmcob2JqKSArICddICcgKyAkam9pbi5jYWxsKCRjb25jYXQuY2FsbCgnW2NhdXNlXTogJyArIGluc3BlY3Qob2JqLmNhdXNlKSwgcGFydHMpLCAnLCAnKSArICcgfSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gJ1snICsgU3RyaW5nKG9iaikgKyAnXSc7IH1cbiAgICAgICAgcmV0dXJuICd7IFsnICsgU3RyaW5nKG9iaikgKyAnXSAnICsgJGpvaW4uY2FsbChwYXJ0cywgJywgJykgKyAnIH0nO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgY3VzdG9tSW5zcGVjdCkge1xuICAgICAgICBpZiAoaW5zcGVjdFN5bWJvbCAmJiB0eXBlb2Ygb2JqW2luc3BlY3RTeW1ib2xdID09PSAnZnVuY3Rpb24nICYmIHV0aWxJbnNwZWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gdXRpbEluc3BlY3Qob2JqLCB7IGRlcHRoOiBtYXhEZXB0aCAtIGRlcHRoIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKGN1c3RvbUluc3BlY3QgIT09ICdzeW1ib2wnICYmIHR5cGVvZiBvYmouaW5zcGVjdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIG9iai5pbnNwZWN0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzTWFwKG9iaikpIHtcbiAgICAgICAgdmFyIG1hcFBhcnRzID0gW107XG4gICAgICAgIG1hcEZvckVhY2guY2FsbChvYmosIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICBtYXBQYXJ0cy5wdXNoKGluc3BlY3Qoa2V5LCBvYmosIHRydWUpICsgJyA9PiAnICsgaW5zcGVjdCh2YWx1ZSwgb2JqKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29sbGVjdGlvbk9mKCdNYXAnLCBtYXBTaXplLmNhbGwob2JqKSwgbWFwUGFydHMsIGluZGVudCk7XG4gICAgfVxuICAgIGlmIChpc1NldChvYmopKSB7XG4gICAgICAgIHZhciBzZXRQYXJ0cyA9IFtdO1xuICAgICAgICBzZXRGb3JFYWNoLmNhbGwob2JqLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHNldFBhcnRzLnB1c2goaW5zcGVjdCh2YWx1ZSwgb2JqKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29sbGVjdGlvbk9mKCdTZXQnLCBzZXRTaXplLmNhbGwob2JqKSwgc2V0UGFydHMsIGluZGVudCk7XG4gICAgfVxuICAgIGlmIChpc1dlYWtNYXAob2JqKSkge1xuICAgICAgICByZXR1cm4gd2Vha0NvbGxlY3Rpb25PZignV2Vha01hcCcpO1xuICAgIH1cbiAgICBpZiAoaXNXZWFrU2V0KG9iaikpIHtcbiAgICAgICAgcmV0dXJuIHdlYWtDb2xsZWN0aW9uT2YoJ1dlYWtTZXQnKTtcbiAgICB9XG4gICAgaWYgKGlzV2Vha1JlZihvYmopKSB7XG4gICAgICAgIHJldHVybiB3ZWFrQ29sbGVjdGlvbk9mKCdXZWFrUmVmJyk7XG4gICAgfVxuICAgIGlmIChpc051bWJlcihvYmopKSB7XG4gICAgICAgIHJldHVybiBtYXJrQm94ZWQoaW5zcGVjdChOdW1iZXIob2JqKSkpO1xuICAgIH1cbiAgICBpZiAoaXNCaWdJbnQob2JqKSkge1xuICAgICAgICByZXR1cm4gbWFya0JveGVkKGluc3BlY3QoYmlnSW50VmFsdWVPZi5jYWxsKG9iaikpKTtcbiAgICB9XG4gICAgaWYgKGlzQm9vbGVhbihvYmopKSB7XG4gICAgICAgIHJldHVybiBtYXJrQm94ZWQoYm9vbGVhblZhbHVlT2YuY2FsbChvYmopKTtcbiAgICB9XG4gICAgaWYgKGlzU3RyaW5nKG9iaikpIHtcbiAgICAgICAgcmV0dXJuIG1hcmtCb3hlZChpbnNwZWN0KFN0cmluZyhvYmopKSk7XG4gICAgfVxuICAgIGlmICghaXNEYXRlKG9iaikgJiYgIWlzUmVnRXhwKG9iaikpIHtcbiAgICAgICAgdmFyIHlzID0gYXJyT2JqS2V5cyhvYmosIGluc3BlY3QpO1xuICAgICAgICB2YXIgaXNQbGFpbk9iamVjdCA9IGdQTyA/IGdQTyhvYmopID09PSBPYmplY3QucHJvdG90eXBlIDogb2JqIGluc3RhbmNlb2YgT2JqZWN0IHx8IG9iai5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0O1xuICAgICAgICB2YXIgcHJvdG9UYWcgPSBvYmogaW5zdGFuY2VvZiBPYmplY3QgPyAnJyA6ICdudWxsIHByb3RvdHlwZSc7XG4gICAgICAgIHZhciBzdHJpbmdUYWcgPSAhaXNQbGFpbk9iamVjdCAmJiB0b1N0cmluZ1RhZyAmJiBPYmplY3Qob2JqKSA9PT0gb2JqICYmIHRvU3RyaW5nVGFnIGluIG9iaiA/ICRzbGljZS5jYWxsKHRvU3RyKG9iaiksIDgsIC0xKSA6IHByb3RvVGFnID8gJ09iamVjdCcgOiAnJztcbiAgICAgICAgdmFyIGNvbnN0cnVjdG9yVGFnID0gaXNQbGFpbk9iamVjdCB8fCB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yICE9PSAnZnVuY3Rpb24nID8gJycgOiBvYmouY29uc3RydWN0b3IubmFtZSA/IG9iai5jb25zdHJ1Y3Rvci5uYW1lICsgJyAnIDogJyc7XG4gICAgICAgIHZhciB0YWcgPSBjb25zdHJ1Y3RvclRhZyArIChzdHJpbmdUYWcgfHwgcHJvdG9UYWcgPyAnWycgKyAkam9pbi5jYWxsKCRjb25jYXQuY2FsbChbXSwgc3RyaW5nVGFnIHx8IFtdLCBwcm90b1RhZyB8fCBbXSksICc6ICcpICsgJ10gJyA6ICcnKTtcbiAgICAgICAgaWYgKHlzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gdGFnICsgJ3t9JzsgfVxuICAgICAgICBpZiAoaW5kZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGFnICsgJ3snICsgaW5kZW50ZWRKb2luKHlzLCBpbmRlbnQpICsgJ30nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0YWcgKyAneyAnICsgJGpvaW4uY2FsbCh5cywgJywgJykgKyAnIH0nO1xuICAgIH1cbiAgICByZXR1cm4gU3RyaW5nKG9iaik7XG59O1xuXG5mdW5jdGlvbiB3cmFwUXVvdGVzKHMsIGRlZmF1bHRTdHlsZSwgb3B0cykge1xuICAgIHZhciBxdW90ZUNoYXIgPSAob3B0cy5xdW90ZVN0eWxlIHx8IGRlZmF1bHRTdHlsZSkgPT09ICdkb3VibGUnID8gJ1wiJyA6IFwiJ1wiO1xuICAgIHJldHVybiBxdW90ZUNoYXIgKyBzICsgcXVvdGVDaGFyO1xufVxuXG5mdW5jdGlvbiBxdW90ZShzKSB7XG4gICAgcmV0dXJuICRyZXBsYWNlLmNhbGwoU3RyaW5nKHMpLCAvXCIvZywgJyZxdW90OycpO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJyAmJiAoIXRvU3RyaW5nVGFnIHx8ICEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmdUYWcgaW4gb2JqKSk7IH1cbmZ1bmN0aW9uIGlzRGF0ZShvYmopIHsgcmV0dXJuIHRvU3RyKG9iaikgPT09ICdbb2JqZWN0IERhdGVdJyAmJiAoIXRvU3RyaW5nVGFnIHx8ICEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmdUYWcgaW4gb2JqKSk7IH1cbmZ1bmN0aW9uIGlzUmVnRXhwKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgUmVnRXhwXScgJiYgKCF0b1N0cmluZ1RhZyB8fCAhKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nVGFnIGluIG9iaikpOyB9XG5mdW5jdGlvbiBpc0Vycm9yKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyAmJiAoIXRvU3RyaW5nVGFnIHx8ICEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmdUYWcgaW4gb2JqKSk7IH1cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgU3RyaW5nXScgJiYgKCF0b1N0cmluZ1RhZyB8fCAhKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nVGFnIGluIG9iaikpOyB9XG5mdW5jdGlvbiBpc051bWJlcihvYmopIHsgcmV0dXJuIHRvU3RyKG9iaikgPT09ICdbb2JqZWN0IE51bWJlcl0nICYmICghdG9TdHJpbmdUYWcgfHwgISh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0b1N0cmluZ1RhZyBpbiBvYmopKTsgfVxuZnVuY3Rpb24gaXNCb29sZWFuKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nICYmICghdG9TdHJpbmdUYWcgfHwgISh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0b1N0cmluZ1RhZyBpbiBvYmopKTsgfVxuXG4vLyBTeW1ib2wgYW5kIEJpZ0ludCBkbyBoYXZlIFN5bWJvbC50b1N0cmluZ1RhZyBieSBzcGVjLCBzbyB0aGF0IGNhbid0IGJlIHVzZWQgdG8gZWxpbWluYXRlIGZhbHNlIHBvc2l0aXZlc1xuZnVuY3Rpb24gaXNTeW1ib2wob2JqKSB7XG4gICAgaWYgKGhhc1NoYW1tZWRTeW1ib2xzKSB7XG4gICAgICAgIHJldHVybiBvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqIGluc3RhbmNlb2YgU3ltYm9sO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ3N5bWJvbCcpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICghb2JqIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8ICFzeW1Ub1N0cmluZykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHN5bVRvU3RyaW5nLmNhbGwob2JqKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge31cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzQmlnSW50KG9iaikge1xuICAgIGlmICghb2JqIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8ICFiaWdJbnRWYWx1ZU9mKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgYmlnSW50VmFsdWVPZi5jYWxsKG9iaik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSB8fCBmdW5jdGlvbiAoa2V5KSB7IHJldHVybiBrZXkgaW4gdGhpczsgfTtcbmZ1bmN0aW9uIGhhcyhvYmosIGtleSkge1xuICAgIHJldHVybiBoYXNPd24uY2FsbChvYmosIGtleSk7XG59XG5cbmZ1bmN0aW9uIHRvU3RyKG9iaikge1xuICAgIHJldHVybiBvYmplY3RUb1N0cmluZy5jYWxsKG9iaik7XG59XG5cbmZ1bmN0aW9uIG5hbWVPZihmKSB7XG4gICAgaWYgKGYubmFtZSkgeyByZXR1cm4gZi5uYW1lOyB9XG4gICAgdmFyIG0gPSAkbWF0Y2guY2FsbChmdW5jdGlvblRvU3RyaW5nLmNhbGwoZiksIC9eZnVuY3Rpb25cXHMqKFtcXHckXSspLyk7XG4gICAgaWYgKG0pIHsgcmV0dXJuIG1bMV07IH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gaW5kZXhPZih4cywgeCkge1xuICAgIGlmICh4cy5pbmRleE9mKSB7IHJldHVybiB4cy5pbmRleE9mKHgpOyB9XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB4cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYgKHhzW2ldID09PSB4KSB7IHJldHVybiBpOyB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuZnVuY3Rpb24gaXNNYXAoeCkge1xuICAgIGlmICghbWFwU2l6ZSB8fCAheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBtYXBTaXplLmNhbGwoeCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzZXRTaXplLmNhbGwoeCk7XG4gICAgICAgIH0gY2F0Y2ggKHMpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB4IGluc3RhbmNlb2YgTWFwOyAvLyBjb3JlLWpzIHdvcmthcm91bmQsIHByZS12Mi41LjBcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNXZWFrTWFwKHgpIHtcbiAgICBpZiAoIXdlYWtNYXBIYXMgfHwgIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgd2Vha01hcEhhcy5jYWxsKHgsIHdlYWtNYXBIYXMpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgd2Vha1NldEhhcy5jYWxsKHgsIHdlYWtTZXRIYXMpO1xuICAgICAgICB9IGNhdGNoIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCBpbnN0YW5jZW9mIFdlYWtNYXA7IC8vIGNvcmUtanMgd29ya2Fyb3VuZCwgcHJlLXYyLjUuMFxuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1dlYWtSZWYoeCkge1xuICAgIGlmICghd2Vha1JlZkRlcmVmIHx8ICF4IHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHdlYWtSZWZEZXJlZi5jYWxsKHgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNTZXQoeCkge1xuICAgIGlmICghc2V0U2l6ZSB8fCAheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBzZXRTaXplLmNhbGwoeCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtYXBTaXplLmNhbGwoeCk7XG4gICAgICAgIH0gY2F0Y2ggKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB4IGluc3RhbmNlb2YgU2V0OyAvLyBjb3JlLWpzIHdvcmthcm91bmQsIHByZS12Mi41LjBcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNXZWFrU2V0KHgpIHtcbiAgICBpZiAoIXdlYWtTZXRIYXMgfHwgIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgd2Vha1NldEhhcy5jYWxsKHgsIHdlYWtTZXRIYXMpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgd2Vha01hcEhhcy5jYWxsKHgsIHdlYWtNYXBIYXMpO1xuICAgICAgICB9IGNhdGNoIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCBpbnN0YW5jZW9mIFdlYWtTZXQ7IC8vIGNvcmUtanMgd29ya2Fyb3VuZCwgcHJlLXYyLjUuMFxuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc0VsZW1lbnQoeCkge1xuICAgIGlmICgheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgaWYgKHR5cGVvZiBIVE1MRWxlbWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgeCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZW9mIHgubm9kZU5hbWUgPT09ICdzdHJpbmcnICYmIHR5cGVvZiB4LmdldEF0dHJpYnV0ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaW5zcGVjdFN0cmluZyhzdHIsIG9wdHMpIHtcbiAgICBpZiAoc3RyLmxlbmd0aCA+IG9wdHMubWF4U3RyaW5nTGVuZ3RoKSB7XG4gICAgICAgIHZhciByZW1haW5pbmcgPSBzdHIubGVuZ3RoIC0gb3B0cy5tYXhTdHJpbmdMZW5ndGg7XG4gICAgICAgIHZhciB0cmFpbGVyID0gJy4uLiAnICsgcmVtYWluaW5nICsgJyBtb3JlIGNoYXJhY3RlcicgKyAocmVtYWluaW5nID4gMSA/ICdzJyA6ICcnKTtcbiAgICAgICAgcmV0dXJuIGluc3BlY3RTdHJpbmcoJHNsaWNlLmNhbGwoc3RyLCAwLCBvcHRzLm1heFN0cmluZ0xlbmd0aCksIG9wdHMpICsgdHJhaWxlcjtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnRyb2wtcmVnZXhcbiAgICB2YXIgcyA9ICRyZXBsYWNlLmNhbGwoJHJlcGxhY2UuY2FsbChzdHIsIC8oWydcXFxcXSkvZywgJ1xcXFwkMScpLCAvW1xceDAwLVxceDFmXS9nLCBsb3dieXRlKTtcbiAgICByZXR1cm4gd3JhcFF1b3RlcyhzLCAnc2luZ2xlJywgb3B0cyk7XG59XG5cbmZ1bmN0aW9uIGxvd2J5dGUoYykge1xuICAgIHZhciBuID0gYy5jaGFyQ29kZUF0KDApO1xuICAgIHZhciB4ID0ge1xuICAgICAgICA4OiAnYicsXG4gICAgICAgIDk6ICd0JyxcbiAgICAgICAgMTA6ICduJyxcbiAgICAgICAgMTI6ICdmJyxcbiAgICAgICAgMTM6ICdyJ1xuICAgIH1bbl07XG4gICAgaWYgKHgpIHsgcmV0dXJuICdcXFxcJyArIHg7IH1cbiAgICByZXR1cm4gJ1xcXFx4JyArIChuIDwgMHgxMCA/ICcwJyA6ICcnKSArICR0b1VwcGVyQ2FzZS5jYWxsKG4udG9TdHJpbmcoMTYpKTtcbn1cblxuZnVuY3Rpb24gbWFya0JveGVkKHN0cikge1xuICAgIHJldHVybiAnT2JqZWN0KCcgKyBzdHIgKyAnKSc7XG59XG5cbmZ1bmN0aW9uIHdlYWtDb2xsZWN0aW9uT2YodHlwZSkge1xuICAgIHJldHVybiB0eXBlICsgJyB7ID8gfSc7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3Rpb25PZih0eXBlLCBzaXplLCBlbnRyaWVzLCBpbmRlbnQpIHtcbiAgICB2YXIgam9pbmVkRW50cmllcyA9IGluZGVudCA/IGluZGVudGVkSm9pbihlbnRyaWVzLCBpbmRlbnQpIDogJGpvaW4uY2FsbChlbnRyaWVzLCAnLCAnKTtcbiAgICByZXR1cm4gdHlwZSArICcgKCcgKyBzaXplICsgJykgeycgKyBqb2luZWRFbnRyaWVzICsgJ30nO1xufVxuXG5mdW5jdGlvbiBzaW5nbGVMaW5lVmFsdWVzKHhzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaW5kZXhPZih4c1tpXSwgJ1xcbicpID49IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0SW5kZW50KG9wdHMsIGRlcHRoKSB7XG4gICAgdmFyIGJhc2VJbmRlbnQ7XG4gICAgaWYgKG9wdHMuaW5kZW50ID09PSAnXFx0Jykge1xuICAgICAgICBiYXNlSW5kZW50ID0gJ1xcdCc7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygb3B0cy5pbmRlbnQgPT09ICdudW1iZXInICYmIG9wdHMuaW5kZW50ID4gMCkge1xuICAgICAgICBiYXNlSW5kZW50ID0gJGpvaW4uY2FsbChBcnJheShvcHRzLmluZGVudCArIDEpLCAnICcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBiYXNlOiBiYXNlSW5kZW50LFxuICAgICAgICBwcmV2OiAkam9pbi5jYWxsKEFycmF5KGRlcHRoICsgMSksIGJhc2VJbmRlbnQpXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gaW5kZW50ZWRKb2luKHhzLCBpbmRlbnQpIHtcbiAgICBpZiAoeHMubGVuZ3RoID09PSAwKSB7IHJldHVybiAnJzsgfVxuICAgIHZhciBsaW5lSm9pbmVyID0gJ1xcbicgKyBpbmRlbnQucHJldiArIGluZGVudC5iYXNlO1xuICAgIHJldHVybiBsaW5lSm9pbmVyICsgJGpvaW4uY2FsbCh4cywgJywnICsgbGluZUpvaW5lcikgKyAnXFxuJyArIGluZGVudC5wcmV2O1xufVxuXG5mdW5jdGlvbiBhcnJPYmpLZXlzKG9iaiwgaW5zcGVjdCkge1xuICAgIHZhciBpc0FyciA9IGlzQXJyYXkob2JqKTtcbiAgICB2YXIgeHMgPSBbXTtcbiAgICBpZiAoaXNBcnIpIHtcbiAgICAgICAgeHMubGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHhzW2ldID0gaGFzKG9iaiwgaSkgPyBpbnNwZWN0KG9ialtpXSwgb2JqKSA6ICcnO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciBzeW1zID0gdHlwZW9mIGdPUFMgPT09ICdmdW5jdGlvbicgPyBnT1BTKG9iaikgOiBbXTtcbiAgICB2YXIgc3ltTWFwO1xuICAgIGlmIChoYXNTaGFtbWVkU3ltYm9scykge1xuICAgICAgICBzeW1NYXAgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBzeW1zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICBzeW1NYXBbJyQnICsgc3ltc1trXV0gPSBzeW1zW2tdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXJlc3RyaWN0ZWQtc3ludGF4XG4gICAgICAgIGlmICghaGFzKG9iaiwga2V5KSkgeyBjb250aW51ZTsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXJlc3RyaWN0ZWQtc3ludGF4LCBuby1jb250aW51ZVxuICAgICAgICBpZiAoaXNBcnIgJiYgU3RyaW5nKE51bWJlcihrZXkpKSA9PT0ga2V5ICYmIGtleSA8IG9iai5sZW5ndGgpIHsgY29udGludWU7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1yZXN0cmljdGVkLXN5bnRheCwgbm8tY29udGludWVcbiAgICAgICAgaWYgKGhhc1NoYW1tZWRTeW1ib2xzICYmIHN5bU1hcFsnJCcgKyBrZXldIGluc3RhbmNlb2YgU3ltYm9sKSB7XG4gICAgICAgICAgICAvLyB0aGlzIGlzIHRvIHByZXZlbnQgc2hhbW1lZCBTeW1ib2xzLCB3aGljaCBhcmUgc3RvcmVkIGFzIHN0cmluZ3MsIGZyb20gYmVpbmcgaW5jbHVkZWQgaW4gdGhlIHN0cmluZyBrZXkgc2VjdGlvblxuICAgICAgICAgICAgY29udGludWU7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcmVzdHJpY3RlZC1zeW50YXgsIG5vLWNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoJHRlc3QuY2FsbCgvW15cXHckXS8sIGtleSkpIHtcbiAgICAgICAgICAgIHhzLnB1c2goaW5zcGVjdChrZXksIG9iaikgKyAnOiAnICsgaW5zcGVjdChvYmpba2V5XSwgb2JqKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4cy5wdXNoKGtleSArICc6ICcgKyBpbnNwZWN0KG9ialtrZXldLCBvYmopKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGdPUFMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBzeW1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAoaXNFbnVtZXJhYmxlLmNhbGwob2JqLCBzeW1zW2pdKSkge1xuICAgICAgICAgICAgICAgIHhzLnB1c2goJ1snICsgaW5zcGVjdChzeW1zW2pdKSArICddOiAnICsgaW5zcGVjdChvYmpbc3ltc1tqXV0sIG9iaikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB4cztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IFwiXFxcIk5vb2RsZXMuIFdlIGFsbCBlYXQgdGhlbS4gV2UgYWxsIGxvdmUgdGhlbS4gQW5kIERpYW1vbmQgQ2l0eSdzIFBvd2VyIE5vb2RsZXMgaGFzIHN1cHBsaWVkIHRoaXMgc3VzdGVuYW5jZSBmb3IgdGhlIHBhc3QgZmlmdGVlbiB5ZWFycy4gRnJvbSB0aGUgc3RpbHRlZCBtZWNoYW5pY2FsIGNhZGVuY2Ugb2YgVGFrYWhhc2hpJ3MgcHJvZ3JhbW1lZCBKYXBhbmVzZSwgdG8gdGhlIGZyYWdyYW50IHN0ZWFtIHRoYXQgd2FmdHMgZnJvbSBlYWNoIGJvd2wsIHRvIHRoZSBzY2FsZGluZyB0YW5nIG9mIGVhY2ggZGVsaWNpb3VzIG1vdXRoZnVsIC0gdGhlIG9yZGVyaW5nIGFuZCBlYXRpbmcgb2Ygbm9vZGxlcyBpcyBidXQgb25lIG9mIG1hbnkgc2hhcmVkIGh1bWFuIGV4cGVyaWVuY2VzLiBPciBpcyBpdD9cXFwiIFxcbi1UaGUgU3ludGhldGljIFRydXRoXFxuXFxuVGhpcyBzdHJ1Y3R1cmUgZGlyZWN0bHkgb3Bwb3NpdGUgdGhlIGNpdHkncyBtYWluIGVudHJhbmNlIGluIHRoZSBjZW50ZXIgb2YgdGhlIG1hcmtldCBpcyBhIHNtYWxsIG91dGRvb3IgcmVzdGF1cmFudC4gQ291bnRlcnMgZW5jaXJjbGUgYSBjZW50cmFsIHBpbGxhciwgd2l0aCBUYWthaGFzaGkgYmVoaW5kIG9uZSBvZiB0aGVtLiBBIGNvb2tpbmcgc3RhdGlvbiBzaXRzIG5lYXJieS4gVGhlIHBpbGxhciBmZWF0dXJlcyBhIGZ1bmN0aW9uYWwgcG93ZXIgcmVhY3Rvciwgc3VwcGx5aW5nIHRoZSBzdXJyb3VuZGluZyBidWlsZGluZ3Mgd2l0aCBlbGVjdHJpY2l0eS5cXG5cXG5BcHByb3hpbWF0ZWx5IDQzIHllYXJzIGJlZm9yZSBQb3dlciBOb29kbGVzIHdhcyBlc3RhYmxpc2hlZCwgYSBiYXIgdGhhdCBvY2N1cGllZCB0aGUgc2FtZSBzcGFjZSBpbiB0aGUgbWFya2V0IHdhcyB0aGUgc2NlbmUgb2YgdGhlIEJyb2tlbiBNYXNrIGluY2lkZW50LiBUaGlzIHZpb2xlbnQgZXZlbnQgcmVzdWx0ZWQgaW4gdGhlIGRlYXRoIG9mIHRlbiBpbmRpdmlkdWFscyBhdCB0aGUgaGFuZCBvZiBhIG1hbGZ1bmN0aW9uaW5nIEluc3RpdHV0ZSBzeW50aCBpbiBNYXkgMjIyOS5cXG5cXG5VcG9uIG1lZXRpbmcgVGFrYWhhc2hpIGZvciB0aGUgZmlyc3QgdGltZSBhbmQgaGVhcmluZyBoaXMgc2lnbmF0dXJlIHF1ZXN0aW9uIChcXFwiTmFuLW5pIHNoaW1hc2tvLWthP1xcXCIpLCBhIG5lYXJieSByZXNpZGVudCB3aWxsIHNheSBcXFwiSnVzdCBzYXkgeWVzLCBpdCdzIGFsbCBoZSB1bmRlcnN0YW5kcy5cXFwiXFxuXFxuQ29tcGFuaW9ucyB3aWxsIHRyeSB0byB0YWxrIHRvIFRha2FoYXNoaSB3aGVuIGFycml2aW5nIGluIHRoZSBEaWFtb25kIENpdHkgbWFya2V0IGZvciB0aGUgZmlyc3QgdGltZS5cXG5cXG5NYWNDcmVhZHkgZW5qb3lzIFRha2FoYXNoaSdzIG5vb2RsZXMgaW1tZW5zZWx5LiBJZiBoZSBpcyB0aGUgU29sZSBTdXJ2aXZvcidzIGN1cnJlbnQgY29tcGFuaW9uLCBoZSBhY2NlcHRzIGEgYm93bCBmcm9tIHRoZSByb2JvdGljIGNoZWYsIGFuZCB3aGVuIGZpbmlzaGVkLCBlbnRodXNpYXN0aWNhbGx5IGFza3MgZm9yIG1vcmUuXFxuXFxuSWYgdmlzaXRpbmcgRGlhbW9uZCBDaXR5IG9uIEhhbGxvd2VlbiwgUG93ZXIgTm9vZGxlcyBpcyBkZWNvcmF0ZWQgd2l0aCByZWQgc2t1bGwgY3V0b3V0cyBvbiB0aGUgY291bnRlciBhbmQgXFxcIkhhcHB5IEhhbGxvd2VlblxcXCIgYmFubmVycyBzdHJldGNoZWQgYWNyb3NzIHRoZSBjYW5vcHkuXFxuXFxuSWYgdmlzaXRpbmcgRGlhbW9uZCBDaXR5IG9uIENocmlzdG1hcywgUG93ZXIgTm9vZGxlcyBpcyBkZWNvcmF0ZWQgd2l0aCBDaHJpc3RtYXMgdHJlZXMgYW5kIGxpZ2h0cyBjb25uZWN0ZWQgdG8gc3Vycm91bmRpbmcgYnVpbGRpbmdzLlxcblxcblRoZSBGYXIgSGFyYm9yIG5vdGUgVGFzdGUgdGVzdCBmb3VuZCBpbiB0aGUgTnVjbGV1cyBtYWtlcyBhIHJlZmVyZW5jZSB0byBQb3dlciBOb29kbGVzLlxcblwiOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIEdldEludHJpbnNpYyA9IHJlcXVpcmUoJ2dldC1pbnRyaW5zaWMnKTtcbnZhciBjYWxsQm91bmQgPSByZXF1aXJlKCdjYWxsLWJpbmQvY2FsbEJvdW5kJyk7XG52YXIgaW5zcGVjdCA9IHJlcXVpcmUoJ29iamVjdC1pbnNwZWN0Jyk7XG5cbnZhciAkVHlwZUVycm9yID0gR2V0SW50cmluc2ljKCclVHlwZUVycm9yJScpO1xudmFyICRXZWFrTWFwID0gR2V0SW50cmluc2ljKCclV2Vha01hcCUnLCB0cnVlKTtcbnZhciAkTWFwID0gR2V0SW50cmluc2ljKCclTWFwJScsIHRydWUpO1xuXG52YXIgJHdlYWtNYXBHZXQgPSBjYWxsQm91bmQoJ1dlYWtNYXAucHJvdG90eXBlLmdldCcsIHRydWUpO1xudmFyICR3ZWFrTWFwU2V0ID0gY2FsbEJvdW5kKCdXZWFrTWFwLnByb3RvdHlwZS5zZXQnLCB0cnVlKTtcbnZhciAkd2Vha01hcEhhcyA9IGNhbGxCb3VuZCgnV2Vha01hcC5wcm90b3R5cGUuaGFzJywgdHJ1ZSk7XG52YXIgJG1hcEdldCA9IGNhbGxCb3VuZCgnTWFwLnByb3RvdHlwZS5nZXQnLCB0cnVlKTtcbnZhciAkbWFwU2V0ID0gY2FsbEJvdW5kKCdNYXAucHJvdG90eXBlLnNldCcsIHRydWUpO1xudmFyICRtYXBIYXMgPSBjYWxsQm91bmQoJ01hcC5wcm90b3R5cGUuaGFzJywgdHJ1ZSk7XG5cbi8qXG4gKiBUaGlzIGZ1bmN0aW9uIHRyYXZlcnNlcyB0aGUgbGlzdCByZXR1cm5pbmcgdGhlIG5vZGUgY29ycmVzcG9uZGluZyB0byB0aGVcbiAqIGdpdmVuIGtleS5cbiAqXG4gKiBUaGF0IG5vZGUgaXMgYWxzbyBtb3ZlZCB0byB0aGUgaGVhZCBvZiB0aGUgbGlzdCwgc28gdGhhdCBpZiBpdCdzIGFjY2Vzc2VkXG4gKiBhZ2FpbiB3ZSBkb24ndCBuZWVkIHRvIHRyYXZlcnNlIHRoZSB3aG9sZSBsaXN0LiBCeSBkb2luZyBzbywgYWxsIHRoZSByZWNlbnRseVxuICogdXNlZCBub2RlcyBjYW4gYmUgYWNjZXNzZWQgcmVsYXRpdmVseSBxdWlja2x5LlxuICovXG52YXIgbGlzdEdldE5vZGUgPSBmdW5jdGlvbiAobGlzdCwga2V5KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY29uc2lzdGVudC1yZXR1cm5cblx0Zm9yICh2YXIgcHJldiA9IGxpc3QsIGN1cnI7IChjdXJyID0gcHJldi5uZXh0KSAhPT0gbnVsbDsgcHJldiA9IGN1cnIpIHtcblx0XHRpZiAoY3Vyci5rZXkgPT09IGtleSkge1xuXHRcdFx0cHJldi5uZXh0ID0gY3Vyci5uZXh0O1xuXHRcdFx0Y3Vyci5uZXh0ID0gbGlzdC5uZXh0O1xuXHRcdFx0bGlzdC5uZXh0ID0gY3VycjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuXHRcdFx0cmV0dXJuIGN1cnI7XG5cdFx0fVxuXHR9XG59O1xuXG52YXIgbGlzdEdldCA9IGZ1bmN0aW9uIChvYmplY3RzLCBrZXkpIHtcblx0dmFyIG5vZGUgPSBsaXN0R2V0Tm9kZShvYmplY3RzLCBrZXkpO1xuXHRyZXR1cm4gbm9kZSAmJiBub2RlLnZhbHVlO1xufTtcbnZhciBsaXN0U2V0ID0gZnVuY3Rpb24gKG9iamVjdHMsIGtleSwgdmFsdWUpIHtcblx0dmFyIG5vZGUgPSBsaXN0R2V0Tm9kZShvYmplY3RzLCBrZXkpO1xuXHRpZiAobm9kZSkge1xuXHRcdG5vZGUudmFsdWUgPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHQvLyBQcmVwZW5kIHRoZSBuZXcgbm9kZSB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaXN0XG5cdFx0b2JqZWN0cy5uZXh0ID0geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG5cdFx0XHRrZXk6IGtleSxcblx0XHRcdG5leHQ6IG9iamVjdHMubmV4dCxcblx0XHRcdHZhbHVlOiB2YWx1ZVxuXHRcdH07XG5cdH1cbn07XG52YXIgbGlzdEhhcyA9IGZ1bmN0aW9uIChvYmplY3RzLCBrZXkpIHtcblx0cmV0dXJuICEhbGlzdEdldE5vZGUob2JqZWN0cywga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2V0U2lkZUNoYW5uZWwoKSB7XG5cdHZhciAkd207XG5cdHZhciAkbTtcblx0dmFyICRvO1xuXHR2YXIgY2hhbm5lbCA9IHtcblx0XHRhc3NlcnQ6IGZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdGlmICghY2hhbm5lbC5oYXMoa2V5KSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignU2lkZSBjaGFubmVsIGRvZXMgbm90IGNvbnRhaW4gJyArIGluc3BlY3Qoa2V5KSk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRnZXQ6IGZ1bmN0aW9uIChrZXkpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb25zaXN0ZW50LXJldHVyblxuXHRcdFx0aWYgKCRXZWFrTWFwICYmIGtleSAmJiAodHlwZW9mIGtleSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIGtleSA9PT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdFx0aWYgKCR3bSkge1xuXHRcdFx0XHRcdHJldHVybiAkd2Vha01hcEdldCgkd20sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoJE1hcCkge1xuXHRcdFx0XHRpZiAoJG0pIHtcblx0XHRcdFx0XHRyZXR1cm4gJG1hcEdldCgkbSwga2V5KTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCRvKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbG9uZWx5LWlmXG5cdFx0XHRcdFx0cmV0dXJuIGxpc3RHZXQoJG8sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdGhhczogZnVuY3Rpb24gKGtleSkge1xuXHRcdFx0aWYgKCRXZWFrTWFwICYmIGtleSAmJiAodHlwZW9mIGtleSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIGtleSA9PT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdFx0aWYgKCR3bSkge1xuXHRcdFx0XHRcdHJldHVybiAkd2Vha01hcEhhcygkd20sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoJE1hcCkge1xuXHRcdFx0XHRpZiAoJG0pIHtcblx0XHRcdFx0XHRyZXR1cm4gJG1hcEhhcygkbSwga2V5KTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCRvKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbG9uZWx5LWlmXG5cdFx0XHRcdFx0cmV0dXJuIGxpc3RIYXMoJG8sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LFxuXHRcdHNldDogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcblx0XHRcdGlmICgkV2Vha01hcCAmJiBrZXkgJiYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBrZXkgPT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHRcdGlmICghJHdtKSB7XG5cdFx0XHRcdFx0JHdtID0gbmV3ICRXZWFrTWFwKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JHdlYWtNYXBTZXQoJHdtLCBrZXksIHZhbHVlKTtcblx0XHRcdH0gZWxzZSBpZiAoJE1hcCkge1xuXHRcdFx0XHRpZiAoISRtKSB7XG5cdFx0XHRcdFx0JG0gPSBuZXcgJE1hcCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCRtYXBTZXQoJG0sIGtleSwgdmFsdWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCEkbykge1xuXHRcdFx0XHRcdC8qXG5cdFx0XHRcdFx0ICogSW5pdGlhbGl6ZSB0aGUgbGlua2VkIGxpc3QgYXMgYW4gZW1wdHkgbm9kZSwgc28gdGhhdCB3ZSBkb24ndCBoYXZlXG5cdFx0XHRcdFx0ICogdG8gc3BlY2lhbC1jYXNlIGhhbmRsaW5nIG9mIHRoZSBmaXJzdCBub2RlOiB3ZSBjYW4gYWx3YXlzIHJlZmVyIHRvXG5cdFx0XHRcdFx0ICogaXQgYXMgKHByZXZpb3VzIG5vZGUpLm5leHQsIGluc3RlYWQgb2Ygc29tZXRoaW5nIGxpa2UgKGxpc3QpLmhlYWRcblx0XHRcdFx0XHQgKi9cblx0XHRcdFx0XHQkbyA9IHsga2V5OiB7fSwgbmV4dDogbnVsbCB9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxpc3RTZXQoJG8sIGtleSwgdmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblx0cmV0dXJuIGNoYW5uZWw7XG59O1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2dsb2JhbC5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2dsb2JhbC5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vaW5pdGlhbFBhZ2UuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9pbml0aWFsUGFnZS5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vbWVudS5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL21lbnUuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBzdHlsZXNJbkRPTSA9IFtdO1xuXG5mdW5jdGlvbiBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKSB7XG4gIHZhciByZXN1bHQgPSAtMTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0eWxlc0luRE9NLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHN0eWxlc0luRE9NW2ldLmlkZW50aWZpZXIgPT09IGlkZW50aWZpZXIpIHtcbiAgICAgIHJlc3VsdCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBtb2R1bGVzVG9Eb20obGlzdCwgb3B0aW9ucykge1xuICB2YXIgaWRDb3VudE1hcCA9IHt9O1xuICB2YXIgaWRlbnRpZmllcnMgPSBbXTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV07XG4gICAgdmFyIGlkID0gb3B0aW9ucy5iYXNlID8gaXRlbVswXSArIG9wdGlvbnMuYmFzZSA6IGl0ZW1bMF07XG4gICAgdmFyIGNvdW50ID0gaWRDb3VudE1hcFtpZF0gfHwgMDtcbiAgICB2YXIgaWRlbnRpZmllciA9IFwiXCIuY29uY2F0KGlkLCBcIiBcIikuY29uY2F0KGNvdW50KTtcbiAgICBpZENvdW50TWFwW2lkXSA9IGNvdW50ICsgMTtcbiAgICB2YXIgaW5kZXhCeUlkZW50aWZpZXIgPSBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICB2YXIgb2JqID0ge1xuICAgICAgY3NzOiBpdGVtWzFdLFxuICAgICAgbWVkaWE6IGl0ZW1bMl0sXG4gICAgICBzb3VyY2VNYXA6IGl0ZW1bM10sXG4gICAgICBzdXBwb3J0czogaXRlbVs0XSxcbiAgICAgIGxheWVyOiBpdGVtWzVdXG4gICAgfTtcblxuICAgIGlmIChpbmRleEJ5SWRlbnRpZmllciAhPT0gLTEpIHtcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4QnlJZGVudGlmaWVyXS5yZWZlcmVuY2VzKys7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleEJ5SWRlbnRpZmllcl0udXBkYXRlcihvYmopO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdXBkYXRlciA9IGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpO1xuICAgICAgb3B0aW9ucy5ieUluZGV4ID0gaTtcbiAgICAgIHN0eWxlc0luRE9NLnNwbGljZShpLCAwLCB7XG4gICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXG4gICAgICAgIHVwZGF0ZXI6IHVwZGF0ZXIsXG4gICAgICAgIHJlZmVyZW5jZXM6IDFcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlkZW50aWZpZXJzLnB1c2goaWRlbnRpZmllcik7XG4gIH1cblxuICByZXR1cm4gaWRlbnRpZmllcnM7XG59XG5cbmZ1bmN0aW9uIGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpIHtcbiAgdmFyIGFwaSA9IG9wdGlvbnMuZG9tQVBJKG9wdGlvbnMpO1xuICBhcGkudXBkYXRlKG9iaik7XG5cbiAgdmFyIHVwZGF0ZXIgPSBmdW5jdGlvbiB1cGRhdGVyKG5ld09iaikge1xuICAgIGlmIChuZXdPYmopIHtcbiAgICAgIGlmIChuZXdPYmouY3NzID09PSBvYmouY3NzICYmIG5ld09iai5tZWRpYSA9PT0gb2JqLm1lZGlhICYmIG5ld09iai5zb3VyY2VNYXAgPT09IG9iai5zb3VyY2VNYXAgJiYgbmV3T2JqLnN1cHBvcnRzID09PSBvYmouc3VwcG9ydHMgJiYgbmV3T2JqLmxheWVyID09PSBvYmoubGF5ZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBhcGkudXBkYXRlKG9iaiA9IG5ld09iaik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFwaS5yZW1vdmUoKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHVwZGF0ZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGxpc3QsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGxpc3QgPSBsaXN0IHx8IFtdO1xuICB2YXIgbGFzdElkZW50aWZpZXJzID0gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpO1xuICByZXR1cm4gZnVuY3Rpb24gdXBkYXRlKG5ld0xpc3QpIHtcbiAgICBuZXdMaXN0ID0gbmV3TGlzdCB8fCBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGFzdElkZW50aWZpZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaWRlbnRpZmllciA9IGxhc3RJZGVudGlmaWVyc1tpXTtcbiAgICAgIHZhciBpbmRleCA9IGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgICAgc3R5bGVzSW5ET01baW5kZXhdLnJlZmVyZW5jZXMtLTtcbiAgICB9XG5cbiAgICB2YXIgbmV3TGFzdElkZW50aWZpZXJzID0gbW9kdWxlc1RvRG9tKG5ld0xpc3QsIG9wdGlvbnMpO1xuXG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGxhc3RJZGVudGlmaWVycy5sZW5ndGg7IF9pKyspIHtcbiAgICAgIHZhciBfaWRlbnRpZmllciA9IGxhc3RJZGVudGlmaWVyc1tfaV07XG5cbiAgICAgIHZhciBfaW5kZXggPSBnZXRJbmRleEJ5SWRlbnRpZmllcihfaWRlbnRpZmllcik7XG5cbiAgICAgIGlmIChzdHlsZXNJbkRPTVtfaW5kZXhdLnJlZmVyZW5jZXMgPT09IDApIHtcbiAgICAgICAgc3R5bGVzSW5ET01bX2luZGV4XS51cGRhdGVyKCk7XG5cbiAgICAgICAgc3R5bGVzSW5ET00uc3BsaWNlKF9pbmRleCwgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGFzdElkZW50aWZpZXJzID0gbmV3TGFzdElkZW50aWZpZXJzO1xuICB9O1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIG1lbW8gPSB7fTtcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuXG5mdW5jdGlvbiBnZXRUYXJnZXQodGFyZ2V0KSB7XG4gIGlmICh0eXBlb2YgbWVtb1t0YXJnZXRdID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdmFyIHN0eWxlVGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXQpOyAvLyBTcGVjaWFsIGNhc2UgdG8gcmV0dXJuIGhlYWQgb2YgaWZyYW1lIGluc3RlYWQgb2YgaWZyYW1lIGl0c2VsZlxuXG4gICAgaWYgKHdpbmRvdy5IVE1MSUZyYW1lRWxlbWVudCAmJiBzdHlsZVRhcmdldCBpbnN0YW5jZW9mIHdpbmRvdy5IVE1MSUZyYW1lRWxlbWVudCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gVGhpcyB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbiBpZiBhY2Nlc3MgdG8gaWZyYW1lIGlzIGJsb2NrZWRcbiAgICAgICAgLy8gZHVlIHRvIGNyb3NzLW9yaWdpbiByZXN0cmljdGlvbnNcbiAgICAgICAgc3R5bGVUYXJnZXQgPSBzdHlsZVRhcmdldC5jb250ZW50RG9jdW1lbnQuaGVhZDtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gaXN0YW5idWwgaWdub3JlIG5leHRcbiAgICAgICAgc3R5bGVUYXJnZXQgPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIG1lbW9bdGFyZ2V0XSA9IHN0eWxlVGFyZ2V0O1xuICB9XG5cbiAgcmV0dXJuIG1lbW9bdGFyZ2V0XTtcbn1cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuXG5cbmZ1bmN0aW9uIGluc2VydEJ5U2VsZWN0b3IoaW5zZXJ0LCBzdHlsZSkge1xuICB2YXIgdGFyZ2V0ID0gZ2V0VGFyZ2V0KGluc2VydCk7XG5cbiAgaWYgKCF0YXJnZXQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZG4ndCBmaW5kIGEgc3R5bGUgdGFyZ2V0LiBUaGlzIHByb2JhYmx5IG1lYW5zIHRoYXQgdGhlIHZhbHVlIGZvciB0aGUgJ2luc2VydCcgcGFyYW1ldGVyIGlzIGludmFsaWQuXCIpO1xuICB9XG5cbiAgdGFyZ2V0LmFwcGVuZENoaWxkKHN0eWxlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRCeVNlbGVjdG9yOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKSB7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuICBvcHRpb25zLnNldEF0dHJpYnV0ZXMoZWxlbWVudCwgb3B0aW9ucy5hdHRyaWJ1dGVzKTtcbiAgb3B0aW9ucy5pbnNlcnQoZWxlbWVudCwgb3B0aW9ucy5vcHRpb25zKTtcbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5zZXJ0U3R5bGVFbGVtZW50OyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcyhzdHlsZUVsZW1lbnQpIHtcbiAgdmFyIG5vbmNlID0gdHlwZW9mIF9fd2VicGFja19ub25jZV9fICE9PSBcInVuZGVmaW5lZFwiID8gX193ZWJwYWNrX25vbmNlX18gOiBudWxsO1xuXG4gIGlmIChub25jZSkge1xuICAgIHN0eWxlRWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJub25jZVwiLCBub25jZSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gYXBwbHkoc3R5bGVFbGVtZW50LCBvcHRpb25zLCBvYmopIHtcbiAgdmFyIGNzcyA9IFwiXCI7XG5cbiAgaWYgKG9iai5zdXBwb3J0cykge1xuICAgIGNzcyArPSBcIkBzdXBwb3J0cyAoXCIuY29uY2F0KG9iai5zdXBwb3J0cywgXCIpIHtcIik7XG4gIH1cblxuICBpZiAob2JqLm1lZGlhKSB7XG4gICAgY3NzICs9IFwiQG1lZGlhIFwiLmNvbmNhdChvYmoubWVkaWEsIFwiIHtcIik7XG4gIH1cblxuICB2YXIgbmVlZExheWVyID0gdHlwZW9mIG9iai5sYXllciAhPT0gXCJ1bmRlZmluZWRcIjtcblxuICBpZiAobmVlZExheWVyKSB7XG4gICAgY3NzICs9IFwiQGxheWVyXCIuY29uY2F0KG9iai5sYXllci5sZW5ndGggPiAwID8gXCIgXCIuY29uY2F0KG9iai5sYXllcikgOiBcIlwiLCBcIiB7XCIpO1xuICB9XG5cbiAgY3NzICs9IG9iai5jc3M7XG5cbiAgaWYgKG5lZWRMYXllcikge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuXG4gIGlmIChvYmoubWVkaWEpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cblxuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG5cbiAgdmFyIHNvdXJjZU1hcCA9IG9iai5zb3VyY2VNYXA7XG5cbiAgaWYgKHNvdXJjZU1hcCAmJiB0eXBlb2YgYnRvYSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIGNzcyArPSBcIlxcbi8qIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsXCIuY29uY2F0KGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHNvdXJjZU1hcCkpKSksIFwiICovXCIpO1xuICB9IC8vIEZvciBvbGQgSUVcblxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgICovXG5cblxuICBvcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtKGNzcywgc3R5bGVFbGVtZW50LCBvcHRpb25zLm9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KSB7XG4gIC8vIGlzdGFuYnVsIGlnbm9yZSBpZlxuICBpZiAoc3R5bGVFbGVtZW50LnBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzdHlsZUVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQpO1xufVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5cblxuZnVuY3Rpb24gZG9tQVBJKG9wdGlvbnMpIHtcbiAgdmFyIHN0eWxlRWxlbWVudCA9IG9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMpO1xuICByZXR1cm4ge1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKG9iaikge1xuICAgICAgYXBwbHkoc3R5bGVFbGVtZW50LCBvcHRpb25zLCBvYmopO1xuICAgIH0sXG4gICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUoKSB7XG4gICAgICByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KTtcbiAgICB9XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZG9tQVBJOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIHN0eWxlVGFnVHJhbnNmb3JtKGNzcywgc3R5bGVFbGVtZW50KSB7XG4gIGlmIChzdHlsZUVsZW1lbnQuc3R5bGVTaGVldCkge1xuICAgIHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG4gIH0gZWxzZSB7XG4gICAgd2hpbGUgKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICBzdHlsZUVsZW1lbnQucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgIH1cblxuICAgIHN0eWxlRWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHN0eWxlVGFnVHJhbnNmb3JtOyIsImltcG9ydCBnaXRIdWJJY29uIGZyb20gJy4vaW1ncy9naXRodWIucG5nJztcbmltcG9ydCAnLi9nbG9iYWwuY3NzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlRm9vdGVyKGVsZW1lbnQpIHtcbiAgY29uc3QgZm9vdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZm9vdGVyJyk7XG4gIGZvb3Rlci5jbGFzc0xpc3QuYWRkKCdmb290ZXInKTtcbiAgZm9vdGVyLmNsYXNzTGlzdC5hZGQoJ2dsb3cnKTtcblxuICBjb25zdCBpY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gIGljb24uc3JjID0gZ2l0SHViSWNvbjtcblxuICBjb25zdCBhdXRob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMicpO1xuICBhdXRob3IuaW5uZXJUZXh0ID0gJ2pvcnRlZ2EyJztcblxuICBmb290ZXIuYXBwZW5kKGljb24pO1xuICBmb290ZXIuYXBwZW5kKGF1dGhvcik7XG5cbiAgZWxlbWVudC5hcHBlbmRDaGlsZChmb290ZXIpO1xufVxuIiwiaW1wb3J0ICcuL2luaXRpYWxQYWdlLmNzcyc7XG5pbXBvcnQgJy4vZ2xvYmFsLmNzcyc7XG5pbXBvcnQgZmFsbG91dExvZ28gZnJvbSAnLi9pbWdzL2ZhbGxvdXQucG5nJztcbmltcG9ydCBsb2NhdGlvbkltZyBmcm9tICcuL2ltZ3MvZGlhbW9uZGNpdHkuanBnJztcbmltcG9ydCBhYm91dCBmcm9tICcuL2Fib3V0LnR4dCc7XG5cbmZ1bmN0aW9uIGNyZWF0ZUhlYWRlcigpIHtcbiAgY29uc3QgaGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGhlYWRlci5jbGFzc0xpc3QuYWRkKCdoZWFkZXInKTtcbiAgaGVhZGVyLmNsYXNzTGlzdC5hZGQoJ2dsb3cnKTtcblxuICBjb25zdCB0aXRsZUJHID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHRpdGxlQkcuY2xhc3NMaXN0LmFkZCgnb3BhcXVlJyk7XG4gIHRpdGxlQkcudGV4dENvbnRlbnQgPSAnUG93ZXIgTm9vZGxlcyc7XG5cbiAgY29uc3QgbmF2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIG5hdi5jbGFzc0xpc3QuYWRkKCduYXZCYXInKTtcblxuICBjb25zdCBmYWxsb3V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gIGZhbGxvdXQuc3JjID0gZmFsbG91dExvZ287XG4gIGZhbGxvdXQuY2xhc3NMaXN0LmFkZCgndGl0bGVJbWcnKTtcblxuICBjb25zdCBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgYnV0dG9uLmNsYXNzTGlzdC5hZGQoJ25hdkJ1dHRvbicpO1xuICBidXR0b24udGV4dENvbnRlbnQgPSAnVmlldyB0aGUgTWVudSc7XG5cbiAgbmF2LmFwcGVuZENoaWxkKGZhbGxvdXQpO1xuICBuYXYuYXBwZW5kQ2hpbGQoYnV0dG9uKTtcblxuICBoZWFkZXIuYXBwZW5kKG5hdik7XG4gIGhlYWRlci5hcHBlbmQodGl0bGVCRyk7XG5cbiAgcmV0dXJuIGhlYWRlcjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWFwKCkge1xuICBjb25zdCBtYXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgbWFwLnNyYyA9IGxvY2F0aW9uSW1nO1xuICBtYXAuY2xhc3NMaXN0LmFkZCgnbWFwJyk7XG4gIG1hcC5jbGFzc0xpc3QuYWRkKCdnbG93Jyk7XG5cbiAgcmV0dXJuIG1hcDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSG91cnNUYWJsZSgpIHtcbiAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJyk7XG5cbiAgY29uc3QgY2FwdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhcHRpb24nKTtcbiAgY2FwdGlvbi50ZXh0Q29udGVudCA9ICdPUEVOSU5HIEhPVVJTJztcbiAgZWxlbWVudC5hcHBlbmRDaGlsZChjYXB0aW9uKTtcbiAgY29uc3QgZGF5cyA9IFsnTU9OJywgJ1RVRScsICdXRUQnLCAnVEhVJywgJ0ZSSScsICdTQVQnLCAnU1VOJ107XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCA3OyBpICs9IDEpIHtcbiAgICBjb25zdCBkYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuXG4gICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0aCcpO1xuICAgIGxhYmVsLmlubmVyVGV4dCA9IGRheXNbaV07XG5cbiAgICBjb25zdCBob3VycyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XG4gICAgaG91cnMuaW5uZXJUZXh0ID0gJzg6MDAgYS5tLiAtIDEwOjAwIHAubS4nO1xuXG4gICAgZGF5LmFwcGVuZChsYWJlbCk7XG4gICAgZGF5LmFwcGVuZChob3Vycyk7XG4gICAgZWxlbWVudC5hcHBlbmQoZGF5KTtcbiAgfVxuICByZXR1cm4gZWxlbWVudDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSG91cnMoKSB7XG4gIGNvbnN0IHN0b3JlSG91cnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgc3RvcmVIb3Vycy5jbGFzc0xpc3QuYWRkKCdzdG9yZUhvdXJzJyk7XG4gIHN0b3JlSG91cnMuY2xhc3NMaXN0LmFkZCgnZ2xvdycpO1xuXG4gIGNvbnN0IGhvdXJzVGFibGUgPSBjcmVhdGVIb3Vyc1RhYmxlKCk7XG5cbiAgc3RvcmVIb3Vycy5hcHBlbmQoaG91cnNUYWJsZSk7XG5cbiAgcmV0dXJuIHN0b3JlSG91cnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUluZm9ybWF0aW9uKCkge1xuICBjb25zdCBpbmZvcm1hdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBpbmZvcm1hdGlvbi5jbGFzc0xpc3QuYWRkKCdpbmZvcm1hdGlvbicpO1xuICBpbmZvcm1hdGlvbi5jbGFzc0xpc3QuYWRkKCdnbG93Jyk7XG5cbiAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMicpO1xuICB0aXRsZS5pbm5lclRleHQgPSAnRnJvbSB0aGUgV2lraSc7XG5cbiAgY29uc3QgaW5mbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgaW5mby5pbm5lclRleHQgPSBhYm91dDtcblxuICBpbmZvcm1hdGlvbi5hcHBlbmQodGl0bGUpO1xuICBpbmZvcm1hdGlvbi5hcHBlbmQoaW5mbyk7XG5cbiAgcmV0dXJuIGluZm9ybWF0aW9uO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0aWFsUGFnZShlbGVtZW50KSB7XG4gIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZUhlYWRlcigpKTtcbiAgZWxlbWVudC5hcHBlbmQoY3JlYXRlTWFwKCkpO1xuICBlbGVtZW50LmFwcGVuZChjcmVhdGVIb3VycygpKTtcbiAgZWxlbWVudC5hcHBlbmQoY3JlYXRlSW5mb3JtYXRpb24oKSk7XG59XG4iLCJpbXBvcnQgJy4vZ2xvYmFsLmNzcyc7XG5pbXBvcnQgJy4vbWVudS5jc3MnO1xuaW1wb3J0IHsgZGF0YSB9IGZyb20gJ2Jyb3dzZXJzbGlzdCc7XG5pbXBvcnQgbWVudUl0ZW1zIGZyb20gJy4vbWVudS5jc3YnO1xuaW1wb3J0IGZhbGxvdXRMb2dvIGZyb20gJy4vaW1ncy9mYWxsb3V0LnBuZyc7XG5cbmZ1bmN0aW9uIGFkZE1lbnUoZWxlbWVudCkge1xuICAvLyB0YWJsZSBjYXB0aW9uXG4gIGNvbnN0IGNhcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYXB0aW9uJyk7XG4gIGNhcHRpb24uaW5uZXJUZXh0ID0gJ091ciBNZW51JztcblxuICBlbGVtZW50LmFwcGVuZENoaWxkKGNhcHRpb24pO1xuICAvLyBjcmVhdGUgcm93cyBvZiB0YWJsZVxuICBmb3IgKGxldCBpID0gMDsgaSA8IG1lbnVJdGVtcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgZWxlbWVudC5hcHBlbmRDaGlsZChyb3cpO1xuICB9XG5cbiAgY29uc3QgeyBjaGlsZHJlbiB9ID0gZWxlbWVudDtcblxuICAvLyBjcmVhdGUgaGVhZGVyIHJvd1xuICBmb3IgKGxldCBpID0gMDsgaSA8IG1lbnVJdGVtc1swXS5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IHRhYmxlSGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGgnKTtcbiAgICB0YWJsZUhlYWRlci5pbm5lclRleHQgPSBtZW51SXRlbXNbMF1baV07XG5cbiAgICBjaGlsZHJlblsxXS5hcHBlbmQodGFibGVIZWFkZXIpO1xuICB9XG5cbiAgLy8gY3JlYXRlIGRhdGEgY2VsbHNcbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBtZW51SXRlbXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IG1lbnVJdGVtc1tpXS5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgY29uc3QgZGF0YUNlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuICAgICAgZGF0YUNlbGwuaW5uZXJUZXh0ID0gbWVudUl0ZW1zW2ldW2pdO1xuICAgICAgY2hpbGRyZW5baSArIDFdLmFwcGVuZChkYXRhQ2VsbCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJvZHkoKSB7XG4gIGNvbnN0IG1lbnVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgbWVudUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdtZW51Q29udGFpbmVyJyk7XG4gIG1lbnVDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZ2xvdycpO1xuXG4gIGNvbnN0IG5hdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBuYXYuY2xhc3NMaXN0LmFkZCgnbmF2QmFyJyk7XG5cbiAgY29uc3QgZmFsbG91dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICBmYWxsb3V0LnNyYyA9IGZhbGxvdXRMb2dvO1xuICBmYWxsb3V0LmNsYXNzTGlzdC5hZGQoJ3RpdGxlSW1nJyk7XG5cbiAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCduYXZCdXR0b24nKTtcbiAgYnV0dG9uLnRleHRDb250ZW50ID0gJ1JldHVybiB0byBIb21lJztcblxuICBjb25zdCBtZW51ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGFibGUnKTtcbiAgbWVudS5jbGFzc0xpc3QuYWRkKCdtZW51Jyk7XG4gIGFkZE1lbnUobWVudSk7XG5cbiAgbmF2LmFwcGVuZENoaWxkKGZhbGxvdXQpO1xuICBuYXYuYXBwZW5kQ2hpbGQoYnV0dG9uKTtcblxuICBtZW51Q29udGFpbmVyLmFwcGVuZChuYXYpO1xuICBtZW51Q29udGFpbmVyLmFwcGVuZChtZW51KTtcblxuICByZXR1cm4gbWVudUNvbnRhaW5lcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlTWVudVBhZ2UoZWxlbWVudCkge1xuICBlbGVtZW50LmFwcGVuZENoaWxkKGNyZWF0ZUJvZHkoKSk7XG59XG4iLCIvKiAoaWdub3JlZCkgKi8iLCIvKiAoaWdub3JlZCkgKi8iLCIvKiBlcy1tb2R1bGUtbGV4ZXIgMC45LjMgKi9cbmNvbnN0IEE9MT09PW5ldyBVaW50OEFycmF5KG5ldyBVaW50MTZBcnJheShbMV0pLmJ1ZmZlcilbMF07ZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKEUsST1cIkBcIil7aWYoIUIpcmV0dXJuIGluaXQudGhlbigoKT0+cGFyc2UoRSkpO2NvbnN0IGc9RS5sZW5ndGgrMSxEPShCLl9faGVhcF9iYXNlLnZhbHVlfHxCLl9faGVhcF9iYXNlKSs0KmctQi5tZW1vcnkuYnVmZmVyLmJ5dGVMZW5ndGg7RD4wJiZCLm1lbW9yeS5ncm93KE1hdGguY2VpbChELzY1NTM2KSk7Y29uc3Qgdz1CLnNhKGctMSk7aWYoKEE/QzpRKShFLG5ldyBVaW50MTZBcnJheShCLm1lbW9yeS5idWZmZXIsdyxnKSksIUIucGFyc2UoKSl0aHJvdyBPYmplY3QuYXNzaWduKG5ldyBFcnJvcihgUGFyc2UgZXJyb3IgJHtJfToke0Uuc2xpY2UoMCxCLmUoKSkuc3BsaXQoXCJcXG5cIikubGVuZ3RofToke0IuZSgpLUUubGFzdEluZGV4T2YoXCJcXG5cIixCLmUoKS0xKX1gKSx7aWR4OkIuZSgpfSk7Y29uc3QgTD1bXSxrPVtdO2Zvcig7Qi5yaSgpOyl7Y29uc3QgQT1CLmlzKCksUT1CLmllKCksQz1CLmFpKCksST1CLmlkKCksZz1CLnNzKCksRD1CLnNlKCk7bGV0IHc7Qi5pcCgpJiYodz1KKEUuc2xpY2UoLTE9PT1JP0EtMTpBLC0xPT09ST9RKzE6USkpKSxMLnB1c2goe246dyxzOkEsZTpRLHNzOmcsc2U6RCxkOkksYTpDfSl9Zm9yKDtCLnJlKCk7KXtjb25zdCBBPUUuc2xpY2UoQi5lcygpLEIuZWUoKSksUT1BWzBdO2sucHVzaCgnXCInPT09UXx8XCInXCI9PT1RP0ooQSk6QSl9ZnVuY3Rpb24gSihBKXt0cnl7cmV0dXJuKDAsZXZhbCkoQSl9Y2F0Y2goQSl7fX1yZXR1cm5bTCxrLCEhQi5mKCldfWZ1bmN0aW9uIFEoQSxRKXtjb25zdCBDPUEubGVuZ3RoO2xldCBCPTA7Zm9yKDtCPEM7KXtjb25zdCBDPUEuY2hhckNvZGVBdChCKTtRW0IrK109KDI1NSZDKTw8OHxDPj4+OH19ZnVuY3Rpb24gQyhBLFEpe2NvbnN0IEM9QS5sZW5ndGg7bGV0IEI9MDtmb3IoO0I8QzspUVtCXT1BLmNoYXJDb2RlQXQoQisrKX1sZXQgQjtleHBvcnQgY29uc3QgaW5pdD1XZWJBc3NlbWJseS5jb21waWxlKChFPVwiQUdGemJRRUFBQUFCWEExZ0FYOEJmMkFFZjM5L2Z3QmdBbjkvQUdBQUFYOWdCbjkvZjM5L2Z3Ri9ZQUFBWUFGL0FHQUVmMzkvZndGL1lBTi9mMzhCZjJBSGYzOS9mMzkvZndGL1lBVi9mMzkvZndGL1lBSi9md0YvWUFoL2YzOS9mMzkvZndGL0F6RXdBQUVDQXdNREF3TURBd01EQXdNREF3QUFCQVVGQlFZRkJnQUFBQUFGQlFBRUJ3Z0pDZ3NNQUFJQUFBQUxBd2tNQkFVQmNBRUJBUVVEQVFBQkJnOENmd0ZCOFBBQUMzOEFRZkR3QUFzSFpCRUdiV1Z0YjNKNUFnQUNjMkVBQUFGbEFBTUNhWE1BQkFKcFpRQUZBbk56QUFZQ2MyVUFCd0poYVFBSUFtbGtBQWtDYVhBQUNnSmxjd0FMQW1WbEFBd0NjbWtBRFFKeVpRQU9BV1lBRHdWd1lYSnpaUUFRQzE5ZmFHVmhjRjlpWVhObEF3RUs4amt3YUFFQmYwRUFJQUEyQXJnSVFRQW9BcEFJSWdFZ0FFRUJkR29pQUVFQU93RUFRUUFnQUVFQ2FpSUFOZ0s4Q0VFQUlBQTJBc0FJUVFCQkFEWUNsQWhCQUVFQU5nS2tDRUVBUVFBMkFwd0lRUUJCQURZQ21BaEJBRUVBTmdLc0NFRUFRUUEyQXFBSUlBRUxzZ0VCQW45QkFDZ0NwQWdpQkVFY2FrR1VDQ0FFRzBFQUtBTEFDQ0lGTmdJQVFRQWdCVFlDcEFoQkFDQUVOZ0tvQ0VFQUlBVkJJR28yQXNBSUlBVWdBRFlDQ0FKQUFrQkJBQ2dDaUFnZ0EwY05BQ0FGSUFJMkFnd01BUXNDUUVFQUtBS0VDQ0FEUncwQUlBVWdBa0VDYWpZQ0RBd0JDeUFGUVFBb0FwQUlOZ0lNQ3lBRklBRTJBZ0FnQlNBRE5nSVVJQVZCQURZQ0VDQUZJQUkyQWdRZ0JVRUFOZ0ljSUFWQkFDZ0NoQWdnQTBZNkFCZ0xTQUVCZjBFQUtBS3NDQ0lDUVFocVFaZ0lJQUliUVFBb0FzQUlJZ0kyQWdCQkFDQUNOZ0tzQ0VFQUlBSkJER28yQXNBSUlBSkJBRFlDQ0NBQ0lBRTJBZ1FnQWlBQU5nSUFDd2dBUVFBb0FzUUlDeFVBUVFBb0Fwd0lLQUlBUVFBb0FwQUlhMEVCZFFzVkFFRUFLQUtjQ0NnQ0JFRUFLQUtRQ0d0QkFYVUxGUUJCQUNnQ25BZ29BZ2hCQUNnQ2tBaHJRUUYxQ3hVQVFRQW9BcHdJS0FJTVFRQW9BcEFJYTBFQmRRc2VBUUYvUVFBb0Fwd0lLQUlRSWdCQkFDZ0NrQWhyUVFGMVFYOGdBQnNMT3dFQmZ3SkFRUUFvQXB3SUtBSVVJZ0JCQUNnQ2hBaEhEUUJCZnc4TEFrQWdBRUVBS0FLSUNFY05BRUYrRHdzZ0FFRUFLQUtRQ0d0QkFYVUxDd0JCQUNnQ25BZ3RBQmdMRlFCQkFDZ0NvQWdvQWdCQkFDZ0NrQWhyUVFGMUN4VUFRUUFvQXFBSUtBSUVRUUFvQXBBSWEwRUJkUXNsQVFGL1FRQkJBQ2dDbkFnaUFFRWNha0dVQ0NBQUd5Z0NBQ0lBTmdLY0NDQUFRUUJIQ3lVQkFYOUJBRUVBS0FLZ0NDSUFRUWhxUVpnSUlBQWJLQUlBSWdBMkFxQUlJQUJCQUVjTENBQkJBQzBBeUFnTDlnc0JCSDhqQUVHQThBQnJJZ0VrQUVFQVFRRTZBTWdJUVFCQi8vOERPd0hPQ0VFQVFRQW9Bb3dJTmdMUUNFRUFRUUFvQXBBSVFYNXFJZ0kyQXVRSVFRQWdBa0VBS0FLNENFRUJkR29pQXpZQzZBaEJBRUVBT3dIS0NFRUFRUUE3QWN3SVFRQkJBRG9BMUFoQkFFRUFOZ0xFQ0VFQVFRQTZBTFFJUVFBZ0FVR0EwQUJxTmdMWUNFRUFJQUZCZ0JCcU5nTGNDRUVBUVFBNkFPQUlBa0FDUUFKQUFrQURRRUVBSUFKQkFtb2lCRFlDNUFnZ0FpQURUdzBCQWtBZ0JDOEJBQ0lEUVhkcVFRVkpEUUFDUUFKQUFrQUNRQUpBSUFOQm0zOXFEZ1VCQ0FnSUFnQUxJQU5CSUVZTkJDQURRUzlHRFFNZ0EwRTdSZzBDREFjTFFRQXZBY3dJRFFFZ0JCQVJSUTBCSUFKQkJHcEIrQUJCOEFCQjd3QkI4Z0JCOUFBUUVrVU5BUkFUUVFBdEFNZ0lEUUZCQUVFQUtBTGtDQ0lDTmdMUUNBd0hDeUFFRUJGRkRRQWdBa0VFYWtIdEFFSHdBRUh2QUVIeUFFSDBBQkFTUlEwQUVCUUxRUUJCQUNnQzVBZzJBdEFJREFFTEFrQWdBaThCQkNJRVFTcEdEUUFnQkVFdlJ3MEVFQlVNQVF0QkFSQVdDMEVBS0FMb0NDRURRUUFvQXVRSUlRSU1BQXNMUVFBaEF5QUVJUUpCQUMwQXRBZ05BZ3dCQzBFQUlBSTJBdVFJUVFCQkFEb0F5QWdMQTBCQkFDQUNRUUpxSWdRMkF1UUlBa0FDUUFKQUFrQUNRQUpBSUFKQkFDZ0M2QWhQRFFBZ0JDOEJBQ0lEUVhkcVFRVkpEUVVDUUFKQUFrQUNRQUpBQWtBQ1FBSkFBa0FDUUNBRFFXQnFEZ29QRGdnT0RnNE9Cd0VDQUFzQ1FBSkFBa0FDUUNBRFFhQi9hZzRLQ0JFUkF4RUJFUkVSQWdBTElBTkJoWDlxRGdNRkVBWUxDMEVBTHdITUNBMFBJQVFRRVVVTkR5QUNRUVJxUWZnQVFmQUFRZThBUWZJQVFmUUFFQkpGRFE4UUV3d1BDeUFFRUJGRkRRNGdBa0VFYWtIdEFFSHdBRUh2QUVIeUFFSDBBQkFTUlEwT0VCUU1EZ3NnQkJBUlJRME5JQUl2QVFwQjh3QkhEUTBnQWk4QkNFSHpBRWNORFNBQ0x3RUdRZUVBUncwTklBSXZBUVJCN0FCSERRMGdBaThCRENJRVFYZHFJZ0pCRjBzTkMwRUJJQUowUVorQWdBUnhSUTBMREF3TFFRQkJBQzhCekFnaUFrRUJhanNCekFoQkFDZ0MzQWdnQWtFQ2RHcEJBQ2dDMEFnMkFnQU1EQXRCQUM4QnpBZ2lBa1VOQ0VFQUlBSkJmMm9pQXpzQnpBaEJBQ2dDc0FnaUFrVU5DeUFDS0FJVVFRQW9BdHdJSUFOQi8vOERjVUVDZEdvb0FnQkhEUXNDUUNBQ0tBSUVEUUFnQWlBRU5nSUVDeUFDSUFRMkFneEJBRUVBTmdLd0NBd0xDd0pBUVFBb0F0QUlJZ1F2QVFCQktVY05BRUVBS0FLa0NDSUNSUTBBSUFJb0FnUWdCRWNOQUVFQVFRQW9BcWdJSWdJMkFxUUlBa0FnQWtVTkFDQUNRUUEyQWh3TUFRdEJBRUVBTmdLVUNBc2dBVUVBTHdITUNDSUNha0VBTFFEZ0NEb0FBRUVBSUFKQkFXbzdBY3dJUVFBb0F0d0lJQUpCQW5ScUlBUTJBZ0JCQUVFQU9nRGdDQXdLQzBFQUx3SE1DQ0lDUlEwR1FRQWdBa0YvYWlJRE93SE1DQ0FDUVFBdkFjNElJZ1JIRFFGQkFFRUFMd0hLQ0VGL2FpSUNPd0hLQ0VFQVFRQW9BdGdJSUFKQi8vOERjVUVCZEdvdkFRQTdBYzRJQ3hBWERBZ0xJQVJCLy84RFJnMEhJQU5CLy84RGNTQUVTUTBFREFjTFFTY1FHQXdHQzBFaUVCZ01CUXNnQTBFdlJ3MEVBa0FDUUNBQ0x3RUVJZ0pCS2tZTkFDQUNRUzlIRFFFUUZRd0hDMEVCRUJZTUJnc0NRQUpBQWtBQ1FFRUFLQUxRQ0NJRUx3RUFJZ0lRR1VVTkFBSkFBa0FDUUNBQ1FWVnFEZ1FCQlFJQUJRc2dCRUYrYWk4QkFFRlFha0gvL3dOeFFRcEpEUU1NQkFzZ0JFRithaThCQUVFclJnMENEQU1MSUFSQmZtb3ZBUUJCTFVZTkFRd0NDd0pBSUFKQi9RQkdEUUFnQWtFcFJ3MEJRUUFvQXR3SVFRQXZBY3dJUVFKMGFpZ0NBQkFhUlEwQkRBSUxRUUFvQXR3SVFRQXZBY3dJSWdOQkFuUnFLQUlBRUJzTkFTQUJJQU5xTFFBQURRRUxJQVFRSEEwQUlBSkZEUUJCQVNFRUlBSkJMMFpCQUMwQTFBaEJBRWR4UlEwQkN4QWRRUUFoQkF0QkFDQUVPZ0RVQ0F3RUMwRUFMd0hPQ0VILy93TkdRUUF2QWN3SVJYRkJBQzBBdEFoRmNTRUREQVlMRUI1QkFDRUREQVVMSUFSQm9BRkhEUUVMUVFCQkFUb0E0QWdMUVFCQkFDZ0M1QWcyQXRBSUMwRUFLQUxrQ0NFQ0RBQUxDeUFCUVlEd0FHb2tBQ0FEQ3gwQUFrQkJBQ2dDa0FnZ0FFY05BRUVCRHdzZ0FFRithaThCQUJBZkN6OEJBWDlCQUNFR0FrQWdBQzhCQ0NBRlJ3MEFJQUF2QVFZZ0JFY05BQ0FBTHdFRUlBTkhEUUFnQUM4QkFpQUNSdzBBSUFBdkFRQWdBVVloQmdzZ0JndlVCZ0VFZjBFQVFRQW9BdVFJSWdCQkRHb2lBVFlDNUFoQkFSQW5JUUlDUUFKQUFrQUNRQUpBUVFBb0F1UUlJZ01nQVVjTkFDQUNFQ3RGRFFFTEFrQUNRQUpBQWtBQ1FDQUNRWjkvYWc0TUJnRURDQUVIQVFFQkFRRUVBQXNDUUFKQUlBSkJLa1lOQUNBQ1FmWUFSZzBGSUFKQit3QkhEUUpCQUNBRFFRSnFOZ0xrQ0VFQkVDY2hBMEVBS0FMa0NDRUJBMEFDUUFKQUlBTkIvLzhEY1NJQ1FTSkdEUUFnQWtFblJnMEFJQUlRS2hwQkFDZ0M1QWdoQWd3QkN5QUNFQmhCQUVFQUtBTGtDRUVDYWlJQ05nTGtDQXRCQVJBbkdnSkFJQUVnQWhBc0lnTkJMRWNOQUVFQVFRQW9BdVFJUVFKcU5nTGtDRUVCRUNjaEF3dEJBQ2dDNUFnaEFnSkFJQU5CL1FCR0RRQWdBaUFCUmcwRklBSWhBU0FDUVFBb0F1Z0lUUTBCREFVTEMwRUFJQUpCQW1vMkF1UUlEQUVMUVFBZ0EwRUNhallDNUFoQkFSQW5Ha0VBS0FMa0NDSUNJQUlRTEJvTFFRRVFKeUVDQzBFQUtBTGtDQ0VEQWtBZ0FrSG1BRWNOQUNBREx3RUdRZTBBUncwQUlBTXZBUVJCN3dCSERRQWdBeThCQWtIeUFFY05BRUVBSUFOQkNHbzJBdVFJSUFCQkFSQW5FQ2dQQzBFQUlBTkJmbW8yQXVRSURBTUxFQjRQQ3dKQUlBTXZBUWhCOHdCSERRQWdBeThCQmtIekFFY05BQ0FETHdFRVFlRUFSdzBBSUFNdkFRSkI3QUJIRFFBZ0F5OEJDaEFmUlEwQVFRQWdBMEVLYWpZQzVBaEJBUkFuSVFKQkFDZ0M1QWdoQXlBQ0VDb2FJQU5CQUNnQzVBZ1FBa0VBUVFBb0F1UUlRWDVxTmdMa0NBOExRUUFnQTBFRWFpSUROZ0xrQ0F0QkFDQURRUVJxSWdJMkF1UUlRUUJCQURvQXlBZ0RRRUVBSUFKQkFtbzJBdVFJUVFFUUp5RURRUUFvQXVRSUlRSUNRQ0FERUNwQklISkIrd0JIRFFCQkFFRUFLQUxrQ0VGK2FqWUM1QWdQQzBFQUtBTGtDQ0lESUFKR0RRRWdBaUFERUFJQ1FFRUJFQ2NpQWtFc1JnMEFBa0FnQWtFOVJ3MEFRUUJCQUNnQzVBaEJmbW8yQXVRSUR3dEJBRUVBS0FMa0NFRithallDNUFnUEMwRUFLQUxrQ0NFQ0RBQUxDdzhMUVFBZ0EwRUthallDNUFoQkFSQW5Ha0VBS0FMa0NDRURDMEVBSUFOQkVHbzJBdVFJQWtCQkFSQW5JZ0pCS2tjTkFFRUFRUUFvQXVRSVFRSnFOZ0xrQ0VFQkVDY2hBZ3RCQUNnQzVBZ2hBeUFDRUNvYUlBTkJBQ2dDNUFnUUFrRUFRUUFvQXVRSVFYNXFOZ0xrQ0E4TElBTWdBMEVPYWhBQ0M2NEdBUVIvUVFCQkFDZ0M1QWdpQUVFTWFpSUJOZ0xrQ0FKQUFrQUNRQUpBQWtBQ1FBSkFBa0FDUUFKQVFRRVFKeUlDUVZscURnZ0NDQUVDQVFFQkJ3QUxJQUpCSWtZTkFTQUNRZnNBUmcwQ0MwRUFLQUxrQ0NBQlJnMEhDMEVBTHdITUNBMEJRUUFvQXVRSUlRSkJBQ2dDNkFnaEF3TkFJQUlnQTA4TkJBSkFBa0FnQWk4QkFDSUJRU2RHRFFBZ0FVRWlSdzBCQ3lBQUlBRVFLQThMUVFBZ0FrRUNhaUlDTmdMa0NBd0FDd3RCQUNnQzVBZ2hBa0VBTHdITUNBMEJBa0FEUUFKQUFrQUNRQ0FDUVFBb0F1Z0lUdzBBUVFFUUp5SUNRU0pHRFFFZ0FrRW5SZzBCSUFKQi9RQkhEUUpCQUVFQUtBTGtDRUVDYWpZQzVBZ0xRUUVRSnhwQkFDZ0M1QWdpQWk4QkJrSHRBRWNOQmlBQ0x3RUVRZThBUncwR0lBSXZBUUpCOGdCSERRWWdBaThCQUVIbUFFY05Ca0VBSUFKQkNHbzJBdVFJUVFFUUp5SUNRU0pHRFFNZ0FrRW5SZzBEREFZTElBSVFHQXRCQUVFQUtBTGtDRUVDYWlJQ05nTGtDQXdBQ3dzZ0FDQUNFQ2dNQlF0QkFFRUFLQUxrQ0VGK2FqWUM1QWdQQzBFQUlBSkJmbW8yQXVRSUR3c1FIZzhMUVFCQkFDZ0M1QWhCQW1vMkF1UUlRUUVRSjBIdEFFY05BVUVBS0FMa0NDSUNMd0VHUWVFQVJ3MEJJQUl2QVFSQjlBQkhEUUVnQWk4QkFrSGxBRWNOQVVFQUtBTFFDQzhCQUVFdVJnMEJJQUFnQUNBQ1FRaHFRUUFvQW9nSUVBRVBDMEVBS0FMY0NFRUFMd0hNQ0NJQ1FRSjBhaUFBTmdJQVFRQWdBa0VCYWpzQnpBaEJBQ2dDMEFndkFRQkJMa1lOQUNBQVFRQW9BdVFJUVFKcVFRQWdBQkFCUVFCQkFDZ0NwQWcyQXJBSVFRQkJBQ2dDNUFoQkFtbzJBdVFJQWtCQkFSQW5JZ0pCSWtZTkFDQUNRU2RHRFFCQkFFRUFLQUxrQ0VGK2FqWUM1QWdQQ3lBQ0VCaEJBRUVBS0FMa0NFRUNhallDNUFnQ1FBSkFBa0JCQVJBblFWZHFEZ1FCQWdJQUFndEJBQ2dDcEFoQkFDZ0M1QWdpQWpZQ0JFRUFJQUpCQW1vMkF1UUlRUUVRSnhwQkFDZ0NwQWdpQWtFQk9nQVlJQUpCQUNnQzVBZ2lBVFlDRUVFQUlBRkJmbW8yQXVRSUR3dEJBQ2dDcEFnaUFrRUJPZ0FZSUFKQkFDZ0M1QWdpQVRZQ0RDQUNJQUUyQWdSQkFFRUFMd0hNQ0VGL2Fqc0J6QWdQQzBFQVFRQW9BdVFJUVg1cU5nTGtDQThMQzBjQkEzOUJBQ2dDNUFoQkFtb2hBRUVBS0FMb0NDRUJBa0FEUUNBQUlnSkJmbW9nQVU4TkFTQUNRUUpxSVFBZ0FpOEJBRUYyYWc0RUFRQUFBUUFMQzBFQUlBSTJBdVFJQzVnQkFRTi9RUUJCQUNnQzVBZ2lBVUVDYWpZQzVBZ2dBVUVHYWlFQlFRQW9BdWdJSVFJRFFBSkFBa0FDUUNBQlFYeHFJQUpQRFFBZ0FVRithaThCQUNFREFrQUNRQ0FBRFFBZ0EwRXFSZzBCSUFOQmRtb09CQUlFQkFJRUN5QURRU3BIRFFNTElBRXZBUUJCTDBjTkFrRUFJQUZCZm1vMkF1UUlEQUVMSUFGQmZtb2hBUXRCQUNBQk5nTGtDQThMSUFGQkFtb2hBUXdBQ3d1L0FRRUVmMEVBS0FMa0NDRUFRUUFvQXVnSUlRRUNRQUpBQTBBZ0FDSUNRUUpxSVFBZ0FpQUJUdzBCQWtBQ1FDQUFMd0VBSWdOQnBIOXFEZ1VCQWdJQ0JBQUxJQU5CSkVjTkFTQUNMd0VFUWZzQVJ3MEJRUUJCQUM4QnlnZ2lBRUVCYWpzQnlnaEJBQ2dDMkFnZ0FFRUJkR3BCQUM4QnpnZzdBUUJCQUNBQ1FRUnFOZ0xrQ0VFQVFRQXZBY3dJUVFGcUlnQTdBYzRJUVFBZ0FEc0J6QWdQQ3lBQ1FRUnFJUUFNQUFzTFFRQWdBRFlDNUFnUUhnOExRUUFnQURZQzVBZ0xpQUVCQkg5QkFDZ0M1QWdoQVVFQUtBTG9DQ0VDQWtBQ1FBTkFJQUVpQTBFQ2FpRUJJQU1nQWs4TkFTQUJMd0VBSWdRZ0FFWU5BZ0pBSUFSQjNBQkdEUUFnQkVGMmFnNEVBZ0VCQWdFTElBTkJCR29oQVNBREx3RUVRUTFIRFFBZ0EwRUdhaUFCSUFNdkFRWkJDa1liSVFFTUFBc0xRUUFnQVRZQzVBZ1FIZzhMUVFBZ0FUWUM1QWdMYkFFQmZ3SkFBa0FnQUVGZmFpSUJRUVZMRFFCQkFTQUJkRUV4Y1EwQkN5QUFRVVpxUWYvL0EzRkJCa2tOQUNBQVFTbEhJQUJCV0dwQi8vOERjVUVIU1hFTkFBSkFJQUJCcFg5cURnUUJBQUFCQUFzZ0FFSDlBRWNnQUVHRmYycEIvLzhEY1VFRVNYRVBDMEVCQ3owQkFYOUJBU0VCQWtBZ0FFSDNBRUhvQUVIcEFFSHNBRUhsQUJBZ0RRQWdBRUhtQUVIdkFFSHlBQkFoRFFBZ0FFSHBBRUhtQUJBaUlRRUxJQUVMbXdFQkFuOUJBU0VCQWtBQ1FBSkFBa0FDUUFKQUlBQXZBUUFpQWtGRmFnNEVCUVFFQVFBTEFrQWdBa0diZjJvT0JBTUVCQUlBQ3lBQ1FTbEdEUVFnQWtINUFFY05BeUFBUVg1cVFlWUFRZWtBUWU0QVFlRUFRZXdBUWV3QUVDTVBDeUFBUVg1cUx3RUFRVDFHRHdzZ0FFRitha0hqQUVIaEFFSDBBRUhqQUJBa0R3c2dBRUYrYWtIbEFFSHNBRUh6QUJBaER3dEJBQ0VCQ3lBQkM5SURBUUovUVFBaEFRSkFBa0FDUUFKQUFrQUNRQUpBQWtBQ1FDQUFMd0VBUVp4L2FnNFVBQUVDQ0FnSUNBZ0lDQU1FQ0FnRkNBWUlDQWNJQ3dKQUFrQWdBRUYrYWk4QkFFR1hmMm9PQkFBSkNRRUpDeUFBUVh4cVFmWUFRZThBRUNJUEN5QUFRWHhxUWZrQVFla0FRZVVBRUNFUEN3SkFBa0FnQUVGK2FpOEJBRUdOZjJvT0FnQUJDQXNDUUNBQVFYeHFMd0VBSWdKQjRRQkdEUUFnQWtIc0FFY05DQ0FBUVhwcVFlVUFFQ1VQQ3lBQVFYcHFRZU1BRUNVUEN5QUFRWHhxUWVRQVFlVUFRZXdBUWVVQUVDUVBDeUFBUVg1cUx3RUFRZThBUncwRklBQkJmR292QVFCQjVRQkhEUVVDUUNBQVFYcHFMd0VBSWdKQjhBQkdEUUFnQWtIakFFY05CaUFBUVhocVFla0FRZTRBUWZNQVFmUUFRZUVBUWU0QUVDTVBDeUFBUVhocVFmUUFRZmtBRUNJUEMwRUJJUUVnQUVGK2FpSUFRZWtBRUNVTkJDQUFRZklBUWVVQVFmUUFRZlVBUWZJQUVDQVBDeUFBUVg1cVFlUUFFQ1VQQ3lBQVFYNXFRZVFBUWVVQVFlSUFRZlVBUWVjQVFlY0FRZVVBRUNZUEN5QUFRWDVxUWVFQVFmY0FRZUVBUWVrQUVDUVBDd0pBSUFCQmZtb3ZBUUFpQWtIdkFFWU5BQ0FDUWVVQVJ3MEJJQUJCZkdwQjdnQVFKUThMSUFCQmZHcEI5QUJCNkFCQjhnQVFJU0VCQ3lBQkMzQUJBbjhDUUFKQUEwQkJBRUVBS0FMa0NDSUFRUUpxSWdFMkF1UUlJQUJCQUNnQzZBaFBEUUVDUUFKQUFrQWdBUzhCQUNJQlFhVi9hZzRDQVFJQUN3SkFJQUZCZG1vT0JBUURBd1FBQ3lBQlFTOUhEUUlNQkFzUUxSb01BUXRCQUNBQVFRUnFOZ0xrQ0F3QUN3c1FIZ3NMTlFFQmYwRUFRUUU2QUxRSVFRQW9BdVFJSVFCQkFFRUFLQUxvQ0VFQ2FqWUM1QWhCQUNBQVFRQW9BcEFJYTBFQmRUWUN4QWdMTkFFQmYwRUJJUUVDUUNBQVFYZHFRZi8vQTNGQkJVa05BQ0FBUVlBQmNrR2dBVVlOQUNBQVFTNUhJQUFRSzNFaEFRc2dBUXRKQVFOL1FRQWhCZ0pBSUFCQmVHb2lCMEVBS0FLUUNDSUlTUTBBSUFjZ0FTQUNJQU1nQkNBRkVCSkZEUUFDUUNBSElBaEhEUUJCQVE4TElBQkJkbW92QVFBUUh5RUdDeUFHQzFrQkEzOUJBQ0VFQWtBZ0FFRjhhaUlGUVFBb0FwQUlJZ1pKRFFBZ0FDOEJBQ0FEUncwQUlBQkJmbW92QVFBZ0FrY05BQ0FGTHdFQUlBRkhEUUFDUUNBRklBWkhEUUJCQVE4TElBQkJlbW92QVFBUUh5RUVDeUFFQzB3QkEzOUJBQ0VEQWtBZ0FFRithaUlFUVFBb0FwQUlJZ1ZKRFFBZ0FDOEJBQ0FDUncwQUlBUXZBUUFnQVVjTkFBSkFJQVFnQlVjTkFFRUJEd3NnQUVGOGFpOEJBQkFmSVFNTElBTUxTd0VEZjBFQUlRY0NRQ0FBUVhacUlnaEJBQ2dDa0FnaUNVa05BQ0FJSUFFZ0FpQURJQVFnQlNBR0VDNUZEUUFDUUNBSUlBbEhEUUJCQVE4TElBQkJkR292QVFBUUh5RUhDeUFIQzJZQkEzOUJBQ0VGQWtBZ0FFRjZhaUlHUVFBb0FwQUlJZ2RKRFFBZ0FDOEJBQ0FFUncwQUlBQkJmbW92QVFBZ0EwY05BQ0FBUVh4cUx3RUFJQUpIRFFBZ0JpOEJBQ0FCUncwQUFrQWdCaUFIUncwQVFRRVBDeUFBUVhocUx3RUFFQjhoQlFzZ0JRczlBUUovUVFBaEFnSkFRUUFvQXBBSUlnTWdBRXNOQUNBQUx3RUFJQUZIRFFBQ1FDQURJQUJIRFFCQkFROExJQUJCZm1vdkFRQVFIeUVDQ3lBQ0MwMEJBMzlCQUNFSUFrQWdBRUYwYWlJSlFRQW9BcEFJSWdwSkRRQWdDU0FCSUFJZ0F5QUVJQVVnQmlBSEVDOUZEUUFDUUNBSklBcEhEUUJCQVE4TElBQkJjbW92QVFBUUh5RUlDeUFJQzV3QkFRTi9RUUFvQXVRSUlRRUNRQU5BQWtBQ1FDQUJMd0VBSWdKQkwwY05BQUpBSUFFdkFRSWlBVUVxUmcwQUlBRkJMMGNOQkJBVkRBSUxJQUFRRmd3QkN3SkFBa0FnQUVVTkFDQUNRWGRxSWdGQkYwc05BVUVCSUFGMFFaK0FnQVJ4UlEwQkRBSUxJQUlRS1VVTkF3d0JDeUFDUWFBQlJ3MENDMEVBUVFBb0F1UUlJZ05CQW1vaUFUWUM1QWdnQTBFQUtBTG9DRWtOQUFzTElBSUx5d01CQVg4Q1FDQUJRU0pHRFFBZ0FVRW5SZzBBRUI0UEMwRUFLQUxrQ0NFQ0lBRVFHQ0FBSUFKQkFtcEJBQ2dDNUFoQkFDZ0NoQWdRQVVFQVFRQW9BdVFJUVFKcU5nTGtDRUVBRUNjaEFFRUFLQUxrQ0NFQkFrQUNRQ0FBUWVFQVJ3MEFJQUZCQW1wQjh3QkI4d0JCNVFCQjhnQkI5QUFRRWcwQkMwRUFJQUZCZm1vMkF1UUlEd3RCQUNBQlFReHFOZ0xrQ0FKQVFRRVFKMEg3QUVZTkFFRUFJQUUyQXVRSUR3dEJBQ2dDNUFnaUFpRUFBMEJCQUNBQVFRSnFOZ0xrQ0FKQUFrQUNRRUVCRUNjaUFFRWlSZzBBSUFCQkowY05BVUVuRUJoQkFFRUFLQUxrQ0VFQ2FqWUM1QWhCQVJBbklRQU1BZ3RCSWhBWVFRQkJBQ2dDNUFoQkFtbzJBdVFJUVFFUUp5RUFEQUVMSUFBUUtpRUFDd0pBSUFCQk9rWU5BRUVBSUFFMkF1UUlEd3RCQUVFQUtBTGtDRUVDYWpZQzVBZ0NRRUVCRUNjaUFFRWlSZzBBSUFCQkowWU5BRUVBSUFFMkF1UUlEd3NnQUJBWVFRQkJBQ2dDNUFoQkFtbzJBdVFJQWtBQ1FFRUJFQ2NpQUVFc1JnMEFJQUJCL1FCR0RRRkJBQ0FCTmdMa0NBOExRUUJCQUNnQzVBaEJBbW8yQXVRSVFRRVFKMEg5QUVZTkFFRUFLQUxrQ0NFQURBRUxDMEVBS0FLa0NDSUJJQUkyQWhBZ0FVRUFLQUxrQ0VFQ2FqWUNEQXN3QVFGL0FrQUNRQ0FBUVhkcUlnRkJGMHNOQUVFQklBRjBRWTJBZ0FSeERRRUxJQUJCb0FGR0RRQkJBQThMUVFFTGJRRUNmd0pBQWtBRFFBSkFJQUJCLy84RGNTSUJRWGRxSWdKQkYwc05BRUVCSUFKMFFaK0FnQVJ4RFFJTElBRkJvQUZHRFFFZ0FDRUNJQUVRS3cwQ1FRQWhBa0VBUVFBb0F1UUlJZ0JCQW1vMkF1UUlJQUF2QVFJaUFBMEFEQUlMQ3lBQUlRSUxJQUpCLy84RGNRdG9BUUovUVFFaEFRSkFBa0FnQUVGZmFpSUNRUVZMRFFCQkFTQUNkRUV4Y1EwQkN5QUFRZmovQTNGQktFWU5BQ0FBUVVacVFmLy9BM0ZCQmtrTkFBSkFJQUJCcFg5cUlnSkJBMHNOQUNBQ1FRRkhEUUVMSUFCQmhYOXFRZi8vQTNGQkJFa2hBUXNnQVF1TEFRRUNmd0pBUVFBb0F1UUlJZ0l2QVFBaUEwSGhBRWNOQUVFQUlBSkJCR28yQXVRSVFRRVFKeUVDUVFBb0F1UUlJUUFDUUFKQUlBSkJJa1lOQUNBQ1FTZEdEUUFnQWhBcUdrRUFLQUxrQ0NFQkRBRUxJQUlRR0VFQVFRQW9BdVFJUVFKcUlnRTJBdVFJQzBFQkVDY2hBMEVBS0FMa0NDRUNDd0pBSUFJZ0FFWU5BQ0FBSUFFUUFnc2dBd3R5QVFSL1FRQW9BdVFJSVFCQkFDZ0M2QWdoQVFKQUFrQURRQ0FBUVFKcUlRSWdBQ0FCVHcwQkFrQUNRQ0FDTHdFQUlnTkJwSDlxRGdJQkJBQUxJQUloQUNBRFFYWnFEZ1FDQVFFQ0FRc2dBRUVFYWlFQURBQUxDMEVBSUFJMkF1UUlFQjVCQUE4TFFRQWdBallDNUFoQjNRQUxTUUVCZjBFQUlRY0NRQ0FBTHdFS0lBWkhEUUFnQUM4QkNDQUZSdzBBSUFBdkFRWWdCRWNOQUNBQUx3RUVJQU5IRFFBZ0FDOEJBaUFDUncwQUlBQXZBUUFnQVVZaEJ3c2dCd3RUQVFGL1FRQWhDQUpBSUFBdkFRd2dCMGNOQUNBQUx3RUtJQVpIRFFBZ0FDOEJDQ0FGUncwQUlBQXZBUVlnQkVjTkFDQUFMd0VFSUFOSERRQWdBQzhCQWlBQ1J3MEFJQUF2QVFBZ0FVWWhDQXNnQ0FzTEh3SUFRWUFJQ3dJQUFBQkJoQWdMRUFFQUFBQUNBQUFBQUFRQUFIQTRBQUE9XCIsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIEJ1ZmZlcj9CdWZmZXIuZnJvbShFLFwiYmFzZTY0XCIpOlVpbnQ4QXJyYXkuZnJvbShhdG9iKEUpLEE9PkEuY2hhckNvZGVBdCgwKSkpKS50aGVuKFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKS50aGVuKCh7ZXhwb3J0czpBfSk9PntCPUF9KTt2YXIgRTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdGlkOiBtb2R1bGVJZCxcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuLy8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbl9fd2VicGFja19yZXF1aXJlX18ubSA9IF9fd2VicGFja19tb2R1bGVzX187XG5cbiIsIi8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSAobW9kdWxlKSA9PiB7XG5cdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuXHRcdCgpID0+IChtb2R1bGVbJ2RlZmF1bHQnXSkgOlxuXHRcdCgpID0+IChtb2R1bGUpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCB7IGE6IGdldHRlciB9KTtcblx0cmV0dXJuIGdldHRlcjtcbn07IiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5nID0gKGZ1bmN0aW9uKCkge1xuXHRpZiAodHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnKSByZXR1cm4gZ2xvYmFsVGhpcztcblx0dHJ5IHtcblx0XHRyZXR1cm4gdGhpcyB8fCBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JykgcmV0dXJuIHdpbmRvdztcblx0fVxufSkoKTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwidmFyIHNjcmlwdFVybDtcbmlmIChfX3dlYnBhY2tfcmVxdWlyZV9fLmcuaW1wb3J0U2NyaXB0cykgc2NyaXB0VXJsID0gX193ZWJwYWNrX3JlcXVpcmVfXy5nLmxvY2F0aW9uICsgXCJcIjtcbnZhciBkb2N1bWVudCA9IF9fd2VicGFja19yZXF1aXJlX18uZy5kb2N1bWVudDtcbmlmICghc2NyaXB0VXJsICYmIGRvY3VtZW50KSB7XG5cdGlmIChkb2N1bWVudC5jdXJyZW50U2NyaXB0KVxuXHRcdHNjcmlwdFVybCA9IGRvY3VtZW50LmN1cnJlbnRTY3JpcHQuc3JjXG5cdGlmICghc2NyaXB0VXJsKSB7XG5cdFx0dmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNjcmlwdFwiKTtcblx0XHRpZihzY3JpcHRzLmxlbmd0aCkgc2NyaXB0VXJsID0gc2NyaXB0c1tzY3JpcHRzLmxlbmd0aCAtIDFdLnNyY1xuXHR9XG59XG4vLyBXaGVuIHN1cHBvcnRpbmcgYnJvd3NlcnMgd2hlcmUgYW4gYXV0b21hdGljIHB1YmxpY1BhdGggaXMgbm90IHN1cHBvcnRlZCB5b3UgbXVzdCBzcGVjaWZ5IGFuIG91dHB1dC5wdWJsaWNQYXRoIG1hbnVhbGx5IHZpYSBjb25maWd1cmF0aW9uXG4vLyBvciBwYXNzIGFuIGVtcHR5IHN0cmluZyAoXCJcIikgYW5kIHNldCB0aGUgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gdmFyaWFibGUgZnJvbSB5b3VyIGNvZGUgdG8gdXNlIHlvdXIgb3duIGxvZ2ljLlxuaWYgKCFzY3JpcHRVcmwpIHRocm93IG5ldyBFcnJvcihcIkF1dG9tYXRpYyBwdWJsaWNQYXRoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyXCIpO1xuc2NyaXB0VXJsID0gc2NyaXB0VXJsLnJlcGxhY2UoLyMuKiQvLCBcIlwiKS5yZXBsYWNlKC9cXD8uKiQvLCBcIlwiKS5yZXBsYWNlKC9cXC9bXlxcL10rJC8sIFwiL1wiKTtcbl9fd2VicGFja19yZXF1aXJlX18ucCA9IHNjcmlwdFVybDsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLmIgPSBkb2N1bWVudC5iYXNlVVJJIHx8IHNlbGYubG9jYXRpb24uaHJlZjtcblxuLy8gb2JqZWN0IHRvIHN0b3JlIGxvYWRlZCBhbmQgbG9hZGluZyBjaHVua3Ncbi8vIHVuZGVmaW5lZCA9IGNodW5rIG5vdCBsb2FkZWQsIG51bGwgPSBjaHVuayBwcmVsb2FkZWQvcHJlZmV0Y2hlZFxuLy8gW3Jlc29sdmUsIHJlamVjdCwgUHJvbWlzZV0gPSBjaHVuayBsb2FkaW5nLCAwID0gY2h1bmsgbG9hZGVkXG52YXIgaW5zdGFsbGVkQ2h1bmtzID0ge1xuXHRcIm1haW5cIjogMFxufTtcblxuLy8gbm8gY2h1bmsgb24gZGVtYW5kIGxvYWRpbmdcblxuLy8gbm8gcHJlZmV0Y2hpbmdcblxuLy8gbm8gcHJlbG9hZGVkXG5cbi8vIG5vIEhNUlxuXG4vLyBubyBITVIgbWFuaWZlc3RcblxuLy8gbm8gb24gY2h1bmtzIGxvYWRlZFxuXG4vLyBubyBqc29ucCBmdW5jdGlvbiIsIl9fd2VicGFja19yZXF1aXJlX18ubmMgPSB1bmRlZmluZWQ7IiwiaW1wb3J0IHsgaW5pdCB9IGZyb20gJ2VzLW1vZHVsZS1sZXhlcic7XG5pbXBvcnQgeyBzZXQgfSBmcm9tICdpbnRlcm5hbC1zbG90JztcbmltcG9ydCBpbml0aWFsUGFnZSBmcm9tICcuL2luaXRpYWxwYWdlJztcbmltcG9ydCBjcmVhdGVGb290ZXIgZnJvbSAnLi9mb290ZXInO1xuaW1wb3J0IGNyZWF0ZU1lbnUgZnJvbSAnLi9tZW51JztcblxuY29uc3Qgd2ViUGFnZSA9ICgoKSA9PiB7XG4gIGNvbnN0IGNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY29udGVudCcpO1xuICBsZXQgYnV0dG9uO1xuXG4gIGNvbnN0IGNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnRlbnQuaW5uZXJUZXh0ID0gJyc7XG4gIH07XG5cbiAgY29uc3Qgc2V0SG9tZVBhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgY2xlYXIoKTtcbiAgICBpbml0aWFsUGFnZShjb250ZW50KTtcbiAgICBjcmVhdGVGb290ZXIoY29udGVudCk7XG4gICAgYnV0dG9uVG9nZ2xlKHRydWUpO1xuICB9O1xuXG4gIGNvbnN0IHNldE1lbnVQYWdlID0gZnVuY3Rpb24gKCkge1xuICAgIGNsZWFyKCk7XG4gICAgY3JlYXRlTWVudShjb250ZW50KTtcbiAgICBjcmVhdGVGb290ZXIoY29udGVudCk7XG4gICAgYnV0dG9uVG9nZ2xlKGZhbHNlKTtcbiAgfTtcblxuICBjb25zdCBidXR0b25Ub2dnbGUgPSBmdW5jdGlvbiAoZnJvbUhvbWUpIHtcbiAgICBidXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubmF2QnV0dG9uJyk7XG4gICAgaWYgKGZyb21Ib21lKSB7XG4gICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBzZXRNZW51UGFnZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHNldEhvbWVQYWdlKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gZGVmYXVsdFxuICBzZXRIb21lUGFnZSgpO1xuXG4gIGJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5uYXZCdXR0b24nKTtcbiAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgc2V0TWVudVBhZ2UpO1xufSkoKTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==