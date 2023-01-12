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
___CSS_LOADER_EXPORT___.push([module.id, ".glow {\n  background-color: black;\n  border-style: solid;\n  border-color: green;\n  border-width: 5px;\n  \n  box-shadow: 0 0 40px black;\n}\n\n.navButton {\n  background-color: green;\n  color: black;\n\n  outline-style: solid;\n  outline-width: 2px;\n  border-radius: 5px;\n  border-width: 0px;\n\n  font-size: x-large;\n  font-weight: bold;\n  padding: 5px;\n}\n\n.footer {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 10px;\n  padding: 10px;\n  width: 900px;\n}", "",{"version":3,"sources":["webpack://./src/global.css"],"names":[],"mappings":"AAAA;EACE,uBAAuB;EACvB,mBAAmB;EACnB,mBAAmB;EACnB,iBAAiB;;EAEjB,0BAA0B;AAC5B;;AAEA;EACE,uBAAuB;EACvB,YAAY;;EAEZ,oBAAoB;EACpB,kBAAkB;EAClB,kBAAkB;EAClB,iBAAiB;;EAEjB,kBAAkB;EAClB,iBAAiB;EACjB,YAAY;AACd;;AAEA;EACE,aAAa;EACb,uBAAuB;EACvB,mBAAmB;EACnB,SAAS;EACT,aAAa;EACb,YAAY;AACd","sourcesContent":[".glow {\n  background-color: black;\n  border-style: solid;\n  border-color: green;\n  border-width: 5px;\n  \n  box-shadow: 0 0 40px black;\n}\n\n.navButton {\n  background-color: green;\n  color: black;\n\n  outline-style: solid;\n  outline-width: 2px;\n  border-radius: 5px;\n  border-width: 0px;\n\n  font-size: x-large;\n  font-weight: bold;\n  padding: 5px;\n}\n\n.footer {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 10px;\n  padding: 10px;\n  width: 900px;\n}"],"sourceRoot":""}]);
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

module.exports = [["Name","HP restored","Rads","Weight","Value"],["Angler Meat","35","10","0.5","20"],["Baked bloatfly","40","0","0.5","15"],["Deathclaw Egg omelette","115","0","0.1","80"],["Deathclaw Steak","185","0","1","130"],["Grilled Radroach","30","0","0.5","7"],["Happy Birthday Sweetroll","20","4","0","0"],["Iguana on a stick","40","0","0.1","33"],["Mirelurk cake","140","0","0.1","35"],["Mole rat chunks","50","0","0.5","8"],["Radscoprian steak","150","0","1","65"]]

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
/* harmony import */ var _initialpage__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./initialpage */ "./src/initialpage.js");
/* harmony import */ var _footer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./footer */ "./src/footer.js");
/* harmony import */ var _menu__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./menu */ "./src/menu.js");





const content = document.querySelector('#content');

(0,_menu__WEBPACK_IMPORTED_MODULE_3__["default"])(content);
(0,_footer__WEBPACK_IMPORTED_MODULE_2__["default"])(content);

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSx3QkFBd0IsbUJBQU8sQ0FBQyxxREFBUzs7QUFFekM7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBLEdBQUc7O0FBRUg7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7Ozs7Ozs7Ozs7QUNYQSxpQkFBaUIsbUJBQU8sQ0FBQyxxR0FBd0M7QUFDakUsYUFBYSw0SEFBbUQ7QUFDaEUsWUFBWSxtQkFBTyxDQUFDLDJJQUEyRDtBQUMvRSxXQUFXLG1CQUFPLENBQUMsbUJBQU07QUFDekIsVUFBVSxtQkFBTyxDQUFDLHNGQUErQjs7QUFFakQsd0JBQXdCLG1CQUFPLENBQUMscURBQVM7QUFDekMsWUFBWSxtQkFBTyxDQUFDLHFEQUFTO0FBQzdCLFVBQVUsbUJBQU8sQ0FBQyxzREFBUTs7QUFFMUI7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQ0FBb0MsUUFBUTtBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxrQkFBa0Isa0JBQWtCO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQSx1Q0FBdUMsbUJBQW1CO0FBQzFEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULFFBQVE7QUFDUjtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQixxQkFBcUI7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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O1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7Ozs7V0NyQkE7Ozs7Ozs7Ozs7Ozs7Ozs7QUNBdUM7QUFDQztBQUNKO0FBQ0o7O0FBRWhDOztBQUVBLGlEQUFVO0FBQ1YsbURBQVkiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9icm93c2Vyc2xpc3QvYnJvd3Nlci5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9icm93c2Vyc2xpc3QvZXJyb3IuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvYnJvd3NlcnNsaXN0L2luZGV4LmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJzbGlzdC9wYXJzZS5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYW5pdXNlLWxpdGUvZGF0YS9hZ2VudHMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY2FuaXVzZS1saXRlL2RhdGEvYnJvd3NlclZlcnNpb25zLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nhbml1c2UtbGl0ZS9kYXRhL2Jyb3dzZXJzLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nhbml1c2UtbGl0ZS9kaXN0L3VucGFja2VyL2FnZW50cy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYW5pdXNlLWxpdGUvZGlzdC91bnBhY2tlci9icm93c2VyVmVyc2lvbnMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY2FuaXVzZS1saXRlL2Rpc3QvdW5wYWNrZXIvYnJvd3NlcnMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvZ2xvYmFsLmNzcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9pbml0aWFsUGFnZS5jc3MiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvbWVudS5jc3MiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2dldFVybC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL21lbnUuY3N2Iiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2VsZWN0cm9uLXRvLWNocm9taXVtL3ZlcnNpb25zLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL2Fib3V0LnR4dCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9nbG9iYWwuY3NzP2QzYmMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvaW5pdGlhbFBhZ2UuY3NzP2E5YTMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvbWVudS5jc3M/MTEwYiIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL2Zvb3Rlci5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9pbml0aWFscGFnZS5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9tZW51LmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL2lnbm9yZWR8L2hvbWUvanV2ZW5hbC9kZXYvb2Rpbi9wcm9qZWN0cy9yZXN0YXVyYW50UGFnZS9ub2RlX21vZHVsZXMvYnJvd3NlcnNsaXN0fHBhdGgiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvZXMtbW9kdWxlLWxleGVyL2Rpc3QvbGV4ZXIuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL2NvbXBhdCBnZXQgZGVmYXVsdCBleHBvcnQiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL3dlYnBhY2svcnVudGltZS9nbG9iYWwiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL3dlYnBhY2svcnVudGltZS9wdWJsaWNQYXRoIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL3dlYnBhY2svcnVudGltZS9qc29ucCBjaHVuayBsb2FkaW5nIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL3dlYnBhY2svcnVudGltZS9ub25jZSIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgQnJvd3NlcnNsaXN0RXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBsb2FkUXVlcmllczogZnVuY3Rpb24gbG9hZFF1ZXJpZXMoKSB7XG4gICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgJ1NoYXJhYmxlIGNvbmZpZ3MgYXJlIG5vdCBzdXBwb3J0ZWQgaW4gY2xpZW50LXNpZGUgYnVpbGQgb2YgQnJvd3NlcnNsaXN0J1xuICAgIClcbiAgfSxcblxuICBnZXRTdGF0OiBmdW5jdGlvbiBnZXRTdGF0KG9wdHMpIHtcbiAgICByZXR1cm4gb3B0cy5zdGF0c1xuICB9LFxuXG4gIGxvYWRDb25maWc6IGZ1bmN0aW9uIGxvYWRDb25maWcob3B0cykge1xuICAgIGlmIChvcHRzLmNvbmZpZykge1xuICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgICAnQnJvd3NlcnNsaXN0IGNvbmZpZyBhcmUgbm90IHN1cHBvcnRlZCBpbiBjbGllbnQtc2lkZSBidWlsZCdcbiAgICAgIClcbiAgICB9XG4gIH0sXG5cbiAgbG9hZENvdW50cnk6IGZ1bmN0aW9uIGxvYWRDb3VudHJ5KCkge1xuICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICdDb3VudHJ5IHN0YXRpc3RpY3MgYXJlIG5vdCBzdXBwb3J0ZWQgJyArXG4gICAgICAgICdpbiBjbGllbnQtc2lkZSBidWlsZCBvZiBCcm93c2Vyc2xpc3QnXG4gICAgKVxuICB9LFxuXG4gIGxvYWRGZWF0dXJlOiBmdW5jdGlvbiBsb2FkRmVhdHVyZSgpIHtcbiAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAnU3VwcG9ydHMgcXVlcmllcyBhcmUgbm90IGF2YWlsYWJsZSBpbiBjbGllbnQtc2lkZSBidWlsZCBvZiBCcm93c2Vyc2xpc3QnXG4gICAgKVxuICB9LFxuXG4gIGN1cnJlbnROb2RlOiBmdW5jdGlvbiBjdXJyZW50Tm9kZShyZXNvbHZlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHJlc29sdmUoWydtYWludGFpbmVkIG5vZGUgdmVyc2lvbnMnXSwgY29udGV4dClbMF1cbiAgfSxcblxuICBwYXJzZUNvbmZpZzogbm9vcCxcblxuICByZWFkQ29uZmlnOiBub29wLFxuXG4gIGZpbmRDb25maWc6IG5vb3AsXG5cbiAgY2xlYXJDYWNoZXM6IG5vb3AsXG5cbiAgb2xkRGF0YVdhcm5pbmc6IG5vb3Bcbn1cbiIsImZ1bmN0aW9uIEJyb3dzZXJzbGlzdEVycm9yKG1lc3NhZ2UpIHtcbiAgdGhpcy5uYW1lID0gJ0Jyb3dzZXJzbGlzdEVycm9yJ1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlXG4gIHRoaXMuYnJvd3NlcnNsaXN0ID0gdHJ1ZVxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBCcm93c2Vyc2xpc3RFcnJvcilcbiAgfVxufVxuXG5Ccm93c2Vyc2xpc3RFcnJvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGVcblxubW9kdWxlLmV4cG9ydHMgPSBCcm93c2Vyc2xpc3RFcnJvclxuIiwidmFyIGpzUmVsZWFzZXMgPSByZXF1aXJlKCdub2RlLXJlbGVhc2VzL2RhdGEvcHJvY2Vzc2VkL2VudnMuanNvbicpXG52YXIgYWdlbnRzID0gcmVxdWlyZSgnY2FuaXVzZS1saXRlL2Rpc3QvdW5wYWNrZXIvYWdlbnRzJykuYWdlbnRzXG52YXIganNFT0wgPSByZXF1aXJlKCdub2RlLXJlbGVhc2VzL2RhdGEvcmVsZWFzZS1zY2hlZHVsZS9yZWxlYXNlLXNjaGVkdWxlLmpzb24nKVxudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJylcbnZhciBlMmMgPSByZXF1aXJlKCdlbGVjdHJvbi10by1jaHJvbWl1bS92ZXJzaW9ucycpXG5cbnZhciBCcm93c2Vyc2xpc3RFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKVxudmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpXG52YXIgZW52ID0gcmVxdWlyZSgnLi9ub2RlJykgLy8gV2lsbCBsb2FkIGJyb3dzZXIuanMgaW4gd2VicGFja1xuXG52YXIgWUVBUiA9IDM2NS4yNTk2NDEgKiAyNCAqIDYwICogNjAgKiAxMDAwXG52YXIgQU5EUk9JRF9FVkVSR1JFRU5fRklSU1QgPSAzN1xuXG4vLyBIZWxwZXJzXG5cbmZ1bmN0aW9uIGlzVmVyc2lvbnNNYXRjaCh2ZXJzaW9uQSwgdmVyc2lvbkIpIHtcbiAgcmV0dXJuICh2ZXJzaW9uQSArICcuJykuaW5kZXhPZih2ZXJzaW9uQiArICcuJykgPT09IDBcbn1cblxuZnVuY3Rpb24gaXNFb2xSZWxlYXNlZChuYW1lKSB7XG4gIHZhciB2ZXJzaW9uID0gbmFtZS5zbGljZSgxKVxuICByZXR1cm4gYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9ucy5zb21lKGZ1bmN0aW9uIChpKSB7XG4gICAgcmV0dXJuIGlzVmVyc2lvbnNNYXRjaChpLCB2ZXJzaW9uKVxuICB9KVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemUodmVyc2lvbnMpIHtcbiAgcmV0dXJuIHZlcnNpb25zLmZpbHRlcihmdW5jdGlvbiAodmVyc2lvbikge1xuICAgIHJldHVybiB0eXBlb2YgdmVyc2lvbiA9PT0gJ3N0cmluZydcbiAgfSlcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplRWxlY3Ryb24odmVyc2lvbikge1xuICB2YXIgdmVyc2lvblRvVXNlID0gdmVyc2lvblxuICBpZiAodmVyc2lvbi5zcGxpdCgnLicpLmxlbmd0aCA9PT0gMykge1xuICAgIHZlcnNpb25Ub1VzZSA9IHZlcnNpb24uc3BsaXQoJy4nKS5zbGljZSgwLCAtMSkuam9pbignLicpXG4gIH1cbiAgcmV0dXJuIHZlcnNpb25Ub1VzZVxufVxuXG5mdW5jdGlvbiBuYW1lTWFwcGVyKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIG1hcE5hbWUodmVyc2lvbikge1xuICAgIHJldHVybiBuYW1lICsgJyAnICsgdmVyc2lvblxuICB9XG59XG5cbmZ1bmN0aW9uIGdldE1ham9yKHZlcnNpb24pIHtcbiAgcmV0dXJuIHBhcnNlSW50KHZlcnNpb24uc3BsaXQoJy4nKVswXSlcbn1cblxuZnVuY3Rpb24gZ2V0TWFqb3JWZXJzaW9ucyhyZWxlYXNlZCwgbnVtYmVyKSB7XG4gIGlmIChyZWxlYXNlZC5sZW5ndGggPT09IDApIHJldHVybiBbXVxuICB2YXIgbWFqb3JWZXJzaW9ucyA9IHVuaXEocmVsZWFzZWQubWFwKGdldE1ham9yKSlcbiAgdmFyIG1pbmltdW0gPSBtYWpvclZlcnNpb25zW21ham9yVmVyc2lvbnMubGVuZ3RoIC0gbnVtYmVyXVxuICBpZiAoIW1pbmltdW0pIHtcbiAgICByZXR1cm4gcmVsZWFzZWRcbiAgfVxuICB2YXIgc2VsZWN0ZWQgPSBbXVxuICBmb3IgKHZhciBpID0gcmVsZWFzZWQubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAobWluaW11bSA+IGdldE1ham9yKHJlbGVhc2VkW2ldKSkgYnJlYWtcbiAgICBzZWxlY3RlZC51bnNoaWZ0KHJlbGVhc2VkW2ldKVxuICB9XG4gIHJldHVybiBzZWxlY3RlZFxufVxuXG5mdW5jdGlvbiB1bmlxKGFycmF5KSB7XG4gIHZhciBmaWx0ZXJlZCA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZmlsdGVyZWQuaW5kZXhPZihhcnJheVtpXSkgPT09IC0xKSBmaWx0ZXJlZC5wdXNoKGFycmF5W2ldKVxuICB9XG4gIHJldHVybiBmaWx0ZXJlZFxufVxuXG5mdW5jdGlvbiBmaWxsVXNhZ2UocmVzdWx0LCBuYW1lLCBkYXRhKSB7XG4gIGZvciAodmFyIGkgaW4gZGF0YSkge1xuICAgIHJlc3VsdFtuYW1lICsgJyAnICsgaV0gPSBkYXRhW2ldXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVGaWx0ZXIoc2lnbiwgdmVyc2lvbikge1xuICB2ZXJzaW9uID0gcGFyc2VGbG9hdCh2ZXJzaW9uKVxuICBpZiAoc2lnbiA9PT0gJz4nKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdCh2KSA+IHZlcnNpb25cbiAgICB9XG4gIH0gZWxzZSBpZiAoc2lnbiA9PT0gJz49Jykge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodikgPj0gdmVyc2lvblxuICAgIH1cbiAgfSBlbHNlIGlmIChzaWduID09PSAnPCcpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHYpIDwgdmVyc2lvblxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHYpIDw9IHZlcnNpb25cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVTZW12ZXJGaWx0ZXIoc2lnbiwgdmVyc2lvbikge1xuICB2ZXJzaW9uID0gdmVyc2lvbi5zcGxpdCgnLicpLm1hcChwYXJzZVNpbXBsZUludClcbiAgdmVyc2lvblsxXSA9IHZlcnNpb25bMV0gfHwgMFxuICB2ZXJzaW9uWzJdID0gdmVyc2lvblsyXSB8fCAwXG4gIGlmIChzaWduID09PSAnPicpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHYgPSB2LnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICAgICAgcmV0dXJuIGNvbXBhcmVTZW12ZXIodiwgdmVyc2lvbikgPiAwXG4gICAgfVxuICB9IGVsc2UgaWYgKHNpZ24gPT09ICc+PScpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHYgPSB2LnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICAgICAgcmV0dXJuIGNvbXBhcmVTZW12ZXIodiwgdmVyc2lvbikgPj0gMFxuICAgIH1cbiAgfSBlbHNlIGlmIChzaWduID09PSAnPCcpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHYgPSB2LnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICAgICAgcmV0dXJuIGNvbXBhcmVTZW12ZXIodmVyc2lvbiwgdikgPiAwXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgdiA9IHYuc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gICAgICByZXR1cm4gY29tcGFyZVNlbXZlcih2ZXJzaW9uLCB2KSA+PSAwXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlU2ltcGxlSW50KHgpIHtcbiAgcmV0dXJuIHBhcnNlSW50KHgpXG59XG5cbmZ1bmN0aW9uIGNvbXBhcmUoYSwgYikge1xuICBpZiAoYSA8IGIpIHJldHVybiAtMVxuICBpZiAoYSA+IGIpIHJldHVybiArMVxuICByZXR1cm4gMFxufVxuXG5mdW5jdGlvbiBjb21wYXJlU2VtdmVyKGEsIGIpIHtcbiAgcmV0dXJuIChcbiAgICBjb21wYXJlKHBhcnNlSW50KGFbMF0pLCBwYXJzZUludChiWzBdKSkgfHxcbiAgICBjb21wYXJlKHBhcnNlSW50KGFbMV0gfHwgJzAnKSwgcGFyc2VJbnQoYlsxXSB8fCAnMCcpKSB8fFxuICAgIGNvbXBhcmUocGFyc2VJbnQoYVsyXSB8fCAnMCcpLCBwYXJzZUludChiWzJdIHx8ICcwJykpXG4gIClcbn1cblxuLy8gdGhpcyBmb2xsb3dzIHRoZSBucG0tbGlrZSBzZW12ZXIgYmVoYXZpb3JcbmZ1bmN0aW9uIHNlbXZlckZpbHRlckxvb3NlKG9wZXJhdG9yLCByYW5nZSkge1xuICByYW5nZSA9IHJhbmdlLnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICBpZiAodHlwZW9mIHJhbmdlWzFdID09PSAndW5kZWZpbmVkJykge1xuICAgIHJhbmdlWzFdID0gJ3gnXG4gIH1cbiAgLy8gaWdub3JlIGFueSBwYXRjaCB2ZXJzaW9uIGJlY2F1c2Ugd2Ugb25seSByZXR1cm4gbWlub3IgdmVyc2lvbnNcbiAgLy8gcmFuZ2VbMl0gPSAneCdcbiAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgIGNhc2UgJzw9JzpcbiAgICAgIHJldHVybiBmdW5jdGlvbiAodmVyc2lvbikge1xuICAgICAgICB2ZXJzaW9uID0gdmVyc2lvbi5zcGxpdCgnLicpLm1hcChwYXJzZVNpbXBsZUludClcbiAgICAgICAgcmV0dXJuIGNvbXBhcmVTZW12ZXJMb29zZSh2ZXJzaW9uLCByYW5nZSkgPD0gMFxuICAgICAgfVxuICAgIGNhc2UgJz49JzpcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICAgICAgICByZXR1cm4gY29tcGFyZVNlbXZlckxvb3NlKHZlcnNpb24sIHJhbmdlKSA+PSAwXG4gICAgICB9XG4gIH1cbn1cblxuLy8gdGhpcyBmb2xsb3dzIHRoZSBucG0tbGlrZSBzZW12ZXIgYmVoYXZpb3JcbmZ1bmN0aW9uIGNvbXBhcmVTZW12ZXJMb29zZSh2ZXJzaW9uLCByYW5nZSkge1xuICBpZiAodmVyc2lvblswXSAhPT0gcmFuZ2VbMF0pIHtcbiAgICByZXR1cm4gdmVyc2lvblswXSA8IHJhbmdlWzBdID8gLTEgOiArMVxuICB9XG4gIGlmIChyYW5nZVsxXSA9PT0gJ3gnKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBpZiAodmVyc2lvblsxXSAhPT0gcmFuZ2VbMV0pIHtcbiAgICByZXR1cm4gdmVyc2lvblsxXSA8IHJhbmdlWzFdID8gLTEgOiArMVxuICB9XG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIHJlc29sdmVWZXJzaW9uKGRhdGEsIHZlcnNpb24pIHtcbiAgaWYgKGRhdGEudmVyc2lvbnMuaW5kZXhPZih2ZXJzaW9uKSAhPT0gLTEpIHtcbiAgICByZXR1cm4gdmVyc2lvblxuICB9IGVsc2UgaWYgKGJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlc1tkYXRhLm5hbWVdW3ZlcnNpb25dKSB7XG4gICAgcmV0dXJuIGJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlc1tkYXRhLm5hbWVdW3ZlcnNpb25dXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVmVyc2lvbihkYXRhLCB2ZXJzaW9uKSB7XG4gIHZhciByZXNvbHZlZCA9IHJlc29sdmVWZXJzaW9uKGRhdGEsIHZlcnNpb24pXG4gIGlmIChyZXNvbHZlZCkge1xuICAgIHJldHVybiByZXNvbHZlZFxuICB9IGVsc2UgaWYgKGRhdGEudmVyc2lvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGRhdGEudmVyc2lvbnNbMF1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBmaWx0ZXJCeVllYXIoc2luY2UsIGNvbnRleHQpIHtcbiAgc2luY2UgPSBzaW5jZSAvIDEwMDBcbiAgcmV0dXJuIE9iamVjdC5rZXlzKGFnZW50cykucmVkdWNlKGZ1bmN0aW9uIChzZWxlY3RlZCwgbmFtZSkge1xuICAgIHZhciBkYXRhID0gYnlOYW1lKG5hbWUsIGNvbnRleHQpXG4gICAgaWYgKCFkYXRhKSByZXR1cm4gc2VsZWN0ZWRcbiAgICB2YXIgdmVyc2lvbnMgPSBPYmplY3Qua2V5cyhkYXRhLnJlbGVhc2VEYXRlKS5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgIHZhciBkYXRlID0gZGF0YS5yZWxlYXNlRGF0ZVt2XVxuICAgICAgcmV0dXJuIGRhdGUgIT09IG51bGwgJiYgZGF0ZSA+PSBzaW5jZVxuICAgIH0pXG4gICAgcmV0dXJuIHNlbGVjdGVkLmNvbmNhdCh2ZXJzaW9ucy5tYXAobmFtZU1hcHBlcihkYXRhLm5hbWUpKSlcbiAgfSwgW10pXG59XG5cbmZ1bmN0aW9uIGNsb25lRGF0YShkYXRhKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogZGF0YS5uYW1lLFxuICAgIHZlcnNpb25zOiBkYXRhLnZlcnNpb25zLFxuICAgIHJlbGVhc2VkOiBkYXRhLnJlbGVhc2VkLFxuICAgIHJlbGVhc2VEYXRlOiBkYXRhLnJlbGVhc2VEYXRlXG4gIH1cbn1cblxuZnVuY3Rpb24gbWFwVmVyc2lvbnMoZGF0YSwgbWFwKSB7XG4gIGRhdGEudmVyc2lvbnMgPSBkYXRhLnZlcnNpb25zLm1hcChmdW5jdGlvbiAoaSkge1xuICAgIHJldHVybiBtYXBbaV0gfHwgaVxuICB9KVxuICBkYXRhLnJlbGVhc2VkID0gZGF0YS5yZWxlYXNlZC5tYXAoZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gbWFwW2ldIHx8IGlcbiAgfSlcbiAgdmFyIGZpeGVkRGF0ZSA9IHt9XG4gIGZvciAodmFyIGkgaW4gZGF0YS5yZWxlYXNlRGF0ZSkge1xuICAgIGZpeGVkRGF0ZVttYXBbaV0gfHwgaV0gPSBkYXRhLnJlbGVhc2VEYXRlW2ldXG4gIH1cbiAgZGF0YS5yZWxlYXNlRGF0ZSA9IGZpeGVkRGF0ZVxuICByZXR1cm4gZGF0YVxufVxuXG5mdW5jdGlvbiBieU5hbWUobmFtZSwgY29udGV4dCkge1xuICBuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIG5hbWUgPSBicm93c2Vyc2xpc3QuYWxpYXNlc1tuYW1lXSB8fCBuYW1lXG4gIGlmIChjb250ZXh0Lm1vYmlsZVRvRGVza3RvcCAmJiBicm93c2Vyc2xpc3QuZGVza3RvcE5hbWVzW25hbWVdKSB7XG4gICAgdmFyIGRlc2t0b3AgPSBicm93c2Vyc2xpc3QuZGF0YVticm93c2Vyc2xpc3QuZGVza3RvcE5hbWVzW25hbWVdXVxuICAgIGlmIChuYW1lID09PSAnYW5kcm9pZCcpIHtcbiAgICAgIHJldHVybiBub3JtYWxpemVBbmRyb2lkRGF0YShjbG9uZURhdGEoYnJvd3NlcnNsaXN0LmRhdGFbbmFtZV0pLCBkZXNrdG9wKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgY2xvbmVkID0gY2xvbmVEYXRhKGRlc2t0b3ApXG4gICAgICBjbG9uZWQubmFtZSA9IG5hbWVcbiAgICAgIGlmIChuYW1lID09PSAnb3BfbW9iJykge1xuICAgICAgICBjbG9uZWQgPSBtYXBWZXJzaW9ucyhjbG9uZWQsIHsgJzEwLjAtMTAuMSc6ICcxMCcgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBjbG9uZWRcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJyb3dzZXJzbGlzdC5kYXRhW25hbWVdXG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUFuZHJvaWRWZXJzaW9ucyhhbmRyb2lkVmVyc2lvbnMsIGNocm9tZVZlcnNpb25zKSB7XG4gIHZhciBmaXJzdEV2ZXJncmVlbiA9IEFORFJPSURfRVZFUkdSRUVOX0ZJUlNUXG4gIHZhciBsYXN0ID0gY2hyb21lVmVyc2lvbnNbY2hyb21lVmVyc2lvbnMubGVuZ3RoIC0gMV1cbiAgcmV0dXJuIGFuZHJvaWRWZXJzaW9uc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24gKHZlcnNpb24pIHtcbiAgICAgIHJldHVybiAvXig/OlsyLTRdXFwufFszNF0kKS8udGVzdCh2ZXJzaW9uKVxuICAgIH0pXG4gICAgLmNvbmNhdChjaHJvbWVWZXJzaW9ucy5zbGljZShmaXJzdEV2ZXJncmVlbiAtIGxhc3QgLSAxKSlcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQW5kcm9pZERhdGEoYW5kcm9pZCwgY2hyb21lKSB7XG4gIGFuZHJvaWQucmVsZWFzZWQgPSBub3JtYWxpemVBbmRyb2lkVmVyc2lvbnMoYW5kcm9pZC5yZWxlYXNlZCwgY2hyb21lLnJlbGVhc2VkKVxuICBhbmRyb2lkLnZlcnNpb25zID0gbm9ybWFsaXplQW5kcm9pZFZlcnNpb25zKGFuZHJvaWQudmVyc2lvbnMsIGNocm9tZS52ZXJzaW9ucylcbiAgcmV0dXJuIGFuZHJvaWRcbn1cblxuZnVuY3Rpb24gY2hlY2tOYW1lKG5hbWUsIGNvbnRleHQpIHtcbiAgdmFyIGRhdGEgPSBieU5hbWUobmFtZSwgY29udGV4dClcbiAgaWYgKCFkYXRhKSB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoJ1Vua25vd24gYnJvd3NlciAnICsgbmFtZSlcbiAgcmV0dXJuIGRhdGFcbn1cblxuZnVuY3Rpb24gdW5rbm93blF1ZXJ5KHF1ZXJ5KSB7XG4gIHJldHVybiBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgJ1Vua25vd24gYnJvd3NlciBxdWVyeSBgJyArXG4gICAgICBxdWVyeSArXG4gICAgICAnYC4gJyArXG4gICAgICAnTWF5YmUgeW91IGFyZSB1c2luZyBvbGQgQnJvd3NlcnNsaXN0IG9yIG1hZGUgdHlwbyBpbiBxdWVyeS4nXG4gIClcbn1cblxuZnVuY3Rpb24gZmlsdGVyQW5kcm9pZChsaXN0LCB2ZXJzaW9ucywgY29udGV4dCkge1xuICBpZiAoY29udGV4dC5tb2JpbGVUb0Rlc2t0b3ApIHJldHVybiBsaXN0XG4gIHZhciByZWxlYXNlZCA9IGJyb3dzZXJzbGlzdC5kYXRhLmFuZHJvaWQucmVsZWFzZWRcbiAgdmFyIGxhc3QgPSByZWxlYXNlZFtyZWxlYXNlZC5sZW5ndGggLSAxXVxuICB2YXIgZGlmZiA9IGxhc3QgLSBBTkRST0lEX0VWRVJHUkVFTl9GSVJTVCAtIHZlcnNpb25zXG4gIGlmIChkaWZmID4gMCkge1xuICAgIHJldHVybiBsaXN0LnNsaWNlKC0xKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBsaXN0LnNsaWNlKGRpZmYgLSAxKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJlc29sdmUocXVlcmllcywgY29udGV4dCkge1xuICByZXR1cm4gcGFyc2UoUVVFUklFUywgcXVlcmllcykucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIG5vZGUsIGluZGV4KSB7XG4gICAgaWYgKG5vZGUubm90ICYmIGluZGV4ID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAgICdXcml0ZSBhbnkgYnJvd3NlcnMgcXVlcnkgKGZvciBpbnN0YW5jZSwgYGRlZmF1bHRzYCkgJyArXG4gICAgICAgICAgJ2JlZm9yZSBgJyArXG4gICAgICAgICAgbm9kZS5xdWVyeSArXG4gICAgICAgICAgJ2AnXG4gICAgICApXG4gICAgfVxuICAgIHZhciB0eXBlID0gUVVFUklFU1tub2RlLnR5cGVdXG4gICAgdmFyIGFycmF5ID0gdHlwZS5zZWxlY3QuY2FsbChicm93c2Vyc2xpc3QsIGNvbnRleHQsIG5vZGUpLm1hcChmdW5jdGlvbiAoaikge1xuICAgICAgdmFyIHBhcnRzID0gai5zcGxpdCgnICcpXG4gICAgICBpZiAocGFydHNbMV0gPT09ICcwJykge1xuICAgICAgICByZXR1cm4gcGFydHNbMF0gKyAnICcgKyBieU5hbWUocGFydHNbMF0sIGNvbnRleHQpLnZlcnNpb25zWzBdXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4galxuICAgICAgfVxuICAgIH0pXG5cbiAgICBpZiAobm9kZS5jb21wb3NlID09PSAnYW5kJykge1xuICAgICAgaWYgKG5vZGUubm90KSB7XG4gICAgICAgIHJldHVybiByZXN1bHQuZmlsdGVyKGZ1bmN0aW9uIChqKSB7XG4gICAgICAgICAgcmV0dXJuIGFycmF5LmluZGV4T2YoaikgPT09IC0xXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVzdWx0LmZpbHRlcihmdW5jdGlvbiAoaikge1xuICAgICAgICAgIHJldHVybiBhcnJheS5pbmRleE9mKGopICE9PSAtMVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAobm9kZS5ub3QpIHtcbiAgICAgICAgdmFyIGZpbHRlciA9IHt9XG4gICAgICAgIGFycmF5LmZvckVhY2goZnVuY3Rpb24gKGopIHtcbiAgICAgICAgICBmaWx0ZXJbal0gPSB0cnVlXG4gICAgICAgIH0pXG4gICAgICAgIHJldHVybiByZXN1bHQuZmlsdGVyKGZ1bmN0aW9uIChqKSB7XG4gICAgICAgICAgcmV0dXJuICFmaWx0ZXJbal1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQuY29uY2F0KGFycmF5KVxuICAgIH1cbiAgfSwgW10pXG59XG5cbmZ1bmN0aW9uIHByZXBhcmVPcHRzKG9wdHMpIHtcbiAgaWYgKHR5cGVvZiBvcHRzID09PSAndW5kZWZpbmVkJykgb3B0cyA9IHt9XG5cbiAgaWYgKHR5cGVvZiBvcHRzLnBhdGggPT09ICd1bmRlZmluZWQnKSB7XG4gICAgb3B0cy5wYXRoID0gcGF0aC5yZXNvbHZlID8gcGF0aC5yZXNvbHZlKCcuJykgOiAnLidcbiAgfVxuXG4gIHJldHVybiBvcHRzXG59XG5cbmZ1bmN0aW9uIHByZXBhcmVRdWVyaWVzKHF1ZXJpZXMsIG9wdHMpIHtcbiAgaWYgKHR5cGVvZiBxdWVyaWVzID09PSAndW5kZWZpbmVkJyB8fCBxdWVyaWVzID09PSBudWxsKSB7XG4gICAgdmFyIGNvbmZpZyA9IGJyb3dzZXJzbGlzdC5sb2FkQ29uZmlnKG9wdHMpXG4gICAgaWYgKGNvbmZpZykge1xuICAgICAgcXVlcmllcyA9IGNvbmZpZ1xuICAgIH0gZWxzZSB7XG4gICAgICBxdWVyaWVzID0gYnJvd3NlcnNsaXN0LmRlZmF1bHRzXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHF1ZXJpZXNcbn1cblxuZnVuY3Rpb24gY2hlY2tRdWVyaWVzKHF1ZXJpZXMpIHtcbiAgaWYgKCEodHlwZW9mIHF1ZXJpZXMgPT09ICdzdHJpbmcnIHx8IEFycmF5LmlzQXJyYXkocXVlcmllcykpKSB7XG4gICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgJ0Jyb3dzZXIgcXVlcmllcyBtdXN0IGJlIGFuIGFycmF5IG9yIHN0cmluZy4gR290ICcgKyB0eXBlb2YgcXVlcmllcyArICcuJ1xuICAgIClcbiAgfVxufVxuXG52YXIgY2FjaGUgPSB7fVxuXG5mdW5jdGlvbiBicm93c2Vyc2xpc3QocXVlcmllcywgb3B0cykge1xuICBvcHRzID0gcHJlcGFyZU9wdHMob3B0cylcbiAgcXVlcmllcyA9IHByZXBhcmVRdWVyaWVzKHF1ZXJpZXMsIG9wdHMpXG4gIGNoZWNrUXVlcmllcyhxdWVyaWVzKVxuXG4gIHZhciBjb250ZXh0ID0ge1xuICAgIGlnbm9yZVVua25vd25WZXJzaW9uczogb3B0cy5pZ25vcmVVbmtub3duVmVyc2lvbnMsXG4gICAgZGFuZ2Vyb3VzRXh0ZW5kOiBvcHRzLmRhbmdlcm91c0V4dGVuZCxcbiAgICBtb2JpbGVUb0Rlc2t0b3A6IG9wdHMubW9iaWxlVG9EZXNrdG9wLFxuICAgIHBhdGg6IG9wdHMucGF0aCxcbiAgICBlbnY6IG9wdHMuZW52XG4gIH1cblxuICBlbnYub2xkRGF0YVdhcm5pbmcoYnJvd3NlcnNsaXN0LmRhdGEpXG4gIHZhciBzdGF0cyA9IGVudi5nZXRTdGF0KG9wdHMsIGJyb3dzZXJzbGlzdC5kYXRhKVxuICBpZiAoc3RhdHMpIHtcbiAgICBjb250ZXh0LmN1c3RvbVVzYWdlID0ge31cbiAgICBmb3IgKHZhciBicm93c2VyIGluIHN0YXRzKSB7XG4gICAgICBmaWxsVXNhZ2UoY29udGV4dC5jdXN0b21Vc2FnZSwgYnJvd3Nlciwgc3RhdHNbYnJvd3Nlcl0pXG4gICAgfVxuICB9XG5cbiAgdmFyIGNhY2hlS2V5ID0gSlNPTi5zdHJpbmdpZnkoW3F1ZXJpZXMsIGNvbnRleHRdKVxuICBpZiAoY2FjaGVbY2FjaGVLZXldKSByZXR1cm4gY2FjaGVbY2FjaGVLZXldXG5cbiAgdmFyIHJlc3VsdCA9IHVuaXEocmVzb2x2ZShxdWVyaWVzLCBjb250ZXh0KSkuc29ydChmdW5jdGlvbiAobmFtZTEsIG5hbWUyKSB7XG4gICAgbmFtZTEgPSBuYW1lMS5zcGxpdCgnICcpXG4gICAgbmFtZTIgPSBuYW1lMi5zcGxpdCgnICcpXG4gICAgaWYgKG5hbWUxWzBdID09PSBuYW1lMlswXSkge1xuICAgICAgLy8gYXNzdW1wdGlvbnMgb24gY2FuaXVzZSBkYXRhXG4gICAgICAvLyAxKSB2ZXJzaW9uIHJhbmdlcyBuZXZlciBvdmVybGFwc1xuICAgICAgLy8gMikgaWYgdmVyc2lvbiBpcyBub3QgYSByYW5nZSwgaXQgbmV2ZXIgY29udGFpbnMgYC1gXG4gICAgICB2YXIgdmVyc2lvbjEgPSBuYW1lMVsxXS5zcGxpdCgnLScpWzBdXG4gICAgICB2YXIgdmVyc2lvbjIgPSBuYW1lMlsxXS5zcGxpdCgnLScpWzBdXG4gICAgICByZXR1cm4gY29tcGFyZVNlbXZlcih2ZXJzaW9uMi5zcGxpdCgnLicpLCB2ZXJzaW9uMS5zcGxpdCgnLicpKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY29tcGFyZShuYW1lMVswXSwgbmFtZTJbMF0pXG4gICAgfVxuICB9KVxuICBpZiAoIXByb2Nlc3MuZW52LkJST1dTRVJTTElTVF9ESVNBQkxFX0NBQ0hFKSB7XG4gICAgY2FjaGVbY2FjaGVLZXldID0gcmVzdWx0XG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5icm93c2Vyc2xpc3QucGFyc2UgPSBmdW5jdGlvbiAocXVlcmllcywgb3B0cykge1xuICBvcHRzID0gcHJlcGFyZU9wdHMob3B0cylcbiAgcXVlcmllcyA9IHByZXBhcmVRdWVyaWVzKHF1ZXJpZXMsIG9wdHMpXG4gIGNoZWNrUXVlcmllcyhxdWVyaWVzKVxuICByZXR1cm4gcGFyc2UoUVVFUklFUywgcXVlcmllcylcbn1cblxuLy8gV2lsbCBiZSBmaWxsZWQgYnkgQ2FuIEkgVXNlIGRhdGEgYmVsb3dcbmJyb3dzZXJzbGlzdC5jYWNoZSA9IHt9XG5icm93c2Vyc2xpc3QuZGF0YSA9IHt9XG5icm93c2Vyc2xpc3QudXNhZ2UgPSB7XG4gIGdsb2JhbDoge30sXG4gIGN1c3RvbTogbnVsbFxufVxuXG4vLyBEZWZhdWx0IGJyb3dzZXJzIHF1ZXJ5XG5icm93c2Vyc2xpc3QuZGVmYXVsdHMgPSBbJz4gMC41JScsICdsYXN0IDIgdmVyc2lvbnMnLCAnRmlyZWZveCBFU1InLCAnbm90IGRlYWQnXVxuXG4vLyBCcm93c2VyIG5hbWVzIGFsaWFzZXNcbmJyb3dzZXJzbGlzdC5hbGlhc2VzID0ge1xuICBmeDogJ2ZpcmVmb3gnLFxuICBmZjogJ2ZpcmVmb3gnLFxuICBpb3M6ICdpb3Nfc2FmJyxcbiAgZXhwbG9yZXI6ICdpZScsXG4gIGJsYWNrYmVycnk6ICdiYicsXG4gIGV4cGxvcmVybW9iaWxlOiAnaWVfbW9iJyxcbiAgb3BlcmFtaW5pOiAnb3BfbWluaScsXG4gIG9wZXJhbW9iaWxlOiAnb3BfbW9iJyxcbiAgY2hyb21lYW5kcm9pZDogJ2FuZF9jaHInLFxuICBmaXJlZm94YW5kcm9pZDogJ2FuZF9mZicsXG4gIHVjYW5kcm9pZDogJ2FuZF91YycsXG4gIHFxYW5kcm9pZDogJ2FuZF9xcSdcbn1cblxuLy8gQ2FuIEkgVXNlIG9ubHkgcHJvdmlkZXMgYSBmZXcgdmVyc2lvbnMgZm9yIHNvbWUgYnJvd3NlcnMgKGUuZy4gYW5kX2NocikuXG4vLyBGYWxsYmFjayB0byBhIHNpbWlsYXIgYnJvd3NlciBmb3IgdW5rbm93biB2ZXJzaW9uc1xuYnJvd3NlcnNsaXN0LmRlc2t0b3BOYW1lcyA9IHtcbiAgYW5kX2NocjogJ2Nocm9tZScsXG4gIGFuZF9mZjogJ2ZpcmVmb3gnLFxuICBpZV9tb2I6ICdpZScsXG4gIG9wX21vYjogJ29wZXJhJyxcbiAgYW5kcm9pZDogJ2Nocm9tZScgLy8gaGFzIGV4dHJhIHByb2Nlc3NpbmcgbG9naWNcbn1cblxuLy8gQWxpYXNlcyB0byB3b3JrIHdpdGggam9pbmVkIHZlcnNpb25zIGxpa2UgYGlvc19zYWYgNy4wLTcuMWBcbmJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlcyA9IHt9XG5cbmJyb3dzZXJzbGlzdC5jbGVhckNhY2hlcyA9IGVudi5jbGVhckNhY2hlc1xuYnJvd3NlcnNsaXN0LnBhcnNlQ29uZmlnID0gZW52LnBhcnNlQ29uZmlnXG5icm93c2Vyc2xpc3QucmVhZENvbmZpZyA9IGVudi5yZWFkQ29uZmlnXG5icm93c2Vyc2xpc3QuZmluZENvbmZpZyA9IGVudi5maW5kQ29uZmlnXG5icm93c2Vyc2xpc3QubG9hZENvbmZpZyA9IGVudi5sb2FkQ29uZmlnXG5cbmJyb3dzZXJzbGlzdC5jb3ZlcmFnZSA9IGZ1bmN0aW9uIChicm93c2Vycywgc3RhdHMpIHtcbiAgdmFyIGRhdGFcbiAgaWYgKHR5cGVvZiBzdGF0cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBkYXRhID0gYnJvd3NlcnNsaXN0LnVzYWdlLmdsb2JhbFxuICB9IGVsc2UgaWYgKHN0YXRzID09PSAnbXkgc3RhdHMnKSB7XG4gICAgdmFyIG9wdHMgPSB7fVxuICAgIG9wdHMucGF0aCA9IHBhdGgucmVzb2x2ZSA/IHBhdGgucmVzb2x2ZSgnLicpIDogJy4nXG4gICAgdmFyIGN1c3RvbVN0YXRzID0gZW52LmdldFN0YXQob3B0cylcbiAgICBpZiAoIWN1c3RvbVN0YXRzKSB7XG4gICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoJ0N1c3RvbSB1c2FnZSBzdGF0aXN0aWNzIHdhcyBub3QgcHJvdmlkZWQnKVxuICAgIH1cbiAgICBkYXRhID0ge31cbiAgICBmb3IgKHZhciBicm93c2VyIGluIGN1c3RvbVN0YXRzKSB7XG4gICAgICBmaWxsVXNhZ2UoZGF0YSwgYnJvd3NlciwgY3VzdG9tU3RhdHNbYnJvd3Nlcl0pXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiBzdGF0cyA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAoc3RhdHMubGVuZ3RoID4gMikge1xuICAgICAgc3RhdHMgPSBzdGF0cy50b0xvd2VyQ2FzZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRzID0gc3RhdHMudG9VcHBlckNhc2UoKVxuICAgIH1cbiAgICBlbnYubG9hZENvdW50cnkoYnJvd3NlcnNsaXN0LnVzYWdlLCBzdGF0cywgYnJvd3NlcnNsaXN0LmRhdGEpXG4gICAgZGF0YSA9IGJyb3dzZXJzbGlzdC51c2FnZVtzdGF0c11cbiAgfSBlbHNlIHtcbiAgICBpZiAoJ2RhdGFCeUJyb3dzZXInIGluIHN0YXRzKSB7XG4gICAgICBzdGF0cyA9IHN0YXRzLmRhdGFCeUJyb3dzZXJcbiAgICB9XG4gICAgZGF0YSA9IHt9XG4gICAgZm9yICh2YXIgbmFtZSBpbiBzdGF0cykge1xuICAgICAgZm9yICh2YXIgdmVyc2lvbiBpbiBzdGF0c1tuYW1lXSkge1xuICAgICAgICBkYXRhW25hbWUgKyAnICcgKyB2ZXJzaW9uXSA9IHN0YXRzW25hbWVdW3ZlcnNpb25dXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJyb3dzZXJzLnJlZHVjZShmdW5jdGlvbiAoYWxsLCBpKSB7XG4gICAgdmFyIHVzYWdlID0gZGF0YVtpXVxuICAgIGlmICh1c2FnZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB1c2FnZSA9IGRhdGFbaS5yZXBsYWNlKC8gXFxTKyQvLCAnIDAnKV1cbiAgICB9XG4gICAgcmV0dXJuIGFsbCArICh1c2FnZSB8fCAwKVxuICB9LCAwKVxufVxuXG5mdW5jdGlvbiBub2RlUXVlcnkoY29udGV4dCwgbm9kZSkge1xuICB2YXIgbWF0Y2hlZCA9IGJyb3dzZXJzbGlzdC5ub2RlVmVyc2lvbnMuZmlsdGVyKGZ1bmN0aW9uIChpKSB7XG4gICAgcmV0dXJuIGlzVmVyc2lvbnNNYXRjaChpLCBub2RlLnZlcnNpb24pXG4gIH0pXG4gIGlmIChtYXRjaGVkLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChjb250ZXh0Lmlnbm9yZVVua25vd25WZXJzaW9ucykge1xuICAgICAgcmV0dXJuIFtdXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICAgJ1Vua25vd24gdmVyc2lvbiAnICsgbm9kZS52ZXJzaW9uICsgJyBvZiBOb2RlLmpzJ1xuICAgICAgKVxuICAgIH1cbiAgfVxuICByZXR1cm4gWydub2RlICcgKyBtYXRjaGVkW21hdGNoZWQubGVuZ3RoIC0gMV1dXG59XG5cbmZ1bmN0aW9uIHNpbmNlUXVlcnkoY29udGV4dCwgbm9kZSkge1xuICB2YXIgeWVhciA9IHBhcnNlSW50KG5vZGUueWVhcilcbiAgdmFyIG1vbnRoID0gcGFyc2VJbnQobm9kZS5tb250aCB8fCAnMDEnKSAtIDFcbiAgdmFyIGRheSA9IHBhcnNlSW50KG5vZGUuZGF5IHx8ICcwMScpXG4gIHJldHVybiBmaWx0ZXJCeVllYXIoRGF0ZS5VVEMoeWVhciwgbW9udGgsIGRheSwgMCwgMCwgMCksIGNvbnRleHQpXG59XG5cbmZ1bmN0aW9uIGNvdmVyUXVlcnkoY29udGV4dCwgbm9kZSkge1xuICB2YXIgY292ZXJhZ2UgPSBwYXJzZUZsb2F0KG5vZGUuY292ZXJhZ2UpXG4gIHZhciB1c2FnZSA9IGJyb3dzZXJzbGlzdC51c2FnZS5nbG9iYWxcbiAgaWYgKG5vZGUucGxhY2UpIHtcbiAgICBpZiAobm9kZS5wbGFjZS5tYXRjaCgvXm15XFxzK3N0YXRzJC9pKSkge1xuICAgICAgaWYgKCFjb250ZXh0LmN1c3RvbVVzYWdlKSB7XG4gICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcignQ3VzdG9tIHVzYWdlIHN0YXRpc3RpY3Mgd2FzIG5vdCBwcm92aWRlZCcpXG4gICAgICB9XG4gICAgICB1c2FnZSA9IGNvbnRleHQuY3VzdG9tVXNhZ2VcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHBsYWNlXG4gICAgICBpZiAobm9kZS5wbGFjZS5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgcGxhY2UgPSBub2RlLnBsYWNlLnRvVXBwZXJDYXNlKClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBsYWNlID0gbm9kZS5wbGFjZS50b0xvd2VyQ2FzZSgpXG4gICAgICB9XG4gICAgICBlbnYubG9hZENvdW50cnkoYnJvd3NlcnNsaXN0LnVzYWdlLCBwbGFjZSwgYnJvd3NlcnNsaXN0LmRhdGEpXG4gICAgICB1c2FnZSA9IGJyb3dzZXJzbGlzdC51c2FnZVtwbGFjZV1cbiAgICB9XG4gIH1cbiAgdmFyIHZlcnNpb25zID0gT2JqZWN0LmtleXModXNhZ2UpLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gdXNhZ2VbYl0gLSB1c2FnZVthXVxuICB9KVxuICB2YXIgY292ZXJhZ2VkID0gMFxuICB2YXIgcmVzdWx0ID0gW11cbiAgdmFyIHZlcnNpb25cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJzaW9ucy5sZW5ndGg7IGkrKykge1xuICAgIHZlcnNpb24gPSB2ZXJzaW9uc1tpXVxuICAgIGlmICh1c2FnZVt2ZXJzaW9uXSA9PT0gMCkgYnJlYWtcbiAgICBjb3ZlcmFnZWQgKz0gdXNhZ2VbdmVyc2lvbl1cbiAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgIGlmIChjb3ZlcmFnZWQgPj0gY292ZXJhZ2UpIGJyZWFrXG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG52YXIgUVVFUklFUyA9IHtcbiAgbGFzdF9tYWpvcl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrbWFqb3JcXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhhZ2VudHMpLnJlZHVjZShmdW5jdGlvbiAoc2VsZWN0ZWQsIG5hbWUpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBieU5hbWUobmFtZSwgY29udGV4dClcbiAgICAgICAgaWYgKCFkYXRhKSByZXR1cm4gc2VsZWN0ZWRcbiAgICAgICAgdmFyIGxpc3QgPSBnZXRNYWpvclZlcnNpb25zKGRhdGEucmVsZWFzZWQsIG5vZGUudmVyc2lvbnMpXG4gICAgICAgIGxpc3QgPSBsaXN0Lm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpXG4gICAgICAgIGlmIChkYXRhLm5hbWUgPT09ICdhbmRyb2lkJykge1xuICAgICAgICAgIGxpc3QgPSBmaWx0ZXJBbmRyb2lkKGxpc3QsIG5vZGUudmVyc2lvbnMsIGNvbnRleHQpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkLmNvbmNhdChsaXN0KVxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICBsYXN0X3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGFnZW50cykucmVkdWNlKGZ1bmN0aW9uIChzZWxlY3RlZCwgbmFtZSkge1xuICAgICAgICB2YXIgZGF0YSA9IGJ5TmFtZShuYW1lLCBjb250ZXh0KVxuICAgICAgICBpZiAoIWRhdGEpIHJldHVybiBzZWxlY3RlZFxuICAgICAgICB2YXIgbGlzdCA9IGRhdGEucmVsZWFzZWQuc2xpY2UoLW5vZGUudmVyc2lvbnMpXG4gICAgICAgIGxpc3QgPSBsaXN0Lm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpXG4gICAgICAgIGlmIChkYXRhLm5hbWUgPT09ICdhbmRyb2lkJykge1xuICAgICAgICAgIGxpc3QgPSBmaWx0ZXJBbmRyb2lkKGxpc3QsIG5vZGUudmVyc2lvbnMsIGNvbnRleHQpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkLmNvbmNhdChsaXN0KVxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICBsYXN0X2VsZWN0cm9uX21ham9yX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccytlbGVjdHJvblxccyttYWpvclxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIHZhbGlkVmVyc2lvbnMgPSBnZXRNYWpvclZlcnNpb25zKE9iamVjdC5rZXlzKGUyYyksIG5vZGUudmVyc2lvbnMpXG4gICAgICByZXR1cm4gdmFsaWRWZXJzaW9ucy5tYXAoZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgcmV0dXJuICdjaHJvbWUgJyArIGUyY1tpXVxuICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIGxhc3Rfbm9kZV9tYWpvcl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrbm9kZVxccyttYWpvclxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIGdldE1ham9yVmVyc2lvbnMoYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9ucywgbm9kZS52ZXJzaW9ucykubWFwKFxuICAgICAgICBmdW5jdGlvbiAodmVyc2lvbikge1xuICAgICAgICAgIHJldHVybiAnbm9kZSAnICsgdmVyc2lvblxuICAgICAgICB9XG4gICAgICApXG4gICAgfVxuICB9LFxuICBsYXN0X2Jyb3dzZXJfbWFqb3JfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb25zJywgJ2Jyb3dzZXInXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrKFxcdyspXFxzK21ham9yXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgZGF0YSA9IGNoZWNrTmFtZShub2RlLmJyb3dzZXIsIGNvbnRleHQpXG4gICAgICB2YXIgdmFsaWRWZXJzaW9ucyA9IGdldE1ham9yVmVyc2lvbnMoZGF0YS5yZWxlYXNlZCwgbm9kZS52ZXJzaW9ucylcbiAgICAgIHZhciBsaXN0ID0gdmFsaWRWZXJzaW9ucy5tYXAobmFtZU1hcHBlcihkYXRhLm5hbWUpKVxuICAgICAgaWYgKGRhdGEubmFtZSA9PT0gJ2FuZHJvaWQnKSB7XG4gICAgICAgIGxpc3QgPSBmaWx0ZXJBbmRyb2lkKGxpc3QsIG5vZGUudmVyc2lvbnMsIGNvbnRleHQpXG4gICAgICB9XG4gICAgICByZXR1cm4gbGlzdFxuICAgIH1cbiAgfSxcbiAgbGFzdF9lbGVjdHJvbl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrZWxlY3Ryb25cXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhlMmMpXG4gICAgICAgIC5zbGljZSgtbm9kZS52ZXJzaW9ucylcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoaSkge1xuICAgICAgICAgIHJldHVybiAnY2hyb21lICcgKyBlMmNbaV1cbiAgICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIGxhc3Rfbm9kZV92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrbm9kZVxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIGJyb3dzZXJzbGlzdC5ub2RlVmVyc2lvbnNcbiAgICAgICAgLnNsaWNlKC1ub2RlLnZlcnNpb25zKVxuICAgICAgICAubWFwKGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuICdub2RlICcgKyB2ZXJzaW9uXG4gICAgICAgIH0pXG4gICAgfVxuICB9LFxuICBsYXN0X2Jyb3dzZXJfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb25zJywgJ2Jyb3dzZXInXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrKFxcdyspXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgZGF0YSA9IGNoZWNrTmFtZShub2RlLmJyb3dzZXIsIGNvbnRleHQpXG4gICAgICB2YXIgbGlzdCA9IGRhdGEucmVsZWFzZWQuc2xpY2UoLW5vZGUudmVyc2lvbnMpLm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpXG4gICAgICBpZiAoZGF0YS5uYW1lID09PSAnYW5kcm9pZCcpIHtcbiAgICAgICAgbGlzdCA9IGZpbHRlckFuZHJvaWQobGlzdCwgbm9kZS52ZXJzaW9ucywgY29udGV4dClcbiAgICAgIH1cbiAgICAgIHJldHVybiBsaXN0XG4gICAgfVxuICB9LFxuICB1bnJlbGVhc2VkX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXnVucmVsZWFzZWRcXHMrdmVyc2lvbnMkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGFnZW50cykucmVkdWNlKGZ1bmN0aW9uIChzZWxlY3RlZCwgbmFtZSkge1xuICAgICAgICB2YXIgZGF0YSA9IGJ5TmFtZShuYW1lLCBjb250ZXh0KVxuICAgICAgICBpZiAoIWRhdGEpIHJldHVybiBzZWxlY3RlZFxuICAgICAgICB2YXIgbGlzdCA9IGRhdGEudmVyc2lvbnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGEucmVsZWFzZWQuaW5kZXhPZih2KSA9PT0gLTFcbiAgICAgICAgfSlcbiAgICAgICAgbGlzdCA9IGxpc3QubWFwKG5hbWVNYXBwZXIoZGF0YS5uYW1lKSlcbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkLmNvbmNhdChsaXN0KVxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICB1bnJlbGVhc2VkX2VsZWN0cm9uX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXnVucmVsZWFzZWRcXHMrZWxlY3Ryb25cXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFtdXG4gICAgfVxuICB9LFxuICB1bnJlbGVhc2VkX2Jyb3dzZXJfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbJ2Jyb3dzZXInXSxcbiAgICByZWdleHA6IC9edW5yZWxlYXNlZFxccysoXFx3KylcXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHJldHVybiBkYXRhLnZlcnNpb25zXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YS5yZWxlYXNlZC5pbmRleE9mKHYpID09PSAtMVxuICAgICAgICB9KVxuICAgICAgICAubWFwKG5hbWVNYXBwZXIoZGF0YS5uYW1lKSlcbiAgICB9XG4gIH0sXG4gIGxhc3RfeWVhcnM6IHtcbiAgICBtYXRjaGVzOiBbJ3llYXJzJ10sXG4gICAgcmVnZXhwOiAvXmxhc3RcXHMrKFxcZCouP1xcZCspXFxzK3llYXJzPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gZmlsdGVyQnlZZWFyKERhdGUubm93KCkgLSBZRUFSICogbm9kZS55ZWFycywgY29udGV4dClcbiAgICB9XG4gIH0sXG4gIHNpbmNlX3k6IHtcbiAgICBtYXRjaGVzOiBbJ3llYXInXSxcbiAgICByZWdleHA6IC9ec2luY2UgKFxcZCspJC9pLFxuICAgIHNlbGVjdDogc2luY2VRdWVyeVxuICB9LFxuICBzaW5jZV95X206IHtcbiAgICBtYXRjaGVzOiBbJ3llYXInLCAnbW9udGgnXSxcbiAgICByZWdleHA6IC9ec2luY2UgKFxcZCspLShcXGQrKSQvaSxcbiAgICBzZWxlY3Q6IHNpbmNlUXVlcnlcbiAgfSxcbiAgc2luY2VfeV9tX2Q6IHtcbiAgICBtYXRjaGVzOiBbJ3llYXInLCAnbW9udGgnLCAnZGF5J10sXG4gICAgcmVnZXhwOiAvXnNpbmNlIChcXGQrKS0oXFxkKyktKFxcZCspJC9pLFxuICAgIHNlbGVjdDogc2luY2VRdWVyeVxuICB9LFxuICBwb3B1bGFyaXR5OiB7XG4gICAgbWF0Y2hlczogWydzaWduJywgJ3BvcHVsYXJpdHknXSxcbiAgICByZWdleHA6IC9eKD49P3w8PT8pXFxzKihcXGQrfFxcZCtcXC5cXGQrfFxcLlxcZCspJSQvLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBwb3B1bGFyaXR5ID0gcGFyc2VGbG9hdChub2RlLnBvcHVsYXJpdHkpXG4gICAgICB2YXIgdXNhZ2UgPSBicm93c2Vyc2xpc3QudXNhZ2UuZ2xvYmFsXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXModXNhZ2UpLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCB2ZXJzaW9uKSB7XG4gICAgICAgIGlmIChub2RlLnNpZ24gPT09ICc+Jykge1xuICAgICAgICAgIGlmICh1c2FnZVt2ZXJzaW9uXSA+IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuc2lnbiA9PT0gJzwnKSB7XG4gICAgICAgICAgaWYgKHVzYWdlW3ZlcnNpb25dIDwgcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPD0nKSB7XG4gICAgICAgICAgaWYgKHVzYWdlW3ZlcnNpb25dIDw9IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHVzYWdlW3ZlcnNpb25dID49IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgIH0sIFtdKVxuICAgIH1cbiAgfSxcbiAgcG9wdWxhcml0eV9pbl9teV9zdGF0czoge1xuICAgIG1hdGNoZXM6IFsnc2lnbicsICdwb3B1bGFyaXR5J10sXG4gICAgcmVnZXhwOiAvXig+PT98PD0/KVxccyooXFxkK3xcXGQrXFwuXFxkK3xcXC5cXGQrKSVcXHMraW5cXHMrbXlcXHMrc3RhdHMkLyxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgcG9wdWxhcml0eSA9IHBhcnNlRmxvYXQobm9kZS5wb3B1bGFyaXR5KVxuICAgICAgaWYgKCFjb250ZXh0LmN1c3RvbVVzYWdlKSB7XG4gICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcignQ3VzdG9tIHVzYWdlIHN0YXRpc3RpY3Mgd2FzIG5vdCBwcm92aWRlZCcpXG4gICAgICB9XG4gICAgICB2YXIgdXNhZ2UgPSBjb250ZXh0LmN1c3RvbVVzYWdlXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXModXNhZ2UpLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCB2ZXJzaW9uKSB7XG4gICAgICAgIHZhciBwZXJjZW50YWdlID0gdXNhZ2VbdmVyc2lvbl1cbiAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChub2RlLnNpZ24gPT09ICc+Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlID4gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPCcpIHtcbiAgICAgICAgICBpZiAocGVyY2VudGFnZSA8IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuc2lnbiA9PT0gJzw9Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlIDw9IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHBlcmNlbnRhZ2UgPj0gcG9wdWxhcml0eSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICBwb3B1bGFyaXR5X2luX2NvbmZpZ19zdGF0czoge1xuICAgIG1hdGNoZXM6IFsnc2lnbicsICdwb3B1bGFyaXR5JywgJ2NvbmZpZyddLFxuICAgIHJlZ2V4cDogL14oPj0/fDw9PylcXHMqKFxcZCt8XFxkK1xcLlxcZCt8XFwuXFxkKyklXFxzK2luXFxzKyhcXFMrKVxccytzdGF0cyQvLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBwb3B1bGFyaXR5ID0gcGFyc2VGbG9hdChub2RlLnBvcHVsYXJpdHkpXG4gICAgICB2YXIgc3RhdHMgPSBlbnYubG9hZFN0YXQoY29udGV4dCwgbm9kZS5jb25maWcsIGJyb3dzZXJzbGlzdC5kYXRhKVxuICAgICAgaWYgKHN0YXRzKSB7XG4gICAgICAgIGNvbnRleHQuY3VzdG9tVXNhZ2UgPSB7fVxuICAgICAgICBmb3IgKHZhciBicm93c2VyIGluIHN0YXRzKSB7XG4gICAgICAgICAgZmlsbFVzYWdlKGNvbnRleHQuY3VzdG9tVXNhZ2UsIGJyb3dzZXIsIHN0YXRzW2Jyb3dzZXJdKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWNvbnRleHQuY3VzdG9tVXNhZ2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKCdDdXN0b20gdXNhZ2Ugc3RhdGlzdGljcyB3YXMgbm90IHByb3ZpZGVkJylcbiAgICAgIH1cbiAgICAgIHZhciB1c2FnZSA9IGNvbnRleHQuY3VzdG9tVXNhZ2VcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyh1c2FnZSkucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZlcnNpb24pIHtcbiAgICAgICAgdmFyIHBlcmNlbnRhZ2UgPSB1c2FnZVt2ZXJzaW9uXVxuICAgICAgICBpZiAocGVyY2VudGFnZSA9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuc2lnbiA9PT0gJz4nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPiBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLnNpZ24gPT09ICc8Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlIDwgcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPD0nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPD0gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocGVyY2VudGFnZSA+PSBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIHBvcHVsYXJpdHlfaW5fcGxhY2U6IHtcbiAgICBtYXRjaGVzOiBbJ3NpZ24nLCAncG9wdWxhcml0eScsICdwbGFjZSddLFxuICAgIHJlZ2V4cDogL14oPj0/fDw9PylcXHMqKFxcZCt8XFxkK1xcLlxcZCt8XFwuXFxkKyklXFxzK2luXFxzKygoYWx0LSk/XFx3XFx3KSQvLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBwb3B1bGFyaXR5ID0gcGFyc2VGbG9hdChub2RlLnBvcHVsYXJpdHkpXG4gICAgICB2YXIgcGxhY2UgPSBub2RlLnBsYWNlXG4gICAgICBpZiAocGxhY2UubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIHBsYWNlID0gcGxhY2UudG9VcHBlckNhc2UoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGxhY2UgPSBwbGFjZS50b0xvd2VyQ2FzZSgpXG4gICAgICB9XG4gICAgICBlbnYubG9hZENvdW50cnkoYnJvd3NlcnNsaXN0LnVzYWdlLCBwbGFjZSwgYnJvd3NlcnNsaXN0LmRhdGEpXG4gICAgICB2YXIgdXNhZ2UgPSBicm93c2Vyc2xpc3QudXNhZ2VbcGxhY2VdXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXModXNhZ2UpLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCB2ZXJzaW9uKSB7XG4gICAgICAgIHZhciBwZXJjZW50YWdlID0gdXNhZ2VbdmVyc2lvbl1cbiAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChub2RlLnNpZ24gPT09ICc+Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlID4gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPCcpIHtcbiAgICAgICAgICBpZiAocGVyY2VudGFnZSA8IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuc2lnbiA9PT0gJzw9Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlIDw9IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHBlcmNlbnRhZ2UgPj0gcG9wdWxhcml0eSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICBjb3Zlcjoge1xuICAgIG1hdGNoZXM6IFsnY292ZXJhZ2UnXSxcbiAgICByZWdleHA6IC9eY292ZXJcXHMrKFxcZCt8XFxkK1xcLlxcZCt8XFwuXFxkKyklJC9pLFxuICAgIHNlbGVjdDogY292ZXJRdWVyeVxuICB9LFxuICBjb3Zlcl9pbjoge1xuICAgIG1hdGNoZXM6IFsnY292ZXJhZ2UnLCAncGxhY2UnXSxcbiAgICByZWdleHA6IC9eY292ZXJcXHMrKFxcZCt8XFxkK1xcLlxcZCt8XFwuXFxkKyklXFxzK2luXFxzKyhteVxccytzdGF0c3woYWx0LSk/XFx3XFx3KSQvaSxcbiAgICBzZWxlY3Q6IGNvdmVyUXVlcnlcbiAgfSxcbiAgc3VwcG9ydHM6IHtcbiAgICBtYXRjaGVzOiBbJ2ZlYXR1cmUnXSxcbiAgICByZWdleHA6IC9ec3VwcG9ydHNcXHMrKFtcXHctXSspJC8sXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgZW52LmxvYWRGZWF0dXJlKGJyb3dzZXJzbGlzdC5jYWNoZSwgbm9kZS5mZWF0dXJlKVxuICAgICAgdmFyIGZlYXR1cmVzID0gYnJvd3NlcnNsaXN0LmNhY2hlW25vZGUuZmVhdHVyZV1cbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhmZWF0dXJlcykucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZlcnNpb24pIHtcbiAgICAgICAgdmFyIGZsYWdzID0gZmVhdHVyZXNbdmVyc2lvbl1cbiAgICAgICAgaWYgKGZsYWdzLmluZGV4T2YoJ3knKSA+PSAwIHx8IGZsYWdzLmluZGV4T2YoJ2EnKSA+PSAwKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIGVsZWN0cm9uX3JhbmdlOiB7XG4gICAgbWF0Y2hlczogWydmcm9tJywgJ3RvJ10sXG4gICAgcmVnZXhwOiAvXmVsZWN0cm9uXFxzKyhbXFxkLl0rKVxccyotXFxzKihbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgZnJvbVRvVXNlID0gbm9ybWFsaXplRWxlY3Ryb24obm9kZS5mcm9tKVxuICAgICAgdmFyIHRvVG9Vc2UgPSBub3JtYWxpemVFbGVjdHJvbihub2RlLnRvKVxuICAgICAgdmFyIGZyb20gPSBwYXJzZUZsb2F0KG5vZGUuZnJvbSlcbiAgICAgIHZhciB0byA9IHBhcnNlRmxvYXQobm9kZS50bylcbiAgICAgIGlmICghZTJjW2Zyb21Ub1VzZV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKCdVbmtub3duIHZlcnNpb24gJyArIGZyb20gKyAnIG9mIGVsZWN0cm9uJylcbiAgICAgIH1cbiAgICAgIGlmICghZTJjW3RvVG9Vc2VdKSB7XG4gICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcignVW5rbm93biB2ZXJzaW9uICcgKyB0byArICcgb2YgZWxlY3Ryb24nKVxuICAgICAgfVxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGUyYylcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoaSkge1xuICAgICAgICAgIHZhciBwYXJzZWQgPSBwYXJzZUZsb2F0KGkpXG4gICAgICAgICAgcmV0dXJuIHBhcnNlZCA+PSBmcm9tICYmIHBhcnNlZCA8PSB0b1xuICAgICAgICB9KVxuICAgICAgICAubWFwKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgcmV0dXJuICdjaHJvbWUgJyArIGUyY1tpXVxuICAgICAgICB9KVxuICAgIH1cbiAgfSxcbiAgbm9kZV9yYW5nZToge1xuICAgIG1hdGNoZXM6IFsnZnJvbScsICd0byddLFxuICAgIHJlZ2V4cDogL15ub2RlXFxzKyhbXFxkLl0rKVxccyotXFxzKihbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9uc1xuICAgICAgICAuZmlsdGVyKHNlbXZlckZpbHRlckxvb3NlKCc+PScsIG5vZGUuZnJvbSkpXG4gICAgICAgIC5maWx0ZXIoc2VtdmVyRmlsdGVyTG9vc2UoJzw9Jywgbm9kZS50bykpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICByZXR1cm4gJ25vZGUgJyArIHZcbiAgICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIGJyb3dzZXJfcmFuZ2U6IHtcbiAgICBtYXRjaGVzOiBbJ2Jyb3dzZXInLCAnZnJvbScsICd0byddLFxuICAgIHJlZ2V4cDogL14oXFx3KylcXHMrKFtcXGQuXSspXFxzKi1cXHMqKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHZhciBmcm9tID0gcGFyc2VGbG9hdChub3JtYWxpemVWZXJzaW9uKGRhdGEsIG5vZGUuZnJvbSkgfHwgbm9kZS5mcm9tKVxuICAgICAgdmFyIHRvID0gcGFyc2VGbG9hdChub3JtYWxpemVWZXJzaW9uKGRhdGEsIG5vZGUudG8pIHx8IG5vZGUudG8pXG4gICAgICBmdW5jdGlvbiBmaWx0ZXIodikge1xuICAgICAgICB2YXIgcGFyc2VkID0gcGFyc2VGbG9hdCh2KVxuICAgICAgICByZXR1cm4gcGFyc2VkID49IGZyb20gJiYgcGFyc2VkIDw9IHRvXG4gICAgICB9XG4gICAgICByZXR1cm4gZGF0YS5yZWxlYXNlZC5maWx0ZXIoZmlsdGVyKS5tYXAobmFtZU1hcHBlcihkYXRhLm5hbWUpKVxuICAgIH1cbiAgfSxcbiAgZWxlY3Ryb25fcmF5OiB7XG4gICAgbWF0Y2hlczogWydzaWduJywgJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9eZWxlY3Ryb25cXHMqKD49P3w8PT8pXFxzKihbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgdmVyc2lvblRvVXNlID0gbm9ybWFsaXplRWxlY3Ryb24obm9kZS52ZXJzaW9uKVxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGUyYylcbiAgICAgICAgLmZpbHRlcihnZW5lcmF0ZUZpbHRlcihub2RlLnNpZ24sIHZlcnNpb25Ub1VzZSkpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICByZXR1cm4gJ2Nocm9tZSAnICsgZTJjW2ldXG4gICAgICAgIH0pXG4gICAgfVxuICB9LFxuICBub2RlX3JheToge1xuICAgIG1hdGNoZXM6IFsnc2lnbicsICd2ZXJzaW9uJ10sXG4gICAgcmVnZXhwOiAvXm5vZGVcXHMqKD49P3w8PT8pXFxzKihbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9uc1xuICAgICAgICAuZmlsdGVyKGdlbmVyYXRlU2VtdmVyRmlsdGVyKG5vZGUuc2lnbiwgbm9kZS52ZXJzaW9uKSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAodikge1xuICAgICAgICAgIHJldHVybiAnbm9kZSAnICsgdlxuICAgICAgICB9KVxuICAgIH1cbiAgfSxcbiAgYnJvd3Nlcl9yYXk6IHtcbiAgICBtYXRjaGVzOiBbJ2Jyb3dzZXInLCAnc2lnbicsICd2ZXJzaW9uJ10sXG4gICAgcmVnZXhwOiAvXihcXHcrKVxccyooPj0/fDw9PylcXHMqKFtcXGQuXSspJC8sXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIHZlcnNpb24gPSBub2RlLnZlcnNpb25cbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHZhciBhbGlhcyA9IGJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlc1tkYXRhLm5hbWVdW3ZlcnNpb25dXG4gICAgICBpZiAoYWxpYXMpIHZlcnNpb24gPSBhbGlhc1xuICAgICAgcmV0dXJuIGRhdGEucmVsZWFzZWRcbiAgICAgICAgLmZpbHRlcihnZW5lcmF0ZUZpbHRlcihub2RlLnNpZ24sIHZlcnNpb24pKVxuICAgICAgICAubWFwKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGEubmFtZSArICcgJyArIHZcbiAgICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIGZpcmVmb3hfZXNyOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXihmaXJlZm94fGZmfGZ4KVxccytlc3IkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gWydmaXJlZm94IDEwMiddXG4gICAgfVxuICB9LFxuICBvcGVyYV9taW5pX2FsbDoge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogLyhvcGVyYW1pbml8b3BfbWluaSlcXHMrYWxsL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gWydvcF9taW5pIGFsbCddXG4gICAgfVxuICB9LFxuICBlbGVjdHJvbl92ZXJzaW9uOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9uJ10sXG4gICAgcmVnZXhwOiAvXmVsZWN0cm9uXFxzKyhbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgdmVyc2lvblRvVXNlID0gbm9ybWFsaXplRWxlY3Ryb24obm9kZS52ZXJzaW9uKVxuICAgICAgdmFyIGNocm9tZSA9IGUyY1t2ZXJzaW9uVG9Vc2VdXG4gICAgICBpZiAoIWNocm9tZSkge1xuICAgICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAgICAgJ1Vua25vd24gdmVyc2lvbiAnICsgbm9kZS52ZXJzaW9uICsgJyBvZiBlbGVjdHJvbidcbiAgICAgICAgKVxuICAgICAgfVxuICAgICAgcmV0dXJuIFsnY2hyb21lICcgKyBjaHJvbWVdXG4gICAgfVxuICB9LFxuICBub2RlX21ham9yX3ZlcnNpb246IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9ebm9kZVxccysoXFxkKykkL2ksXG4gICAgc2VsZWN0OiBub2RlUXVlcnlcbiAgfSxcbiAgbm9kZV9taW5vcl92ZXJzaW9uOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9uJ10sXG4gICAgcmVnZXhwOiAvXm5vZGVcXHMrKFxcZCtcXC5cXGQrKSQvaSxcbiAgICBzZWxlY3Q6IG5vZGVRdWVyeVxuICB9LFxuICBub2RlX3BhdGNoX3ZlcnNpb246IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9ebm9kZVxccysoXFxkK1xcLlxcZCtcXC5cXGQrKSQvaSxcbiAgICBzZWxlY3Q6IG5vZGVRdWVyeVxuICB9LFxuICBjdXJyZW50X25vZGU6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eY3VycmVudFxccytub2RlJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgIHJldHVybiBbZW52LmN1cnJlbnROb2RlKHJlc29sdmUsIGNvbnRleHQpXVxuICAgIH1cbiAgfSxcbiAgbWFpbnRhaW5lZF9ub2RlOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXm1haW50YWluZWRcXHMrbm9kZVxccyt2ZXJzaW9ucyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKVxuICAgICAgdmFyIHF1ZXJpZXMgPSBPYmplY3Qua2V5cyhqc0VPTClcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIG5vdyA8IERhdGUucGFyc2UoanNFT0xba2V5XS5lbmQpICYmXG4gICAgICAgICAgICBub3cgPiBEYXRlLnBhcnNlKGpzRU9MW2tleV0uc3RhcnQpICYmXG4gICAgICAgICAgICBpc0VvbFJlbGVhc2VkKGtleSlcbiAgICAgICAgICApXG4gICAgICAgIH0pXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgIHJldHVybiAnbm9kZSAnICsga2V5LnNsaWNlKDEpXG4gICAgICAgIH0pXG4gICAgICByZXR1cm4gcmVzb2x2ZShxdWVyaWVzLCBjb250ZXh0KVxuICAgIH1cbiAgfSxcbiAgcGhhbnRvbWpzXzFfOToge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogL15waGFudG9tanNcXHMrMS45JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFsnc2FmYXJpIDUnXVxuICAgIH1cbiAgfSxcbiAgcGhhbnRvbWpzXzJfMToge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogL15waGFudG9tanNcXHMrMi4xJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFsnc2FmYXJpIDYnXVxuICAgIH1cbiAgfSxcbiAgYnJvd3Nlcl92ZXJzaW9uOiB7XG4gICAgbWF0Y2hlczogWydicm93c2VyJywgJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9eKFxcdyspXFxzKyh0cHxbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgdmVyc2lvbiA9IG5vZGUudmVyc2lvblxuICAgICAgaWYgKC9edHAkL2kudGVzdCh2ZXJzaW9uKSkgdmVyc2lvbiA9ICdUUCdcbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHZhciBhbGlhcyA9IG5vcm1hbGl6ZVZlcnNpb24oZGF0YSwgdmVyc2lvbilcbiAgICAgIGlmIChhbGlhcykge1xuICAgICAgICB2ZXJzaW9uID0gYWxpYXNcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh2ZXJzaW9uLmluZGV4T2YoJy4nKSA9PT0gLTEpIHtcbiAgICAgICAgICBhbGlhcyA9IHZlcnNpb24gKyAnLjAnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWxpYXMgPSB2ZXJzaW9uLnJlcGxhY2UoL1xcLjAkLywgJycpXG4gICAgICAgIH1cbiAgICAgICAgYWxpYXMgPSBub3JtYWxpemVWZXJzaW9uKGRhdGEsIGFsaWFzKVxuICAgICAgICBpZiAoYWxpYXMpIHtcbiAgICAgICAgICB2ZXJzaW9uID0gYWxpYXNcbiAgICAgICAgfSBlbHNlIGlmIChjb250ZXh0Lmlnbm9yZVVua25vd25WZXJzaW9ucykge1xuICAgICAgICAgIHJldHVybiBbXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICAgICAgICdVbmtub3duIHZlcnNpb24gJyArIHZlcnNpb24gKyAnIG9mICcgKyBub2RlLmJyb3dzZXJcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBbZGF0YS5uYW1lICsgJyAnICsgdmVyc2lvbl1cbiAgICB9XG4gIH0sXG4gIGJyb3dzZXJzbGlzdF9jb25maWc6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eYnJvd3NlcnNsaXN0IGNvbmZpZyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgICByZXR1cm4gYnJvd3NlcnNsaXN0KHVuZGVmaW5lZCwgY29udGV4dClcbiAgICB9XG4gIH0sXG4gIGV4dGVuZHM6IHtcbiAgICBtYXRjaGVzOiBbJ2NvbmZpZyddLFxuICAgIHJlZ2V4cDogL15leHRlbmRzICguKykkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIHJlc29sdmUoZW52LmxvYWRRdWVyaWVzKGNvbnRleHQsIG5vZGUuY29uZmlnKSwgY29udGV4dClcbiAgICB9XG4gIH0sXG4gIGRlZmF1bHRzOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXmRlZmF1bHRzJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgIHJldHVybiByZXNvbHZlKGJyb3dzZXJzbGlzdC5kZWZhdWx0cywgY29udGV4dClcbiAgICB9XG4gIH0sXG4gIGRlYWQ6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eZGVhZCQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgICB2YXIgZGVhZCA9IFtcbiAgICAgICAgJ0JhaWR1ID49IDAnLFxuICAgICAgICAnaWUgPD0gMTEnLFxuICAgICAgICAnaWVfbW9iIDw9IDExJyxcbiAgICAgICAgJ2JiIDw9IDEwJyxcbiAgICAgICAgJ29wX21vYiA8PSAxMi4xJyxcbiAgICAgICAgJ3NhbXN1bmcgNCdcbiAgICAgIF1cbiAgICAgIHJldHVybiByZXNvbHZlKGRlYWQsIGNvbnRleHQpXG4gICAgfVxuICB9LFxuICB1bmtub3duOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXihcXHcrKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICBpZiAoYnlOYW1lKG5vZGUucXVlcnksIGNvbnRleHQpKSB7XG4gICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICAgICAnU3BlY2lmeSB2ZXJzaW9ucyBpbiBCcm93c2Vyc2xpc3QgcXVlcnkgZm9yIGJyb3dzZXIgJyArIG5vZGUucXVlcnlcbiAgICAgICAgKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgdW5rbm93blF1ZXJ5KG5vZGUucXVlcnkpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8vIEdldCBhbmQgY29udmVydCBDYW4gSSBVc2UgZGF0YVxuXG47KGZ1bmN0aW9uICgpIHtcbiAgZm9yICh2YXIgbmFtZSBpbiBhZ2VudHMpIHtcbiAgICB2YXIgYnJvd3NlciA9IGFnZW50c1tuYW1lXVxuICAgIGJyb3dzZXJzbGlzdC5kYXRhW25hbWVdID0ge1xuICAgICAgbmFtZTogbmFtZSxcbiAgICAgIHZlcnNpb25zOiBub3JtYWxpemUoYWdlbnRzW25hbWVdLnZlcnNpb25zKSxcbiAgICAgIHJlbGVhc2VkOiBub3JtYWxpemUoYWdlbnRzW25hbWVdLnZlcnNpb25zLnNsaWNlKDAsIC0zKSksXG4gICAgICByZWxlYXNlRGF0ZTogYWdlbnRzW25hbWVdLnJlbGVhc2VfZGF0ZVxuICAgIH1cbiAgICBmaWxsVXNhZ2UoYnJvd3NlcnNsaXN0LnVzYWdlLmdsb2JhbCwgbmFtZSwgYnJvd3Nlci51c2FnZV9nbG9iYWwpXG5cbiAgICBicm93c2Vyc2xpc3QudmVyc2lvbkFsaWFzZXNbbmFtZV0gPSB7fVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnJvd3Nlci52ZXJzaW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGZ1bGwgPSBicm93c2VyLnZlcnNpb25zW2ldXG4gICAgICBpZiAoIWZ1bGwpIGNvbnRpbnVlXG5cbiAgICAgIGlmIChmdWxsLmluZGV4T2YoJy0nKSAhPT0gLTEpIHtcbiAgICAgICAgdmFyIGludGVydmFsID0gZnVsbC5zcGxpdCgnLScpXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgaW50ZXJ2YWwubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBicm93c2Vyc2xpc3QudmVyc2lvbkFsaWFzZXNbbmFtZV1baW50ZXJ2YWxbal1dID0gZnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYnJvd3NlcnNsaXN0LnZlcnNpb25BbGlhc2VzLm9wX21vYlsnNTknXSA9ICc1OCdcblxuICBicm93c2Vyc2xpc3Qubm9kZVZlcnNpb25zID0ganNSZWxlYXNlcy5tYXAoZnVuY3Rpb24gKHJlbGVhc2UpIHtcbiAgICByZXR1cm4gcmVsZWFzZS52ZXJzaW9uXG4gIH0pXG59KSgpXG5cbm1vZHVsZS5leHBvcnRzID0gYnJvd3NlcnNsaXN0XG4iLCJ2YXIgQU5EX1JFR0VYUCA9IC9eXFxzK2FuZFxccysoLiopL2lcbnZhciBPUl9SRUdFWFAgPSAvXig/OixcXHMqfFxccytvclxccyspKC4qKS9pXG5cbmZ1bmN0aW9uIGZsYXR0ZW4oYXJyYXkpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGFycmF5KSkgcmV0dXJuIFthcnJheV1cbiAgcmV0dXJuIGFycmF5LnJlZHVjZShmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiBhLmNvbmNhdChmbGF0dGVuKGIpKVxuICB9LCBbXSlcbn1cblxuZnVuY3Rpb24gZmluZChzdHJpbmcsIHByZWRpY2F0ZSkge1xuICBmb3IgKHZhciBuID0gMSwgbWF4ID0gc3RyaW5nLmxlbmd0aDsgbiA8PSBtYXg7IG4rKykge1xuICAgIHZhciBwYXJzZWQgPSBzdHJpbmcuc3Vic3RyKC1uLCBuKVxuICAgIGlmIChwcmVkaWNhdGUocGFyc2VkLCBuLCBtYXgpKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnNsaWNlKDAsIC1uKVxuICAgIH1cbiAgfVxuICByZXR1cm4gJydcbn1cblxuZnVuY3Rpb24gbWF0Y2hRdWVyeShhbGwsIHF1ZXJ5KSB7XG4gIHZhciBub2RlID0geyBxdWVyeTogcXVlcnkgfVxuICBpZiAocXVlcnkuaW5kZXhPZignbm90ICcpID09PSAwKSB7XG4gICAgbm9kZS5ub3QgPSB0cnVlXG4gICAgcXVlcnkgPSBxdWVyeS5zbGljZSg0KVxuICB9XG5cbiAgZm9yICh2YXIgbmFtZSBpbiBhbGwpIHtcbiAgICB2YXIgdHlwZSA9IGFsbFtuYW1lXVxuICAgIHZhciBtYXRjaCA9IHF1ZXJ5Lm1hdGNoKHR5cGUucmVnZXhwKVxuICAgIGlmIChtYXRjaCkge1xuICAgICAgbm9kZS50eXBlID0gbmFtZVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlLm1hdGNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbm9kZVt0eXBlLm1hdGNoZXNbaV1dID0gbWF0Y2hbaSArIDFdXG4gICAgICB9XG4gICAgICByZXR1cm4gbm9kZVxuICAgIH1cbiAgfVxuXG4gIG5vZGUudHlwZSA9ICd1bmtub3duJ1xuICByZXR1cm4gbm9kZVxufVxuXG5mdW5jdGlvbiBtYXRjaEJsb2NrKGFsbCwgc3RyaW5nLCBxcykge1xuICB2YXIgbm9kZVxuICByZXR1cm4gZmluZChzdHJpbmcsIGZ1bmN0aW9uIChwYXJzZWQsIG4sIG1heCkge1xuICAgIGlmIChBTkRfUkVHRVhQLnRlc3QocGFyc2VkKSkge1xuICAgICAgbm9kZSA9IG1hdGNoUXVlcnkoYWxsLCBwYXJzZWQubWF0Y2goQU5EX1JFR0VYUClbMV0pXG4gICAgICBub2RlLmNvbXBvc2UgPSAnYW5kJ1xuICAgICAgcXMudW5zaGlmdChub2RlKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9IGVsc2UgaWYgKE9SX1JFR0VYUC50ZXN0KHBhcnNlZCkpIHtcbiAgICAgIG5vZGUgPSBtYXRjaFF1ZXJ5KGFsbCwgcGFyc2VkLm1hdGNoKE9SX1JFR0VYUClbMV0pXG4gICAgICBub2RlLmNvbXBvc2UgPSAnb3InXG4gICAgICBxcy51bnNoaWZ0KG5vZGUpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0gZWxzZSBpZiAobiA9PT0gbWF4KSB7XG4gICAgICBub2RlID0gbWF0Y2hRdWVyeShhbGwsIHBhcnNlZC50cmltKCkpXG4gICAgICBub2RlLmNvbXBvc2UgPSAnb3InXG4gICAgICBxcy51bnNoaWZ0KG5vZGUpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZShhbGwsIHF1ZXJpZXMpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHF1ZXJpZXMpKSBxdWVyaWVzID0gW3F1ZXJpZXNdXG4gIHJldHVybiBmbGF0dGVuKFxuICAgIHF1ZXJpZXMubWFwKGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgdmFyIHFzID0gW11cbiAgICAgIGRvIHtcbiAgICAgICAgYmxvY2sgPSBtYXRjaEJsb2NrKGFsbCwgYmxvY2ssIHFzKVxuICAgICAgfSB3aGlsZSAoYmxvY2spXG4gICAgICByZXR1cm4gcXNcbiAgICB9KVxuICApXG59XG4iLCJtb2R1bGUuZXhwb3J0cz17QTp7QTp7SjowLjAxMzEyMTcsRDowLjAwNjIxMTUyLEU6MC4wNTgxMjQ2LEY6MC4wNzc0OTk1LEE6MC4wMDk2ODc0MyxCOjAuNTcxNTU5LFwiOUJcIjowLjAwOTI5OH0sQjpcIm1zXCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCI5QlwiLFwiSlwiLFwiRFwiLFwiRVwiLFwiRlwiLFwiQVwiLFwiQlwiLFwiXCIsXCJcIixcIlwiXSxFOlwiSUVcIixGOntcIjlCXCI6OTYyMzIzMjAwLEo6OTk4ODcwNDAwLEQ6MTE2MTEyOTYwMCxFOjEyMzc0MjA4MDAsRjoxMzAwMDYwODAwLEE6MTM0NjcxNjgwMCxCOjEzODE5NjgwMDB9fSxCOntBOntDOjAuMDAzNzczLEs6MC4wMDQyNjcsTDowLjAwNDI2OCxHOjAuMDAzNzczLE06MC4wMDM3MDIsTjowLjAwMzc3MyxPOjAuMDE1MDkyLFA6MCxROjAuMDA0Mjk4LFI6MC4wMDk0NCxTOjAuMDA0MDQzLFQ6MC4wMDM3NzMsVTowLjAwMzc3MyxWOjAuMDAzOTc0LFc6MC4wMDM5MDEsWDowLjAwNDMxOCxZOjAuMDAzNzczLFo6MC4wMDQxMTgsYTowLjAwMzkzOSxiOjAuMDA3NTQ2LGU6MC4wMDQxMTgsZjowLjAwMzkzOSxnOjAuMDAzODAxLGg6MC4wMDM5MDEsaTowLjAwMzg1NSxqOjAuMDAzOTI5LGs6MC4wMDM5MDEsbDowLjAwMzc3MyxtOjAuMDA3NTQ2LG46MC4wMDM3NzMsbzowLjAxMTMxOSxwOjAuMDExMzE5LHE6MC4wMTg4NjUscjowLjAzMzk1NyxjOjEuMTM5NDUsSDoyLjg1MjM5fSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIkNcIixcIktcIixcIkxcIixcIkdcIixcIk1cIixcIk5cIixcIk9cIixcIlBcIixcIlFcIixcIlJcIixcIlNcIixcIlRcIixcIlVcIixcIlZcIixcIldcIixcIlhcIixcIllcIixcIlpcIixcImFcIixcImJcIixcImVcIixcImZcIixcImdcIixcImhcIixcImlcIixcImpcIixcImtcIixcImxcIixcIm1cIixcIm5cIixcIm9cIixcInBcIixcInFcIixcInJcIixcImNcIixcIkhcIixcIlwiLFwiXCIsXCJcIl0sRTpcIkVkZ2VcIixGOntDOjE0MzgxMjgwMDAsSzoxNDQ3Mjg2NDAwLEw6MTQ3MDA5NjAwMCxHOjE0OTE4Njg4MDAsTToxNTA4MTk4NDAwLE46MTUyNTA0NjQwMCxPOjE1NDIwNjcyMDAsUDoxNTc5MDQ2NDAwLFE6MTU4MTAzMzYwMCxSOjE1ODY3MzYwMDAsUzoxNTkwMDE5MjAwLFQ6MTU5NDg1NzYwMCxVOjE1OTg0ODY0MDAsVjoxNjAyMjAxNjAwLFc6MTYwNTgzMDQwMCxYOjE2MTEzNjAwMDAsWToxNjE0ODE2MDAwLFo6MTYxODM1ODQwMCxhOjE2MjIwNzM2MDAsYjoxNjI2OTEyMDAwLGU6MTYzMDYyNzIwMCxmOjE2MzI0NDE2MDAsZzoxNjM0Nzc0NDAwLGg6MTYzNzUzOTIwMCxpOjE2NDE0MjcyMDAsajoxNjQzOTMyODAwLGs6MTY0NjI2NTYwMCxsOjE2NDk2MzUyMDAsbToxNjUxMTkwNDAwLG46MTY1Mzk1NTIwMCxvOjE2NTU5NDI0MDAscDoxNjU5NjU3NjAwLHE6MTY2MTk5MDQwMCxyOjE2NjQ3NTUyMDAsYzoxNjY2OTE1MjAwLEg6MTY3MDE5ODQwMH0sRDp7QzpcIm1zXCIsSzpcIm1zXCIsTDpcIm1zXCIsRzpcIm1zXCIsTTpcIm1zXCIsTjpcIm1zXCIsTzpcIm1zXCJ9fSxDOntBOntcIjBcIjowLjAwNDMxNyxcIjFcIjowLjAwNDM5MyxcIjJcIjowLjAwNDQxOCxcIjNcIjowLjAwODgzNCxcIjRcIjowLjAwODMyMixcIjVcIjowLjAwODkyOCxcIjZcIjowLjAwNDQ3MSxcIjdcIjowLjAwOTI4NCxcIjhcIjowLjAwNDcwNyxcIjlcIjowLjAwOTA3NixBQzowLjAwNDExOCxyQjowLjAwNDI3MSxJOjAuMDExNzAzLHM6MC4wMDQ4NzksSjowLjAyMDEzNixEOjAuMDA1NzI1LEU6MC4wMDQ1MjUsRjowLjAwNTMzLEE6MC4wMDQyODMsQjowLjAwNzU0NixDOjAuMDA0NDcxLEs6MC4wMDQ0ODYsTDowLjAwNDUzLEc6MC4wMDgzMjIsTTowLjAwNDQxNyxOOjAuMDA0NDI1LE86MC4wMDQxNjEsdDowLjAwNDQ0Myx1OjAuMDA0MjgzLHY6MC4wMDgzMjIsdzowLjAxMzY5OCx4OjAuMDA0MTYxLHk6MC4wMDg3ODYsejowLjAwNDExOCxBQjowLjAwNzU0NixCQjowLjAwNDc4MyxDQjowLjAwMzkyOSxEQjowLjAwNDc4MyxFQjowLjAwNDg3LEZCOjAuMDA1MDI5LEdCOjAuMDA0NyxIQjowLjA5NDMyNSxJQjowLjAwNzU0NixKQjowLjAwMzg2NyxLQjowLjAwNDUyNSxMQjowLjAwNDI5MyxNQjowLjAwMzc3MyxOQjowLjAwNDUzOCxPQjowLjAwODI4MixQQjowLjAxMTYwMSxRQjowLjA1MjgyMixSQjowLjAxMTYwMSxTQjowLjAwMzkyOSxUQjowLjAwMzk3NCxVQjowLjAwNzU0NixWQjowLjAxMTYwMSxXQjowLjAwMzkzOSxzQjowLjAwMzc3MyxYQjowLjAwMzkyOSx0QjowLjAwNDM1NixZQjowLjAwNDQyNSxaQjowLjAwODMyMixhQjowLjAwNDE1LGJCOjAuMDA0MjY3LGNCOjAuMDAzODAxLGRCOjAuMDA0MjY3LGVCOjAuMDAzNzczLGZCOjAuMDA0MTUsZ0I6MC4wMDQyOTMsaEI6MC4wMDQ0MjUsZDowLjAwMzc3MyxpQjowLjAwNDE1LGpCOjAuMDA0MTUsa0I6MC4wMDQzMTgsbEI6MC4wMDQzNTYsbUI6MC4wMDM5NzQsbkI6MC4wMzM5NTcsUDowLjAwMzc3MyxROjAuMDAzNzczLFI6MC4wMDM3NzMsdUI6MC4wMDM3NzMsUzowLjAwMzc3MyxUOjAuMDAzOTI5LFU6MC4wMDQyNjgsVjowLjAwMzgwMSxXOjAuMDExMzE5LFg6MC4wMDc1NDYsWTowLjAwMzc3MyxaOjAuMDAzNzczLGE6MC4wMTg4NjUsYjowLjAwMzgwMSxlOjAuMDAzODU1LGY6MC4wMTg4NjUsZzowLjAwMzc3MyxoOjAuMDAzNzczLGk6MC4wMDM5MDEsajowLjAwMzkwMSxrOjAuMDA3NTQ2LGw6MC4wMDc1NDYsbTowLjAwNzU0NixuOjAuMDgzMDA2LG86MC4wMzAxODQscDowLjAxNTA5MixxOjAuMDMwMTg0LHI6MC4wNDkwNDksYzoxLjEyMDU4LEg6MC45Mzk0NzcsdkI6MC4wMTEzMTksd0I6MCxCQzowLjAwODc4NixDQzowLjAwNDg3fSxCOlwibW96XCIsQzpbXCJBQ1wiLFwickJcIixcIkJDXCIsXCJDQ1wiLFwiSVwiLFwic1wiLFwiSlwiLFwiRFwiLFwiRVwiLFwiRlwiLFwiQVwiLFwiQlwiLFwiQ1wiLFwiS1wiLFwiTFwiLFwiR1wiLFwiTVwiLFwiTlwiLFwiT1wiLFwidFwiLFwidVwiLFwidlwiLFwid1wiLFwieFwiLFwieVwiLFwielwiLFwiMFwiLFwiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiQUJcIixcIkJCXCIsXCJDQlwiLFwiREJcIixcIkVCXCIsXCJGQlwiLFwiR0JcIixcIkhCXCIsXCJJQlwiLFwiSkJcIixcIktCXCIsXCJMQlwiLFwiTUJcIixcIk5CXCIsXCJPQlwiLFwiUEJcIixcIlFCXCIsXCJSQlwiLFwiU0JcIixcIlRCXCIsXCJVQlwiLFwiVkJcIixcIldCXCIsXCJzQlwiLFwiWEJcIixcInRCXCIsXCJZQlwiLFwiWkJcIixcImFCXCIsXCJiQlwiLFwiY0JcIixcImRCXCIsXCJlQlwiLFwiZkJcIixcImdCXCIsXCJoQlwiLFwiZFwiLFwiaUJcIixcImpCXCIsXCJrQlwiLFwibEJcIixcIm1CXCIsXCJuQlwiLFwiUFwiLFwiUVwiLFwiUlwiLFwidUJcIixcIlNcIixcIlRcIixcIlVcIixcIlZcIixcIldcIixcIlhcIixcIllcIixcIlpcIixcImFcIixcImJcIixcImVcIixcImZcIixcImdcIixcImhcIixcImlcIixcImpcIixcImtcIixcImxcIixcIm1cIixcIm5cIixcIm9cIixcInBcIixcInFcIixcInJcIixcImNcIixcIkhcIixcInZCXCIsXCJ3QlwiLFwiXCJdLEU6XCJGaXJlZm94XCIsRjp7XCIwXCI6MTM4NjYzMzYwMCxcIjFcIjoxMzkxNDcyMDAwLFwiMlwiOjEzOTUxMDA4MDAsXCIzXCI6MTM5ODcyOTYwMCxcIjRcIjoxNDAyMzU4NDAwLFwiNVwiOjE0MDU5ODcyMDAsXCI2XCI6MTQwOTYxNjAwMCxcIjdcIjoxNDEzMjQ0ODAwLFwiOFwiOjE0MTczOTIwMDAsXCI5XCI6MTQyMTEwNzIwMCxBQzoxMTYxNjQ4MDAwLHJCOjEyMTM2NjA4MDAsQkM6MTI0NjMyMDAwMCxDQzoxMjY0MDMyMDAwLEk6MTMwMDc1MjAwMCxzOjEzMDg2MTQ0MDAsSjoxMzEzNDUyODAwLEQ6MTMxNzA4MTYwMCxFOjEzMTcwODE2MDAsRjoxMzIwNzEwNDAwLEE6MTMyNDMzOTIwMCxCOjEzMjc5NjgwMDAsQzoxMzMxNTk2ODAwLEs6MTMzNTIyNTYwMCxMOjEzMzg4NTQ0MDAsRzoxMzQyNDgzMjAwLE06MTM0NjExMjAwMCxOOjEzNDk3NDA4MDAsTzoxMzUzNjI4ODAwLHQ6MTM1NzYwMzIwMCx1OjEzNjEyMzIwMDAsdjoxMzY0ODYwODAwLHc6MTM2ODQ4OTYwMCx4OjEzNzIxMTg0MDAseToxMzc1NzQ3MjAwLHo6MTM3OTM3NjAwMCxBQjoxNDI0NzM2MDAwLEJCOjE0MjgyNzg0MDAsQ0I6MTQzMTQ3NTIwMCxEQjoxNDM1ODgxNjAwLEVCOjE0MzkyNTEyMDAsRkI6MTQ0Mjg4MDAwMCxHQjoxNDQ2NTA4ODAwLEhCOjE0NTAxMzc2MDAsSUI6MTQ1Mzg1MjgwMCxKQjoxNDU3Mzk1MjAwLEtCOjE0NjE2Mjg4MDAsTEI6MTQ2NTI1NzYwMCxNQjoxNDcwMDk2MDAwLE5COjE0NzQzMjk2MDAsT0I6MTQ3OTE2ODAwMCxQQjoxNDg1MjE2MDAwLFFCOjE0ODg4NDQ4MDAsUkI6MTQ5MjU2MDAwMCxTQjoxNDk3MzEyMDAwLFRCOjE1MDIxNTA0MDAsVUI6MTUwNjU1NjgwMCxWQjoxNTEwNjE3NjAwLFdCOjE1MTY2NjU2MDAsc0I6MTUyMDk4NTYwMCxYQjoxNTI1ODI0MDAwLHRCOjE1Mjk5NzEyMDAsWUI6MTUzNjEwNTYwMCxaQjoxNTQwMjUyODAwLGFCOjE1NDQ0ODY0MDAsYkI6MTU0ODcyMDAwMCxjQjoxNTUyOTUzNjAwLGRCOjE1NTgzOTY4MDAsZUI6MTU2MjYzMDQwMCxmQjoxNTY3NDY4ODAwLGdCOjE1NzE3ODg4MDAsaEI6MTU3NTMzMTIwMCxkOjE1NzgzNTUyMDAsaUI6MTU4MTM3OTIwMCxqQjoxNTgzNzk4NDAwLGtCOjE1ODYzMDQwMDAsbEI6MTU4ODYzNjgwMCxtQjoxNTkxMDU2MDAwLG5COjE1OTM0NzUyMDAsUDoxNTk1ODk0NDAwLFE6MTU5ODMxMzYwMCxSOjE2MDA3MzI4MDAsdUI6MTYwMzE1MjAwMCxTOjE2MDU1NzEyMDAsVDoxNjA3OTkwNDAwLFU6MTYxMTYxOTIwMCxWOjE2MTQwMzg0MDAsVzoxNjE2NDU3NjAwLFg6MTYxODc5MDQwMCxZOjE2MjI1MDU2MDAsWjoxNjI2MTM0NDAwLGE6MTYyODU1MzYwMCxiOjE2MzA5NzI4MDAsZToxNjMzMzkyMDAwLGY6MTYzNTgxMTIwMCxnOjE2Mzg4MzUyMDAsaDoxNjQxODU5MjAwLGk6MTY0NDM2NDgwMCxqOjE2NDY2OTc2MDAsazoxNjQ5MTE2ODAwLGw6MTY1MTUzNjAwMCxtOjE2NTM5NTUyMDAsbjoxNjU2Mzc0NDAwLG86MTY1ODc5MzYwMCxwOjE2NjEyMTI4MDAscToxNjYzNjMyMDAwLHI6MTY2NjA1MTIwMCxjOjE2Njg0NzA0MDAsSDoxNjcwODg5NjAwLHZCOm51bGwsd0I6bnVsbH19LEQ6e0E6e1wiMFwiOjAuMDA0MTQxLFwiMVwiOjAuMDA0MzI2LFwiMlwiOjAuMDA0NyxcIjNcIjowLjAwNDUzOCxcIjRcIjowLjAwODMyMixcIjVcIjowLjAwODU5NixcIjZcIjowLjAwNDU2NixcIjdcIjowLjAwNDExOCxcIjhcIjowLjAwNzU0NixcIjlcIjowLjAwMzkwMSxJOjAuMDA0NzA2LHM6MC4wMDQ4NzksSjowLjAwNDg3OSxEOjAuMDA1NTkxLEU6MC4wMDU1OTEsRjowLjAwNTU5MSxBOjAuMDA0NTM0LEI6MC4wMDQ0NjQsQzowLjAxMDQyNCxLOjAuMDA4MyxMOjAuMDA0NzA2LEc6MC4wMTUwODcsTTowLjAwNDM5MyxOOjAuMDA0MzkzLE86MC4wMDg2NTIsdDowLjAwODMyMix1OjAuMDA0MzkzLHY6MC4wMDQzMTcsdzowLjAwMzkwMSx4OjAuMDA4Nzg2LHk6MC4wMDM5MzksejowLjAwNDQ2MSxBQjowLjAwNDMzNSxCQjowLjAwNDQ2NCxDQjowLjAxNTA5MixEQjowLjAwMzg2NyxFQjowLjAxNTA5MixGQjowLjAwMzc3MyxHQjowLjAwMzk3NCxIQjowLjAwNzU0NixJQjowLjAwNzk0OCxKQjowLjAwMzk3NCxLQjowLjAwMzg2NyxMQjowLjAwNzU0NixNQjowLjAyMjYzOCxOQjowLjA0OTA0OSxPQjowLjAwMzg2NyxQQjowLjAwMzkyOSxRQjowLjAwNzU0NixSQjowLjAxMTMxOSxTQjowLjAwMzg2NyxUQjowLjAwNzU0NixVQjowLjA0NTI3NixWQjowLjAwMzc3MyxXQjowLjAwMzc3MyxzQjowLjAwMzc3MyxYQjowLjAxMTMxOSx0QjowLjAxMTMxOSxZQjowLjAwMzc3MyxaQjowLjAxNTA5MixhQjowLjAwMzc3MyxiQjowLjAxMTMxOSxjQjowLjAzMDE4NCxkQjowLjAwNzU0NixlQjowLjAwNzU0NixmQjowLjA3OTIzMyxnQjowLjAyNjQxMSxoQjowLjAxMTMxOSxkOjAuMDM3NzMsaUI6MC4wMTEzMTksakI6MC4wNDUyNzYsa0I6MC4wNDE1MDMsbEI6MC4wMjY0MTEsbUI6MC4wMTEzMTksbkI6MC4wMzM5NTcsUDowLjEyMDczNixROjAuMDQxNTAzLFI6MC4wNDE1MDMsUzowLjA3NTQ2LFQ6MC4wNDUyNzYsVTowLjA5NDMyNSxWOjAuMDc1NDYsVzowLjA3OTIzMyxYOjAuMDE4ODY1LFk6MC4wMzM5NTcsWjowLjAyNjQxMSxhOjAuMDU2NTk1LGI6MC4wNDE1MDMsZTowLjA0OTA0OSxmOjAuMDMzOTU3LGc6MC4wMjI2MzgsaDowLjA0MTUwMyxpOjAuMDU2NTk1LGo6MC4wOTgwOTgsazowLjA0OTA0OSxsOjAuMDc5MjMzLG06MC4wNjAzNjgsbjowLjA5ODA5OCxvOjAuMjc5MjAyLHA6MC4xMjQ1MDkscTowLjE5MjQyMyxyOjAuMjg2NzQ4LGM6My42NDg0OSxIOjE2LjgzODksdkI6MC4wMzM5NTcsd0I6MC4wMTg4NjUsREM6MC4wMTEzMTl9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJJXCIsXCJzXCIsXCJKXCIsXCJEXCIsXCJFXCIsXCJGXCIsXCJBXCIsXCJCXCIsXCJDXCIsXCJLXCIsXCJMXCIsXCJHXCIsXCJNXCIsXCJOXCIsXCJPXCIsXCJ0XCIsXCJ1XCIsXCJ2XCIsXCJ3XCIsXCJ4XCIsXCJ5XCIsXCJ6XCIsXCIwXCIsXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCJBQlwiLFwiQkJcIixcIkNCXCIsXCJEQlwiLFwiRUJcIixcIkZCXCIsXCJHQlwiLFwiSEJcIixcIklCXCIsXCJKQlwiLFwiS0JcIixcIkxCXCIsXCJNQlwiLFwiTkJcIixcIk9CXCIsXCJQQlwiLFwiUUJcIixcIlJCXCIsXCJTQlwiLFwiVEJcIixcIlVCXCIsXCJWQlwiLFwiV0JcIixcInNCXCIsXCJYQlwiLFwidEJcIixcIllCXCIsXCJaQlwiLFwiYUJcIixcImJCXCIsXCJjQlwiLFwiZEJcIixcImVCXCIsXCJmQlwiLFwiZ0JcIixcImhCXCIsXCJkXCIsXCJpQlwiLFwiakJcIixcImtCXCIsXCJsQlwiLFwibUJcIixcIm5CXCIsXCJQXCIsXCJRXCIsXCJSXCIsXCJTXCIsXCJUXCIsXCJVXCIsXCJWXCIsXCJXXCIsXCJYXCIsXCJZXCIsXCJaXCIsXCJhXCIsXCJiXCIsXCJlXCIsXCJmXCIsXCJnXCIsXCJoXCIsXCJpXCIsXCJqXCIsXCJrXCIsXCJsXCIsXCJtXCIsXCJuXCIsXCJvXCIsXCJwXCIsXCJxXCIsXCJyXCIsXCJjXCIsXCJIXCIsXCJ2QlwiLFwid0JcIixcIkRDXCJdLEU6XCJDaHJvbWVcIixGOntcIjBcIjoxMzYxNDA0ODAwLFwiMVwiOjEzNjQ0Mjg4MDAsXCIyXCI6MTM2OTA5NDQwMCxcIjNcIjoxMzc0MTA1NjAwLFwiNFwiOjEzNzY5NTY4MDAsXCI1XCI6MTM4NDIxNDQwMCxcIjZcIjoxMzg5NjU3NjAwLFwiN1wiOjEzOTI5NDA4MDAsXCI4XCI6MTM5NzAwMTYwMCxcIjlcIjoxNDAwNTQ0MDAwLEk6MTI2NDM3NzYwMCxzOjEyNzQ3NDU2MDAsSjoxMjgzMzg1NjAwLEQ6MTI4NzYxOTIwMCxFOjEyOTEyNDgwMDAsRjoxMjk2Nzc3NjAwLEE6MTI5OTU0MjQwMCxCOjEzMDM4NjI0MDAsQzoxMzA3NDA0ODAwLEs6MTMxMjI0MzIwMCxMOjEzMTYxMzEyMDAsRzoxMzE2MTMxMjAwLE06MTMxOTUwMDgwMCxOOjEzMjM3MzQ0MDAsTzoxMzI4NjU5MjAwLHQ6MTMzMjg5MjgwMCx1OjEzMzcwNDAwMDAsdjoxMzQwNjY4ODAwLHc6MTM0MzY5MjgwMCx4OjEzNDg1MzEyMDAseToxMzUyMjQ2NDAwLHo6MTM1Nzg2MjQwMCxBQjoxNDA1NDY4ODAwLEJCOjE0MDkwMTEyMDAsQ0I6MTQxMjY0MDAwMCxEQjoxNDE2MjY4ODAwLEVCOjE0MjE3OTg0MDAsRkI6MTQyNTUxMzYwMCxHQjoxNDI5NDAxNjAwLEhCOjE0MzIwODAwMDAsSUI6MTQzNzUyMzIwMCxKQjoxNDQxMTUyMDAwLEtCOjE0NDQ3ODA4MDAsTEI6MTQ0OTAxNDQwMCxNQjoxNDUzMjQ4MDAwLE5COjE0NTY5NjMyMDAsT0I6MTQ2MDU5MjAwMCxQQjoxNDY0MTM0NDAwLFFCOjE0NjkwNTkyMDAsUkI6MTQ3MjYwMTYwMCxTQjoxNDc2MjMwNDAwLFRCOjE0ODA1NTA0MDAsVUI6MTQ4NTMwMjQwMCxWQjoxNDg5MDE3NjAwLFdCOjE0OTI1NjAwMDAsc0I6MTQ5NjcwNzIwMCxYQjoxNTAwOTQwODAwLHRCOjE1MDQ1Njk2MDAsWUI6MTUwODE5ODQwMCxaQjoxNTEyNTE4NDAwLGFCOjE1MTY3NTIwMDAsYkI6MTUyMDI5NDQwMCxjQjoxNTIzOTIzMjAwLGRCOjE1Mjc1NTIwMDAsZUI6MTUzMjM5MDQwMCxmQjoxNTM2MDE5MjAwLGdCOjE1Mzk2NDgwMDAsaEI6MTU0Mzk2ODAwMCxkOjE1NDg3MjAwMDAsaUI6MTU1MjM0ODgwMCxqQjoxNTU1OTc3NjAwLGtCOjE1NTk2MDY0MDAsbEI6MTU2NDQ0NDgwMCxtQjoxNTY4MDczNjAwLG5COjE1NzE3MDI0MDAsUDoxNTc1OTM2MDAwLFE6MTU4MDg2MDgwMCxSOjE1ODYzMDQwMDAsUzoxNTg5ODQ2NDAwLFQ6MTU5NDY4NDgwMCxVOjE1OTgzMTM2MDAsVjoxNjAxOTQyNDAwLFc6MTYwNTU3MTIwMCxYOjE2MTEwMTQ0MDAsWToxNjE0NTU2ODAwLFo6MTYxODI3MjAwMCxhOjE2MjE5ODcyMDAsYjoxNjI2NzM5MjAwLGU6MTYzMDM2ODAwMCxmOjE2MzIyNjg4MDAsZzoxNjM0NjAxNjAwLGg6MTYzNzAyMDgwMCxpOjE2NDEzNDA4MDAsajoxNjQzNjczNjAwLGs6MTY0NjA5MjgwMCxsOjE2NDg1MTIwMDAsbToxNjUwOTMxMjAwLG46MTY1MzM1MDQwMCxvOjE2NTU3Njk2MDAscDoxNjU5Mzk4NDAwLHE6MTY2MTgxNzYwMCxyOjE2NjQyMzY4MDAsYzoxNjY2NjU2MDAwLEg6MTY2OTY4MDAwMCx2QjpudWxsLHdCOm51bGwsREM6bnVsbH19LEU6e0E6e0k6MCxzOjAuMDA4MzIyLEo6MC4wMDQ2NTYsRDowLjAwNDQ2NSxFOjAuMDAzOTc0LEY6MC4wMDM5MjksQTowLjAwNDQyNSxCOjAuMDA0MzE4LEM6MC4wMDM4MDEsSzowLjAxODg2NSxMOjAuMDk0MzI1LEc6MC4wMjI2MzgsRUM6MCx4QjowLjAwODY5MixGQzowLjAxMTMxOSxHQzowLjAwNDU2LEhDOjAuMDA0MjgzLElDOjAuMDIyNjM4LHlCOjAuMDA3ODAyLG9COjAuMDA3NTQ2LHBCOjAuMDMzOTU3LHpCOjAuMTg4NjUsSkM6MC4yNTY1NjQsS0M6MC4wNDE1MDMsXCIwQlwiOjAuMDM3NzMsXCIxQlwiOjAuMDk0MzI1LFwiMkJcIjowLjE5MjQyMyxcIjNCXCI6MS4zMTMscUI6MC4xNjIyMzksXCI0QlwiOjAuNjQxNDEsXCI1QlwiOjAuMTQzMzc0LFwiNkJcIjowLExDOjB9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIkVDXCIsXCJ4QlwiLFwiSVwiLFwic1wiLFwiRkNcIixcIkpcIixcIkdDXCIsXCJEXCIsXCJIQ1wiLFwiRVwiLFwiRlwiLFwiSUNcIixcIkFcIixcInlCXCIsXCJCXCIsXCJvQlwiLFwiQ1wiLFwicEJcIixcIktcIixcInpCXCIsXCJMXCIsXCJKQ1wiLFwiR1wiLFwiS0NcIixcIjBCXCIsXCIxQlwiLFwiMkJcIixcIjNCXCIsXCJxQlwiLFwiNEJcIixcIjVCXCIsXCI2QlwiLFwiTENcIixcIlwiXSxFOlwiU2FmYXJpXCIsRjp7RUM6MTIwNTc5ODQwMCx4QjoxMjI2NTM0NDAwLEk6MTI0NDQxOTIwMCxzOjEyNzU4Njg4MDAsRkM6MTMxMTEyMDAwMCxKOjEzNDMxNzQ0MDAsR0M6MTM4MjQwMDAwMCxEOjEzODI0MDAwMDAsSEM6MTQxMDk5ODQwMCxFOjE0MTM0MTc2MDAsRjoxNDQzNjU3NjAwLElDOjE0NTg1MTg0MDAsQToxNDc0MzI5NjAwLHlCOjE0OTA1NzI4MDAsQjoxNTA1Nzc5MjAwLG9COjE1MjIyODE2MDAsQzoxNTM3MTQyNDAwLHBCOjE1NTM0NzIwMDAsSzoxNTY4ODUxMjAwLHpCOjE1ODUwMDgwMDAsTDoxNjAwMjE0NDAwLEpDOjE2MTkzOTUyMDAsRzoxNjMyMDk2MDAwLEtDOjE2MzUyOTI4MDAsXCIwQlwiOjE2MzkzNTM2MDAsXCIxQlwiOjE2NDcyMTYwMDAsXCIyQlwiOjE2NTI3NDU2MDAsXCIzQlwiOjE2NTgyNzUyMDAscUI6MTY2Mjk0MDgwMCxcIjRCXCI6MTY2NjU2OTYwMCxcIjVCXCI6MTY3MDg4OTYwMCxcIjZCXCI6bnVsbCxMQzpudWxsfX0sRjp7QTp7XCIwXCI6MC4wMDU1OTUsXCIxXCI6MC4wMDQzOTMsXCIyXCI6MC4wMDc1NDYsXCIzXCI6MC4wMDQ4NzksXCI0XCI6MC4wMDQ4NzksXCI1XCI6MC4wMDM3NzMsXCI2XCI6MC4wMDUxNTIsXCI3XCI6MC4wMDUwMTQsXCI4XCI6MC4wMDk3NTgsXCI5XCI6MC4wMDQ4NzksRjowLjAwODIsQjowLjAxNjU4MSxDOjAuMDA0MzE3LEc6MC4wMDY4NSxNOjAuMDA2ODUsTjowLjAwNjg1LE86MC4wMDUwMTQsdDowLjAwNjAxNSx1OjAuMDA0ODc5LHY6MC4wMDY1OTcsdzowLjAwNjU5Nyx4OjAuMDEzNDM0LHk6MC4wMDY3MDIsejowLjAwNjAxNSxBQjowLjAwMzc3MyxCQjowLjAwNDI4MyxDQjowLjAwNDM2NyxEQjowLjAwNDUzNCxFQjowLjAwNzU0NixGQjowLjAwNDIyNyxHQjowLjAwNDQxOCxIQjowLjAwNDE2MSxJQjowLjAwNDIyNyxKQjowLjAwNDcyNSxLQjowLjAxNTA5MixMQjowLjAwODk0MixNQjowLjAwNDcwNyxOQjowLjAwNDgyNyxPQjowLjAwNDcwNyxQQjowLjAwNDcwNyxRQjowLjAwNDMyNixSQjowLjAwODkyMixTQjowLjAxNDM0OSxUQjowLjAwNDQyNSxVQjowLjAwNDcyLFZCOjAuMDA0NDI1LFdCOjAuMDA0NDI1LFhCOjAuMDA0NzIsWUI6MC4wMDQ1MzIsWkI6MC4wMDQ1NjYsYUI6MC4wMjI4MyxiQjowLjAwODY3LGNCOjAuMDA0NjU2LGRCOjAuMDA0NjQyLGVCOjAuMDAzOTI5LGZCOjAuMDA5NDQsZ0I6MC4wMDQyOTMsaEI6MC4wMDM5MjksZDowLjAwNDI5OCxpQjowLjA5NjY5MixqQjowLjAwNDIwMSxrQjowLjAwNDE0MSxsQjowLjAwNDI1NyxtQjowLjAwMzkzOSxuQjowLjAwODIzNixQOjAuMDAzODU1LFE6MC4wMDM5MzksUjowLjAwODUxNCx1QjowLjAwMzkzOSxTOjAuMDAzOTM5LFQ6MC4wMDM3MDIsVTowLjAwNzU0NixWOjAuMDAzODU1LFc6MC4wMDM4NTUsWDowLjAwMzkyOSxZOjAuMDA3ODAyLFo6MC4wMTE3MDMsYTowLjAwNzU0NixiOjAuMjA3NTE1LE1DOjAuMDA2ODUsTkM6MCxPQzowLjAwODM5MixQQzowLjAwNDcwNixvQjowLjAwNjIyOSxcIjdCXCI6MC4wMDQ4NzksUUM6MC4wMDg3ODYscEI6MC4wMDQ3Mn0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJGXCIsXCJNQ1wiLFwiTkNcIixcIk9DXCIsXCJQQ1wiLFwiQlwiLFwib0JcIixcIjdCXCIsXCJRQ1wiLFwiQ1wiLFwicEJcIixcIkdcIixcIk1cIixcIk5cIixcIk9cIixcInRcIixcInVcIixcInZcIixcIndcIixcInhcIixcInlcIixcInpcIixcIjBcIixcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIkFCXCIsXCJCQlwiLFwiQ0JcIixcIkRCXCIsXCJFQlwiLFwiRkJcIixcIkdCXCIsXCJIQlwiLFwiSUJcIixcIkpCXCIsXCJLQlwiLFwiTEJcIixcIk1CXCIsXCJOQlwiLFwiT0JcIixcIlBCXCIsXCJRQlwiLFwiUkJcIixcIlNCXCIsXCJUQlwiLFwiVUJcIixcIlZCXCIsXCJXQlwiLFwiWEJcIixcIllCXCIsXCJaQlwiLFwiYUJcIixcImJCXCIsXCJjQlwiLFwiZEJcIixcImVCXCIsXCJmQlwiLFwiZ0JcIixcImhCXCIsXCJkXCIsXCJpQlwiLFwiakJcIixcImtCXCIsXCJsQlwiLFwibUJcIixcIm5CXCIsXCJQXCIsXCJRXCIsXCJSXCIsXCJ1QlwiLFwiU1wiLFwiVFwiLFwiVVwiLFwiVlwiLFwiV1wiLFwiWFwiLFwiWVwiLFwiWlwiLFwiYVwiLFwiYlwiLFwiXCIsXCJcIixcIlwiXSxFOlwiT3BlcmFcIixGOntcIjBcIjoxNDE3MTMyODAwLFwiMVwiOjE0MjIzMTY4MDAsXCIyXCI6MTQyNTk0NTYwMCxcIjNcIjoxNDMwMTc5MjAwLFwiNFwiOjE0MzM4MDgwMDAsXCI1XCI6MTQzODY0NjQwMCxcIjZcIjoxNDQyNDQ4MDAwLFwiN1wiOjE0NDU5MDQwMDAsXCI4XCI6MTQ0OTEwMDgwMCxcIjlcIjoxNDU0MzcxMjAwLEY6MTE1MDc2MTYwMCxNQzoxMjIzNDI0MDAwLE5DOjEyNTE3NjMyMDAsT0M6MTI2NzQ4ODAwMCxQQzoxMjc3OTQyNDAwLEI6MTI5MjQ1NzYwMCxvQjoxMzAyNTY2NDAwLFwiN0JcIjoxMzA5MjE5MjAwLFFDOjEzMjMxMjk2MDAsQzoxMzIzMTI5NjAwLHBCOjEzNTIwNzM2MDAsRzoxMzcyNzIzMjAwLE06MTM3NzU2MTYwMCxOOjEzODExMDQwMDAsTzoxMzg2Mjg4MDAwLHQ6MTM5MDg2NzIwMCx1OjEzOTM4OTEyMDAsdjoxMzk5MzM0NDAwLHc6MTQwMTc1MzYwMCx4OjE0MDU5ODcyMDAseToxNDA5NjE2MDAwLHo6MTQxMzMzMTIwMCxBQjoxNDU3MzA4ODAwLEJCOjE0NjIzMjAwMDAsQ0I6MTQ2NTM0NDAwMCxEQjoxNDcwMDk2MDAwLEVCOjE0NzQzMjk2MDAsRkI6MTQ3NzI2NzIwMCxHQjoxNDgxNTg3MjAwLEhCOjE0ODY0MjU2MDAsSUI6MTQ5MDA1NDQwMCxKQjoxNDk0Mzc0NDAwLEtCOjE0OTgwMDMyMDAsTEI6MTUwMjIzNjgwMCxNQjoxNTA2NDcwNDAwLE5COjE1MTAwOTkyMDAsT0I6MTUxNTAyNDAwMCxQQjoxNTE3OTYxNjAwLFFCOjE1MjE2NzY4MDAsUkI6MTUyNTkxMDQwMCxTQjoxNTMwMTQ0MDAwLFRCOjE1MzQ5ODI0MDAsVUI6MTUzNzgzMzYwMCxWQjoxNTQzMzYzMjAwLFdCOjE1NDgyMDE2MDAsWEI6MTU1NDc2ODAwMCxZQjoxNTYxNTkzNjAwLFpCOjE1NjYyNTkyMDAsYUI6MTU3MDQwNjQwMCxiQjoxNTczNjg5NjAwLGNCOjE1Nzg0NDE2MDAsZEI6MTU4Mzk3MTIwMCxlQjoxNTg3NTEzNjAwLGZCOjE1OTI5NTY4MDAsZ0I6MTU5NTg5NDQwMCxoQjoxNjAwMTI4MDAwLGQ6MTYwMzIzODQwMCxpQjoxNjEzNTIwMDAwLGpCOjE2MTIyMjQwMDAsa0I6MTYxNjU0NDAwMCxsQjoxNjE5NTY4MDAwLG1COjE2MjM3MTUyMDAsbkI6MTYyNzk0ODgwMCxQOjE2MzE1Nzc2MDAsUToxNjMzMzkyMDAwLFI6MTYzNTk4NDAwMCx1QjoxNjM4NDAzMjAwLFM6MTY0MjU1MDQwMCxUOjE2NDQ5Njk2MDAsVToxNjQ3OTkzNjAwLFY6MTY1MDQxMjgwMCxXOjE2NTI3NDU2MDAsWDoxNjU0NjQ2NDAwLFk6MTY1NzE1MjAwMCxaOjE2NjA3ODA4MDAsYToxNjYzMTEzNjAwLGI6MTY2ODgxNjAwMH0sRDp7RjpcIm9cIixCOlwib1wiLEM6XCJvXCIsTUM6XCJvXCIsTkM6XCJvXCIsT0M6XCJvXCIsUEM6XCJvXCIsb0I6XCJvXCIsXCI3QlwiOlwib1wiLFFDOlwib1wiLHBCOlwib1wifX0sRzp7QTp7RTowLHhCOjAsUkM6MCxcIjhCXCI6MC4wMDQ3MDE5NSxTQzowLjAwNDcwMTk1LFRDOjAuMDAzMTM0NjMsVUM6MC4wMTQxMDU4LFZDOjAuMDA2MjY5MjYsV0M6MC4wMTg4MDc4LFhDOjAuMDYxMTI1MyxZQzowLjAwNzgzNjU4LFpDOjAuMTA2NTc3LGFDOjAuMDI4MjExNyxiQzowLjAyNjY0NDQsY0M6MC4wMjUwNzcxLGRDOjAuNDA1OTM1LGVDOjAuMDQyMzE3NSxmQzowLjAxMDk3MTIsZ0M6MC4wMzkxODI5LGhDOjAuMTQxMDU4LGlDOjAuMzQwMTA4LGpDOjAuNjQ3MzAxLGtDOjAuMTg2NTExLFwiMEJcIjowLjIzOTc5OSxcIjFCXCI6MC4zMDQwNTksXCIyQlwiOjAuNTQ2OTkzLFwiM0JcIjoyLjMxNDkzLHFCOjIuMDk4NjQsXCI0QlwiOjYuMzMxOTYsXCI1QlwiOjAuNjk0MzIxLFwiNkJcIjowLjAxNTY3MzJ9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwieEJcIixcIlJDXCIsXCI4QlwiLFwiU0NcIixcIlRDXCIsXCJVQ1wiLFwiRVwiLFwiVkNcIixcIldDXCIsXCJYQ1wiLFwiWUNcIixcIlpDXCIsXCJhQ1wiLFwiYkNcIixcImNDXCIsXCJkQ1wiLFwiZUNcIixcImZDXCIsXCJnQ1wiLFwiaENcIixcImlDXCIsXCJqQ1wiLFwia0NcIixcIjBCXCIsXCIxQlwiLFwiMkJcIixcIjNCXCIsXCJxQlwiLFwiNEJcIixcIjVCXCIsXCI2QlwiLFwiXCIsXCJcIl0sRTpcIlNhZmFyaSBvbiBpT1NcIixGOnt4QjoxMjcwMjUyODAwLFJDOjEyODM5MDQwMDAsXCI4QlwiOjEyOTk2Mjg4MDAsU0M6MTMzMTA3ODQwMCxUQzoxMzU5MzMxMjAwLFVDOjEzOTQ0MDk2MDAsRToxNDEwOTEyMDAwLFZDOjE0MTM3NjMyMDAsV0M6MTQ0MjM2MTYwMCxYQzoxNDU4NTE4NDAwLFlDOjE0NzM3MjQ4MDAsWkM6MTQ5MDU3MjgwMCxhQzoxNTA1Nzc5MjAwLGJDOjE1MjIyODE2MDAsY0M6MTUzNzE0MjQwMCxkQzoxNTUzNDcyMDAwLGVDOjE1Njg4NTEyMDAsZkM6MTU3MjIyMDgwMCxnQzoxNTgwMTY5NjAwLGhDOjE1ODUwMDgwMDAsaUM6MTYwMDIxNDQwMCxqQzoxNjE5Mzk1MjAwLGtDOjE2MzIwOTYwMDAsXCIwQlwiOjE2MzkzNTM2MDAsXCIxQlwiOjE2NDcyMTYwMDAsXCIyQlwiOjE2NTI2NTkyMDAsXCIzQlwiOjE2NTgyNzUyMDAscUI6MTY2Mjk0MDgwMCxcIjRCXCI6MTY2NjU2OTYwMCxcIjVCXCI6MTY3MDg4OTYwMCxcIjZCXCI6bnVsbH19LEg6e0E6e2xDOjAuOTY2OTg4fSxCOlwib1wiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwibENcIixcIlwiLFwiXCIsXCJcIl0sRTpcIk9wZXJhIE1pbmlcIixGOntsQzoxNDI2NDY0MDAwfX0sSTp7QTp7ckI6MCxJOjAuMDMwNjk1MSxIOjAsbUM6MCxuQzowLjAyMDQ2MzQsb0M6MCxwQzowLjAyMDQ2MzQsXCI4QlwiOjAuMDgxODUzNyxxQzowLHJDOjAuNDE5NX0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwibUNcIixcIm5DXCIsXCJvQ1wiLFwickJcIixcIklcIixcInBDXCIsXCI4QlwiLFwicUNcIixcInJDXCIsXCJIXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJBbmRyb2lkIEJyb3dzZXJcIixGOnttQzoxMjU2NTE1MjAwLG5DOjEyNzQzMTM2MDAsb0M6MTI5MTU5MzYwMCxyQjoxMjk4MzMyODAwLEk6MTMxODg5NjAwMCxwQzoxMzQxNzkyMDAwLFwiOEJcIjoxMzc0NjI0MDAwLHFDOjEzODY1NDcyMDAsckM6MTQwMTY2NzIwMCxIOjE2Njk5MzkyMDB9fSxKOntBOntEOjAsQTowfSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiRFwiLFwiQVwiLFwiXCIsXCJcIixcIlwiXSxFOlwiQmxhY2tiZXJyeSBCcm93c2VyXCIsRjp7RDoxMzI1Mzc2MDAwLEE6MTM1OTUwNDAwMH19LEs6e0E6e0E6MCxCOjAsQzowLGQ6MC4wMTExMzkxLG9COjAsXCI3QlwiOjAscEI6MH0sQjpcIm9cIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIkFcIixcIkJcIixcIm9CXCIsXCI3QlwiLFwiQ1wiLFwicEJcIixcImRcIixcIlwiLFwiXCIsXCJcIl0sRTpcIk9wZXJhIE1vYmlsZVwiLEY6e0E6MTI4NzEwMDgwMCxCOjEzMDA3NTIwMDAsb0I6MTMxNDgzNTIwMCxcIjdCXCI6MTMxODI5MTIwMCxDOjEzMzAzMDA4MDAscEI6MTM0OTc0MDgwMCxkOjE2NjY4Mjg4MDB9LEQ6e2Q6XCJ3ZWJraXRcIn19LEw6e0E6e0g6NDEuNTQyNn0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiSFwiLFwiXCIsXCJcIixcIlwiXSxFOlwiQ2hyb21lIGZvciBBbmRyb2lkXCIsRjp7SDoxNjY5OTM5MjAwfX0sTTp7QTp7YzowLjI5MjcxNn0sQjpcIm1velwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiY1wiLFwiXCIsXCJcIixcIlwiXSxFOlwiRmlyZWZveCBmb3IgQW5kcm9pZFwiLEY6e2M6MTY2ODQ3MDQwMH19LE46e0E6e0E6MC4wMTE1OTM0LEI6MC4wMjI2NjR9LEI6XCJtc1wiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIkFcIixcIkJcIixcIlwiLFwiXCIsXCJcIl0sRTpcIklFIE1vYmlsZVwiLEY6e0E6MTM0MDE1MDQwMCxCOjEzNTM0NTYwMDB9fSxPOntBOntzQzoxLjc1MDA3fSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJzQ1wiLFwiXCIsXCJcIixcIlwiXSxFOlwiVUMgQnJvd3NlciBmb3IgQW5kcm9pZFwiLEY6e3NDOjE2MzQ2ODgwMDB9LEQ6e3NDOlwid2Via2l0XCJ9fSxQOntBOntJOjAuMTY2NDA5LHRDOjAuMDEwMzU0Myx1QzowLjAxMDMwNCx2QzowLjA1MjAwMjgsd0M6MC4wMTAzNTg0LHhDOjAuMDEwNDQ0Myx5QjowLjAxMDUwNDMseUM6MC4wMzEyMDE3LHpDOjAuMDEwNDAwNixcIjBDXCI6MC4wNTIwMDI4LFwiMUNcIjowLjA2MjQwMzMsXCIyQ1wiOjAuMDMxMjAxNyxxQjowLjExNDQwNixcIjNDXCI6MC4xMjQ4MDcsXCI0Q1wiOjAuMjQ5NjEzLFwiNUNcIjoyLjI1NjkyfSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJJXCIsXCJ0Q1wiLFwidUNcIixcInZDXCIsXCJ3Q1wiLFwieENcIixcInlCXCIsXCJ5Q1wiLFwiekNcIixcIjBDXCIsXCIxQ1wiLFwiMkNcIixcInFCXCIsXCIzQ1wiLFwiNENcIixcIjVDXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJTYW1zdW5nIEludGVybmV0XCIsRjp7SToxNDYxMDI0MDAwLHRDOjE0ODE4NDY0MDAsdUM6MTUwOTQwODAwMCx2QzoxNTI4MzI5NjAwLHdDOjE1NDYxMjgwMDAseEM6MTU1NDE2MzIwMCx5QjoxNTY3OTAwODAwLHlDOjE1ODI1ODg4MDAsekM6MTU5MzQ3NTIwMCxcIjBDXCI6MTYwNTY1NzYwMCxcIjFDXCI6MTYxODUzMTIwMCxcIjJDXCI6MTYyOTA3MjAwMCxxQjoxNjQwNzM2MDAwLFwiM0NcIjoxNjUxNzA4ODAwLFwiNENcIjoxNjU5NjU3NjAwLFwiNUNcIjoxNjY3MjYwODAwfX0sUTp7QTp7ekI6MC4xOTkyOTZ9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcInpCXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJRUSBCcm93c2VyXCIsRjp7ekI6MTY2MzcxODQwMH19LFI6e0E6e1wiNkNcIjowfSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCI2Q1wiLFwiXCIsXCJcIixcIlwiXSxFOlwiQmFpZHUgQnJvd3NlclwiLEY6e1wiNkNcIjoxNjYzMDI3MjAwfX0sUzp7QTp7XCI3Q1wiOjAuMDY4NTA4fSxCOlwibW96XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCI3Q1wiLFwiXCIsXCJcIixcIlwiXSxFOlwiS2FpT1MgQnJvd3NlclwiLEY6e1wiN0NcIjoxNTI3ODExMjAwfX19O1xuIiwibW9kdWxlLmV4cG9ydHM9e1wiMFwiOlwiMjZcIixcIjFcIjpcIjI3XCIsXCIyXCI6XCIyOFwiLFwiM1wiOlwiMjlcIixcIjRcIjpcIjMwXCIsXCI1XCI6XCIzMVwiLFwiNlwiOlwiMzJcIixcIjdcIjpcIjMzXCIsXCI4XCI6XCIzNFwiLFwiOVwiOlwiMzVcIixBOlwiMTBcIixCOlwiMTFcIixDOlwiMTJcIixEOlwiN1wiLEU6XCI4XCIsRjpcIjlcIixHOlwiMTVcIixIOlwiMTA4XCIsSTpcIjRcIixKOlwiNlwiLEs6XCIxM1wiLEw6XCIxNFwiLE06XCIxNlwiLE46XCIxN1wiLE86XCIxOFwiLFA6XCI3OVwiLFE6XCI4MFwiLFI6XCI4MVwiLFM6XCI4M1wiLFQ6XCI4NFwiLFU6XCI4NVwiLFY6XCI4NlwiLFc6XCI4N1wiLFg6XCI4OFwiLFk6XCI4OVwiLFo6XCI5MFwiLGE6XCI5MVwiLGI6XCI5MlwiLGM6XCIxMDdcIixkOlwiNzJcIixlOlwiOTNcIixmOlwiOTRcIixnOlwiOTVcIixoOlwiOTZcIixpOlwiOTdcIixqOlwiOThcIixrOlwiOTlcIixsOlwiMTAwXCIsbTpcIjEwMVwiLG46XCIxMDJcIixvOlwiMTAzXCIscDpcIjEwNFwiLHE6XCIxMDVcIixyOlwiMTA2XCIsczpcIjVcIix0OlwiMTlcIix1OlwiMjBcIix2OlwiMjFcIix3OlwiMjJcIix4OlwiMjNcIix5OlwiMjRcIix6OlwiMjVcIixBQjpcIjM2XCIsQkI6XCIzN1wiLENCOlwiMzhcIixEQjpcIjM5XCIsRUI6XCI0MFwiLEZCOlwiNDFcIixHQjpcIjQyXCIsSEI6XCI0M1wiLElCOlwiNDRcIixKQjpcIjQ1XCIsS0I6XCI0NlwiLExCOlwiNDdcIixNQjpcIjQ4XCIsTkI6XCI0OVwiLE9COlwiNTBcIixQQjpcIjUxXCIsUUI6XCI1MlwiLFJCOlwiNTNcIixTQjpcIjU0XCIsVEI6XCI1NVwiLFVCOlwiNTZcIixWQjpcIjU3XCIsV0I6XCI1OFwiLFhCOlwiNjBcIixZQjpcIjYyXCIsWkI6XCI2M1wiLGFCOlwiNjRcIixiQjpcIjY1XCIsY0I6XCI2NlwiLGRCOlwiNjdcIixlQjpcIjY4XCIsZkI6XCI2OVwiLGdCOlwiNzBcIixoQjpcIjcxXCIsaUI6XCI3M1wiLGpCOlwiNzRcIixrQjpcIjc1XCIsbEI6XCI3NlwiLG1COlwiNzdcIixuQjpcIjc4XCIsb0I6XCIxMS4xXCIscEI6XCIxMi4xXCIscUI6XCIxNi4wXCIsckI6XCIzXCIsc0I6XCI1OVwiLHRCOlwiNjFcIix1QjpcIjgyXCIsdkI6XCIxMDlcIix3QjpcIjExMFwiLHhCOlwiMy4yXCIseUI6XCIxMC4xXCIsekI6XCIxMy4xXCIsXCIwQlwiOlwiMTUuMi0xNS4zXCIsXCIxQlwiOlwiMTUuNFwiLFwiMkJcIjpcIjE1LjVcIixcIjNCXCI6XCIxNS42XCIsXCI0QlwiOlwiMTYuMVwiLFwiNUJcIjpcIjE2LjJcIixcIjZCXCI6XCIxNi4zXCIsXCI3QlwiOlwiMTEuNVwiLFwiOEJcIjpcIjQuMi00LjNcIixcIjlCXCI6XCI1LjVcIixBQzpcIjJcIixCQzpcIjMuNVwiLENDOlwiMy42XCIsREM6XCIxMTFcIixFQzpcIjMuMVwiLEZDOlwiNS4xXCIsR0M6XCI2LjFcIixIQzpcIjcuMVwiLElDOlwiOS4xXCIsSkM6XCIxNC4xXCIsS0M6XCIxNS4xXCIsTEM6XCJUUFwiLE1DOlwiOS41LTkuNlwiLE5DOlwiMTAuMC0xMC4xXCIsT0M6XCIxMC41XCIsUEM6XCIxMC42XCIsUUM6XCIxMS42XCIsUkM6XCI0LjAtNC4xXCIsU0M6XCI1LjAtNS4xXCIsVEM6XCI2LjAtNi4xXCIsVUM6XCI3LjAtNy4xXCIsVkM6XCI4LjEtOC40XCIsV0M6XCI5LjAtOS4yXCIsWEM6XCI5LjNcIixZQzpcIjEwLjAtMTAuMlwiLFpDOlwiMTAuM1wiLGFDOlwiMTEuMC0xMS4yXCIsYkM6XCIxMS4zLTExLjRcIixjQzpcIjEyLjAtMTIuMVwiLGRDOlwiMTIuMi0xMi41XCIsZUM6XCIxMy4wLTEzLjFcIixmQzpcIjEzLjJcIixnQzpcIjEzLjNcIixoQzpcIjEzLjQtMTMuN1wiLGlDOlwiMTQuMC0xNC40XCIsakM6XCIxNC41LTE0LjhcIixrQzpcIjE1LjAtMTUuMVwiLGxDOlwiYWxsXCIsbUM6XCIyLjFcIixuQzpcIjIuMlwiLG9DOlwiMi4zXCIscEM6XCI0LjFcIixxQzpcIjQuNFwiLHJDOlwiNC40LjMtNC40LjRcIixzQzpcIjEzLjRcIix0QzpcIjUuMC01LjRcIix1QzpcIjYuMi02LjRcIix2QzpcIjcuMi03LjRcIix3QzpcIjguMlwiLHhDOlwiOS4yXCIseUM6XCIxMS4xLTExLjJcIix6QzpcIjEyLjBcIixcIjBDXCI6XCIxMy4wXCIsXCIxQ1wiOlwiMTQuMFwiLFwiMkNcIjpcIjE1LjBcIixcIjNDXCI6XCIxNy4wXCIsXCI0Q1wiOlwiMTguMFwiLFwiNUNcIjpcIjE5LjBcIixcIjZDXCI6XCIxMy4xOFwiLFwiN0NcIjpcIjIuNVwifTtcbiIsIm1vZHVsZS5leHBvcnRzPXtBOlwiaWVcIixCOlwiZWRnZVwiLEM6XCJmaXJlZm94XCIsRDpcImNocm9tZVwiLEU6XCJzYWZhcmlcIixGOlwib3BlcmFcIixHOlwiaW9zX3NhZlwiLEg6XCJvcF9taW5pXCIsSTpcImFuZHJvaWRcIixKOlwiYmJcIixLOlwib3BfbW9iXCIsTDpcImFuZF9jaHJcIixNOlwiYW5kX2ZmXCIsTjpcImllX21vYlwiLE86XCJhbmRfdWNcIixQOlwic2Ftc3VuZ1wiLFE6XCJhbmRfcXFcIixSOlwiYmFpZHVcIixTOlwia2Fpb3NcIn07XG4iLCIndXNlIHN0cmljdCdcblxuY29uc3QgYnJvd3NlcnMgPSByZXF1aXJlKCcuL2Jyb3dzZXJzJykuYnJvd3NlcnNcbmNvbnN0IHZlcnNpb25zID0gcmVxdWlyZSgnLi9icm93c2VyVmVyc2lvbnMnKS5icm93c2VyVmVyc2lvbnNcbmNvbnN0IGFnZW50c0RhdGEgPSByZXF1aXJlKCcuLi8uLi9kYXRhL2FnZW50cycpXG5cbmZ1bmN0aW9uIHVucGFja0Jyb3dzZXJWZXJzaW9ucyh2ZXJzaW9uc0RhdGEpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKHZlcnNpb25zRGF0YSkucmVkdWNlKCh1c2FnZSwgdmVyc2lvbikgPT4ge1xuICAgIHVzYWdlW3ZlcnNpb25zW3ZlcnNpb25dXSA9IHZlcnNpb25zRGF0YVt2ZXJzaW9uXVxuICAgIHJldHVybiB1c2FnZVxuICB9LCB7fSlcbn1cblxubW9kdWxlLmV4cG9ydHMuYWdlbnRzID0gT2JqZWN0LmtleXMoYWdlbnRzRGF0YSkucmVkdWNlKChtYXAsIGtleSkgPT4ge1xuICBsZXQgdmVyc2lvbnNEYXRhID0gYWdlbnRzRGF0YVtrZXldXG4gIG1hcFticm93c2Vyc1trZXldXSA9IE9iamVjdC5rZXlzKHZlcnNpb25zRGF0YSkucmVkdWNlKChkYXRhLCBlbnRyeSkgPT4ge1xuICAgIGlmIChlbnRyeSA9PT0gJ0EnKSB7XG4gICAgICBkYXRhLnVzYWdlX2dsb2JhbCA9IHVucGFja0Jyb3dzZXJWZXJzaW9ucyh2ZXJzaW9uc0RhdGFbZW50cnldKVxuICAgIH0gZWxzZSBpZiAoZW50cnkgPT09ICdDJykge1xuICAgICAgZGF0YS52ZXJzaW9ucyA9IHZlcnNpb25zRGF0YVtlbnRyeV0ucmVkdWNlKChsaXN0LCB2ZXJzaW9uKSA9PiB7XG4gICAgICAgIGlmICh2ZXJzaW9uID09PSAnJykge1xuICAgICAgICAgIGxpc3QucHVzaChudWxsKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxpc3QucHVzaCh2ZXJzaW9uc1t2ZXJzaW9uXSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdFxuICAgICAgfSwgW10pXG4gICAgfSBlbHNlIGlmIChlbnRyeSA9PT0gJ0QnKSB7XG4gICAgICBkYXRhLnByZWZpeF9leGNlcHRpb25zID0gdW5wYWNrQnJvd3NlclZlcnNpb25zKHZlcnNpb25zRGF0YVtlbnRyeV0pXG4gICAgfSBlbHNlIGlmIChlbnRyeSA9PT0gJ0UnKSB7XG4gICAgICBkYXRhLmJyb3dzZXIgPSB2ZXJzaW9uc0RhdGFbZW50cnldXG4gICAgfSBlbHNlIGlmIChlbnRyeSA9PT0gJ0YnKSB7XG4gICAgICBkYXRhLnJlbGVhc2VfZGF0ZSA9IE9iamVjdC5rZXlzKHZlcnNpb25zRGF0YVtlbnRyeV0pLnJlZHVjZShcbiAgICAgICAgKG1hcDIsIGtleTIpID0+IHtcbiAgICAgICAgICBtYXAyW3ZlcnNpb25zW2tleTJdXSA9IHZlcnNpb25zRGF0YVtlbnRyeV1ba2V5Ml1cbiAgICAgICAgICByZXR1cm4gbWFwMlxuICAgICAgICB9LFxuICAgICAgICB7fVxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBlbnRyeSBpcyBCXG4gICAgICBkYXRhLnByZWZpeCA9IHZlcnNpb25zRGF0YVtlbnRyeV1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGFcbiAgfSwge30pXG4gIHJldHVybiBtYXBcbn0sIHt9KVxuIiwibW9kdWxlLmV4cG9ydHMuYnJvd3NlclZlcnNpb25zID0gcmVxdWlyZSgnLi4vLi4vZGF0YS9icm93c2VyVmVyc2lvbnMnKVxuIiwibW9kdWxlLmV4cG9ydHMuYnJvd3NlcnMgPSByZXF1aXJlKCcuLi8uLi9kYXRhL2Jyb3dzZXJzJylcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIFwiLmdsb3cge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7XFxuICBib3JkZXItc3R5bGU6IHNvbGlkO1xcbiAgYm9yZGVyLWNvbG9yOiBncmVlbjtcXG4gIGJvcmRlci13aWR0aDogNXB4O1xcbiAgXFxuICBib3gtc2hhZG93OiAwIDAgNDBweCBibGFjaztcXG59XFxuXFxuLm5hdkJ1dHRvbiB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBncmVlbjtcXG4gIGNvbG9yOiBibGFjaztcXG5cXG4gIG91dGxpbmUtc3R5bGU6IHNvbGlkO1xcbiAgb3V0bGluZS13aWR0aDogMnB4O1xcbiAgYm9yZGVyLXJhZGl1czogNXB4O1xcbiAgYm9yZGVyLXdpZHRoOiAwcHg7XFxuXFxuICBmb250LXNpemU6IHgtbGFyZ2U7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG4gIHBhZGRpbmc6IDVweDtcXG59XFxuXFxuLmZvb3RlciB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XFxuICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgZ2FwOiAxMHB4O1xcbiAgcGFkZGluZzogMTBweDtcXG4gIHdpZHRoOiA5MDBweDtcXG59XCIsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL2dsb2JhbC5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSx1QkFBdUI7RUFDdkIsbUJBQW1CO0VBQ25CLG1CQUFtQjtFQUNuQixpQkFBaUI7O0VBRWpCLDBCQUEwQjtBQUM1Qjs7QUFFQTtFQUNFLHVCQUF1QjtFQUN2QixZQUFZOztFQUVaLG9CQUFvQjtFQUNwQixrQkFBa0I7RUFDbEIsa0JBQWtCO0VBQ2xCLGlCQUFpQjs7RUFFakIsa0JBQWtCO0VBQ2xCLGlCQUFpQjtFQUNqQixZQUFZO0FBQ2Q7O0FBRUE7RUFDRSxhQUFhO0VBQ2IsdUJBQXVCO0VBQ3ZCLG1CQUFtQjtFQUNuQixTQUFTO0VBQ1QsYUFBYTtFQUNiLFlBQVk7QUFDZFwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIuZ2xvdyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjaztcXG4gIGJvcmRlci1zdHlsZTogc29saWQ7XFxuICBib3JkZXItY29sb3I6IGdyZWVuO1xcbiAgYm9yZGVyLXdpZHRoOiA1cHg7XFxuICBcXG4gIGJveC1zaGFkb3c6IDAgMCA0MHB4IGJsYWNrO1xcbn1cXG5cXG4ubmF2QnV0dG9uIHtcXG4gIGJhY2tncm91bmQtY29sb3I6IGdyZWVuO1xcbiAgY29sb3I6IGJsYWNrO1xcblxcbiAgb3V0bGluZS1zdHlsZTogc29saWQ7XFxuICBvdXRsaW5lLXdpZHRoOiAycHg7XFxuICBib3JkZXItcmFkaXVzOiA1cHg7XFxuICBib3JkZXItd2lkdGg6IDBweDtcXG5cXG4gIGZvbnQtc2l6ZTogeC1sYXJnZTtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgcGFkZGluZzogNXB4O1xcbn1cXG5cXG4uZm9vdGVyIHtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcXG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuICBnYXA6IDEwcHg7XFxuICBwYWRkaW5nOiAxMHB4O1xcbiAgd2lkdGg6IDkwMHB4O1xcbn1cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9HRVRfVVJMX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2dldFVybC5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfVVJMX0lNUE9SVF8wX19fID0gbmV3IFVSTChcImltZ3Mvbm9vZGxlc3R2LnBuZ1wiLCBpbXBvcnQubWV0YS51cmwpO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xudmFyIF9fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzBfX18gPSBfX19DU1NfTE9BREVSX0dFVF9VUkxfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfVVJMX0lNUE9SVF8wX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBcIi5oZWFkZXIge1xcbiAgICBiYWNrZ3JvdW5kLWltYWdlOiB1cmwoXCIgKyBfX19DU1NfTE9BREVSX1VSTF9SRVBMQUNFTUVOVF8wX19fICsgXCIpO1xcbiAgICBiYWNrZ3JvdW5kLXNpemU6IGNvdmVyO1xcbiAgICBiYWNrZ3JvdW5kLXJlcGVhdDogbm8tcmVwZWF0O1xcbiAgICBiYWNrZ3JvdW5kLXBvc2l0aW9uOiBjZW50ZXI7XFxuXFxuICAgIHdpZHRoOiA5MDBweDtcXG4gICAgaGVpZ2h0OiA2MDBweDtcXG5cXG4gICAgZGlzcGxheTppbmxpbmUtYmxvY2s7XFxufVxcblxcbi5vcGFxdWV7XFxuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC41KTtcXG4gICAgZm9udC1zaXplOiB4eC1sYXJnZTtcXG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgICBjb2xvcjogd2hpdGU7XFxuICAgIG1hcmdpbi10b3A6IDI1MHB4O1xcbn1cXG5cXG4ubmF2QmFyIHtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xcblxcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjaztcXG4gICAgcGFkZGluZzogNXB4IDEwcHg7XFxufVxcblxcbi50aXRsZUltZ3tcXG4gICAgd2lkdGg6IDE1MHB4O1xcbiAgICBoZWlnaHQ6IDUwcHg7XFxufVxcblxcbi5tYXAge1xcbiAgICB3aWR0aDogOTAwcHg7XFxufVxcblxcbi5zdG9yZUhvdXJze1xcbiAgICB3aWR0aDogOTAwcHg7XFxuICAgIGRpc3BsYXk6IGZsZXg7XFxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuICAgIHBhZGRpbmc6IDVweCAxMHB4O1xcbiAgICBmb250LXNpemU6IHgtbGFyZ2U7XFxufVxcblxcbi5zdG9yZUhvdXJzIHRhYmxlIHtcXG4gICAgZmxleDogMTtcXG59XFxuXFxuLnN0b3JlSG91cnMgdGFibGUgdHIge1xcbiAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XFxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxufVxcblxcbi5zdG9yZUhvdXJzIHRhYmxlIHRoIHtcXG4gICAgcGFkZGluZzogNXB4O1xcbiAgICB0ZXh0LWFsaWduOiBsZWZ0O1xcbn1cXG5cXG4uaW5mb3JtYXRpb24ge1xcbiAgICBwYWRkaW5nOiAyNXB4O1xcbiAgICBmb250LXNpemU6IGxhcmdlO1xcbn1cIiwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvaW5pdGlhbFBhZ2UuY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0lBQ0kseURBQTJDO0lBQzNDLHNCQUFzQjtJQUN0Qiw0QkFBNEI7SUFDNUIsMkJBQTJCOztJQUUzQixZQUFZO0lBQ1osYUFBYTs7SUFFYixvQkFBb0I7QUFDeEI7O0FBRUE7SUFDSSxvQ0FBb0M7SUFDcEMsbUJBQW1CO0lBQ25CLGtCQUFrQjtJQUNsQixZQUFZO0lBQ1osaUJBQWlCO0FBQ3JCOztBQUVBO0lBQ0ksYUFBYTtJQUNiLDhCQUE4QjtJQUM5QixtQkFBbUI7O0lBRW5CLHVCQUF1QjtJQUN2QixpQkFBaUI7QUFDckI7O0FBRUE7SUFDSSxZQUFZO0lBQ1osWUFBWTtBQUNoQjs7QUFFQTtJQUNJLFlBQVk7QUFDaEI7O0FBRUE7SUFDSSxZQUFZO0lBQ1osYUFBYTtJQUNiLG1CQUFtQjtJQUNuQixpQkFBaUI7SUFDakIsa0JBQWtCO0FBQ3RCOztBQUVBO0lBQ0ksT0FBTztBQUNYOztBQUVBO0lBQ0ksYUFBYTtJQUNiLDhCQUE4QjtJQUM5QixtQkFBbUI7QUFDdkI7O0FBRUE7SUFDSSxZQUFZO0lBQ1osZ0JBQWdCO0FBQ3BCOztBQUVBO0lBQ0ksYUFBYTtJQUNiLGdCQUFnQjtBQUNwQlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIuaGVhZGVyIHtcXG4gICAgYmFja2dyb3VuZC1pbWFnZTogdXJsKCdpbWdzL25vb2RsZXN0di5wbmcnKTtcXG4gICAgYmFja2dyb3VuZC1zaXplOiBjb3ZlcjtcXG4gICAgYmFja2dyb3VuZC1yZXBlYXQ6IG5vLXJlcGVhdDtcXG4gICAgYmFja2dyb3VuZC1wb3NpdGlvbjogY2VudGVyO1xcblxcbiAgICB3aWR0aDogOTAwcHg7XFxuICAgIGhlaWdodDogNjAwcHg7XFxuXFxuICAgIGRpc3BsYXk6aW5saW5lLWJsb2NrO1xcbn1cXG5cXG4ub3BhcXVle1xcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuNSk7XFxuICAgIGZvbnQtc2l6ZTogeHgtbGFyZ2U7XFxuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gICAgY29sb3I6IHdoaXRlO1xcbiAgICBtYXJnaW4tdG9wOiAyNTBweDtcXG59XFxuXFxuLm5hdkJhciB7XFxuICAgIGRpc3BsYXk6IGZsZXg7XFxuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG5cXG4gICAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7XFxuICAgIHBhZGRpbmc6IDVweCAxMHB4O1xcbn1cXG5cXG4udGl0bGVJbWd7XFxuICAgIHdpZHRoOiAxNTBweDtcXG4gICAgaGVpZ2h0OiA1MHB4O1xcbn1cXG5cXG4ubWFwIHtcXG4gICAgd2lkdGg6IDkwMHB4O1xcbn1cXG5cXG4uc3RvcmVIb3Vyc3tcXG4gICAgd2lkdGg6IDkwMHB4O1xcbiAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgICBwYWRkaW5nOiA1cHggMTBweDtcXG4gICAgZm9udC1zaXplOiB4LWxhcmdlO1xcbn1cXG5cXG4uc3RvcmVIb3VycyB0YWJsZSB7XFxuICAgIGZsZXg6IDE7XFxufVxcblxcbi5zdG9yZUhvdXJzIHRhYmxlIHRyIHtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xcbn1cXG5cXG4uc3RvcmVIb3VycyB0YWJsZSB0aCB7XFxuICAgIHBhZGRpbmc6IDVweDtcXG4gICAgdGV4dC1hbGlnbjogbGVmdDtcXG59XFxuXFxuLmluZm9ybWF0aW9uIHtcXG4gICAgcGFkZGluZzogMjVweDtcXG4gICAgZm9udC1zaXplOiBsYXJnZTtcXG59XCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIFwiLm1lbnVDb250YWluZXIge1xcbiAgd2lkdGg6IDkwMHB4O1xcbn1cXG5cXG4ubWVudSB7XFxuICB3aWR0aDogMTAwJTtcXG4gIGhlaWdodDogNzUwcHg7XFxuICBmb250LXNpemU6IHgtbGFyZ2U7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxufVxcblxcbi5tZW51ICAqe1xcbiAgb3V0bGluZS1zdHlsZTogc29saWQ7XFxuICBvdXRsaW5lLWNvbG9yOiBncmVlbjtcXG59XFxuXFxuLm1lbnUgY2FwdGlvbiB7XFxuICBmb250LXNpemU6IHh4LWxhcmdlO1xcbn1cXG5cIiwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvbWVudS5jc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSxZQUFZO0FBQ2Q7O0FBRUE7RUFDRSxXQUFXO0VBQ1gsYUFBYTtFQUNiLGtCQUFrQjtFQUNsQixrQkFBa0I7QUFDcEI7O0FBRUE7RUFDRSxvQkFBb0I7RUFDcEIsb0JBQW9CO0FBQ3RCOztBQUVBO0VBQ0UsbUJBQW1CO0FBQ3JCXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIi5tZW51Q29udGFpbmVyIHtcXG4gIHdpZHRoOiA5MDBweDtcXG59XFxuXFxuLm1lbnUge1xcbiAgd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IDc1MHB4O1xcbiAgZm9udC1zaXplOiB4LWxhcmdlO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbn1cXG5cXG4ubWVudSAgKntcXG4gIG91dGxpbmUtc3R5bGU6IHNvbGlkO1xcbiAgb3V0bGluZS1jb2xvcjogZ3JlZW47XFxufVxcblxcbi5tZW51IGNhcHRpb24ge1xcbiAgZm9udC1zaXplOiB4eC1sYXJnZTtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICBNSVQgTGljZW5zZSBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuICBBdXRob3IgVG9iaWFzIEtvcHBlcnMgQHNva3JhXG4qL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3NzV2l0aE1hcHBpbmdUb1N0cmluZykge1xuICB2YXIgbGlzdCA9IFtdO1xuXG4gIC8vIHJldHVybiB0aGUgbGlzdCBvZiBtb2R1bGVzIGFzIGNzcyBzdHJpbmdcbiAgbGlzdC50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgdmFyIGNvbnRlbnQgPSBcIlwiO1xuICAgICAgdmFyIG5lZWRMYXllciA9IHR5cGVvZiBpdGVtWzVdICE9PSBcInVuZGVmaW5lZFwiO1xuICAgICAgaWYgKGl0ZW1bNF0pIHtcbiAgICAgICAgY29udGVudCArPSBcIkBzdXBwb3J0cyAoXCIuY29uY2F0KGl0ZW1bNF0sIFwiKSB7XCIpO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW1bMl0pIHtcbiAgICAgICAgY29udGVudCArPSBcIkBtZWRpYSBcIi5jb25jYXQoaXRlbVsyXSwgXCIge1wiKTtcbiAgICAgIH1cbiAgICAgIGlmIChuZWVkTGF5ZXIpIHtcbiAgICAgICAgY29udGVudCArPSBcIkBsYXllclwiLmNvbmNhdChpdGVtWzVdLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQoaXRlbVs1XSkgOiBcIlwiLCBcIiB7XCIpO1xuICAgICAgfVxuICAgICAgY29udGVudCArPSBjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKGl0ZW0pO1xuICAgICAgaWYgKG5lZWRMYXllcikge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW1bMl0pIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtWzRdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJ9XCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29udGVudDtcbiAgICB9KS5qb2luKFwiXCIpO1xuICB9O1xuXG4gIC8vIGltcG9ydCBhIGxpc3Qgb2YgbW9kdWxlcyBpbnRvIHRoZSBsaXN0XG4gIGxpc3QuaSA9IGZ1bmN0aW9uIGkobW9kdWxlcywgbWVkaWEsIGRlZHVwZSwgc3VwcG9ydHMsIGxheWVyKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGVzID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBtb2R1bGVzID0gW1tudWxsLCBtb2R1bGVzLCB1bmRlZmluZWRdXTtcbiAgICB9XG4gICAgdmFyIGFscmVhZHlJbXBvcnRlZE1vZHVsZXMgPSB7fTtcbiAgICBpZiAoZGVkdXBlKSB7XG4gICAgICBmb3IgKHZhciBrID0gMDsgayA8IHRoaXMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgdmFyIGlkID0gdGhpc1trXVswXTtcbiAgICAgICAgaWYgKGlkICE9IG51bGwpIHtcbiAgICAgICAgICBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2lkXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgX2sgPSAwOyBfayA8IG1vZHVsZXMubGVuZ3RoOyBfaysrKSB7XG4gICAgICB2YXIgaXRlbSA9IFtdLmNvbmNhdChtb2R1bGVzW19rXSk7XG4gICAgICBpZiAoZGVkdXBlICYmIGFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaXRlbVswXV0pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGxheWVyICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaXRlbVs1XSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgIGl0ZW1bNV0gPSBsYXllcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtWzFdID0gXCJAbGF5ZXJcIi5jb25jYXQoaXRlbVs1XS5sZW5ndGggPiAwID8gXCIgXCIuY29uY2F0KGl0ZW1bNV0pIDogXCJcIiwgXCIge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bNV0gPSBsYXllcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG1lZGlhKSB7XG4gICAgICAgIGlmICghaXRlbVsyXSkge1xuICAgICAgICAgIGl0ZW1bMl0gPSBtZWRpYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtWzFdID0gXCJAbWVkaWEgXCIuY29uY2F0KGl0ZW1bMl0sIFwiIHtcIikuY29uY2F0KGl0ZW1bMV0sIFwifVwiKTtcbiAgICAgICAgICBpdGVtWzJdID0gbWVkaWE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzdXBwb3J0cykge1xuICAgICAgICBpZiAoIWl0ZW1bNF0pIHtcbiAgICAgICAgICBpdGVtWzRdID0gXCJcIi5jb25jYXQoc3VwcG9ydHMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBzdXBwb3J0cyAoXCIuY29uY2F0KGl0ZW1bNF0sIFwiKSB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVs0XSA9IHN1cHBvcnRzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBsaXN0LnB1c2goaXRlbSk7XG4gICAgfVxuICB9O1xuICByZXR1cm4gbGlzdDtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cbiAgaWYgKCF1cmwpIHtcbiAgICByZXR1cm4gdXJsO1xuICB9XG4gIHVybCA9IFN0cmluZyh1cmwuX19lc01vZHVsZSA/IHVybC5kZWZhdWx0IDogdXJsKTtcblxuICAvLyBJZiB1cmwgaXMgYWxyZWFkeSB3cmFwcGVkIGluIHF1b3RlcywgcmVtb3ZlIHRoZW1cbiAgaWYgKC9eWydcIl0uKlsnXCJdJC8udGVzdCh1cmwpKSB7XG4gICAgdXJsID0gdXJsLnNsaWNlKDEsIC0xKTtcbiAgfVxuICBpZiAob3B0aW9ucy5oYXNoKSB7XG4gICAgdXJsICs9IG9wdGlvbnMuaGFzaDtcbiAgfVxuXG4gIC8vIFNob3VsZCB1cmwgYmUgd3JhcHBlZD9cbiAgLy8gU2VlIGh0dHBzOi8vZHJhZnRzLmNzc3dnLm9yZy9jc3MtdmFsdWVzLTMvI3VybHNcbiAgaWYgKC9bXCInKCkgXFx0XFxuXXwoJTIwKS8udGVzdCh1cmwpIHx8IG9wdGlvbnMubmVlZFF1b3Rlcykge1xuICAgIHJldHVybiBcIlxcXCJcIi5jb25jYXQodXJsLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKS5yZXBsYWNlKC9cXG4vZywgXCJcXFxcblwiKSwgXCJcXFwiXCIpO1xuICB9XG4gIHJldHVybiB1cmw7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gIHZhciBjb250ZW50ID0gaXRlbVsxXTtcbiAgdmFyIGNzc01hcHBpbmcgPSBpdGVtWzNdO1xuICBpZiAoIWNzc01hcHBpbmcpIHtcbiAgICByZXR1cm4gY29udGVudDtcbiAgfVxuICBpZiAodHlwZW9mIGJ0b2EgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHZhciBiYXNlNjQgPSBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShjc3NNYXBwaW5nKSkpKTtcbiAgICB2YXIgZGF0YSA9IFwic291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsXCIuY29uY2F0KGJhc2U2NCk7XG4gICAgdmFyIHNvdXJjZU1hcHBpbmcgPSBcIi8qIyBcIi5jb25jYXQoZGF0YSwgXCIgKi9cIik7XG4gICAgcmV0dXJuIFtjb250ZW50XS5jb25jYXQoW3NvdXJjZU1hcHBpbmddKS5qb2luKFwiXFxuXCIpO1xuICB9XG4gIHJldHVybiBbY29udGVudF0uam9pbihcIlxcblwiKTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBbW1wiTmFtZVwiLFwiSFAgcmVzdG9yZWRcIixcIlJhZHNcIixcIldlaWdodFwiLFwiVmFsdWVcIl0sW1wiQW5nbGVyIE1lYXRcIixcIjM1XCIsXCIxMFwiLFwiMC41XCIsXCIyMFwiXSxbXCJCYWtlZCBibG9hdGZseVwiLFwiNDBcIixcIjBcIixcIjAuNVwiLFwiMTVcIl0sW1wiRGVhdGhjbGF3IEVnZyBvbWVsZXR0ZVwiLFwiMTE1XCIsXCIwXCIsXCIwLjFcIixcIjgwXCJdLFtcIkRlYXRoY2xhdyBTdGVha1wiLFwiMTg1XCIsXCIwXCIsXCIxXCIsXCIxMzBcIl0sW1wiR3JpbGxlZCBSYWRyb2FjaFwiLFwiMzBcIixcIjBcIixcIjAuNVwiLFwiN1wiXSxbXCJIYXBweSBCaXJ0aGRheSBTd2VldHJvbGxcIixcIjIwXCIsXCI0XCIsXCIwXCIsXCIwXCJdLFtcIklndWFuYSBvbiBhIHN0aWNrXCIsXCI0MFwiLFwiMFwiLFwiMC4xXCIsXCIzM1wiXSxbXCJNaXJlbHVyayBjYWtlXCIsXCIxNDBcIixcIjBcIixcIjAuMVwiLFwiMzVcIl0sW1wiTW9sZSByYXQgY2h1bmtzXCIsXCI1MFwiLFwiMFwiLFwiMC41XCIsXCI4XCJdLFtcIlJhZHNjb3ByaWFuIHN0ZWFrXCIsXCIxNTBcIixcIjBcIixcIjFcIixcIjY1XCJdXSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRcIjAuMjBcIjogXCIzOVwiLFxuXHRcIjAuMjFcIjogXCI0MVwiLFxuXHRcIjAuMjJcIjogXCI0MVwiLFxuXHRcIjAuMjNcIjogXCI0MVwiLFxuXHRcIjAuMjRcIjogXCI0MVwiLFxuXHRcIjAuMjVcIjogXCI0MlwiLFxuXHRcIjAuMjZcIjogXCI0MlwiLFxuXHRcIjAuMjdcIjogXCI0M1wiLFxuXHRcIjAuMjhcIjogXCI0M1wiLFxuXHRcIjAuMjlcIjogXCI0M1wiLFxuXHRcIjAuMzBcIjogXCI0NFwiLFxuXHRcIjAuMzFcIjogXCI0NVwiLFxuXHRcIjAuMzJcIjogXCI0NVwiLFxuXHRcIjAuMzNcIjogXCI0NVwiLFxuXHRcIjAuMzRcIjogXCI0NVwiLFxuXHRcIjAuMzVcIjogXCI0NVwiLFxuXHRcIjAuMzZcIjogXCI0N1wiLFxuXHRcIjAuMzdcIjogXCI0OVwiLFxuXHRcIjEuMFwiOiBcIjQ5XCIsXG5cdFwiMS4xXCI6IFwiNTBcIixcblx0XCIxLjJcIjogXCI1MVwiLFxuXHRcIjEuM1wiOiBcIjUyXCIsXG5cdFwiMS40XCI6IFwiNTNcIixcblx0XCIxLjVcIjogXCI1NFwiLFxuXHRcIjEuNlwiOiBcIjU2XCIsXG5cdFwiMS43XCI6IFwiNThcIixcblx0XCIxLjhcIjogXCI1OVwiLFxuXHRcIjIuMFwiOiBcIjYxXCIsXG5cdFwiMi4xXCI6IFwiNjFcIixcblx0XCIzLjBcIjogXCI2NlwiLFxuXHRcIjMuMVwiOiBcIjY2XCIsXG5cdFwiNC4wXCI6IFwiNjlcIixcblx0XCI0LjFcIjogXCI2OVwiLFxuXHRcIjQuMlwiOiBcIjY5XCIsXG5cdFwiNS4wXCI6IFwiNzNcIixcblx0XCI2LjBcIjogXCI3NlwiLFxuXHRcIjYuMVwiOiBcIjc2XCIsXG5cdFwiNy4wXCI6IFwiNzhcIixcblx0XCI3LjFcIjogXCI3OFwiLFxuXHRcIjcuMlwiOiBcIjc4XCIsXG5cdFwiNy4zXCI6IFwiNzhcIixcblx0XCI4LjBcIjogXCI4MFwiLFxuXHRcIjguMVwiOiBcIjgwXCIsXG5cdFwiOC4yXCI6IFwiODBcIixcblx0XCI4LjNcIjogXCI4MFwiLFxuXHRcIjguNFwiOiBcIjgwXCIsXG5cdFwiOC41XCI6IFwiODBcIixcblx0XCI5LjBcIjogXCI4M1wiLFxuXHRcIjkuMVwiOiBcIjgzXCIsXG5cdFwiOS4yXCI6IFwiODNcIixcblx0XCI5LjNcIjogXCI4M1wiLFxuXHRcIjkuNFwiOiBcIjgzXCIsXG5cdFwiMTAuMFwiOiBcIjg1XCIsXG5cdFwiMTAuMVwiOiBcIjg1XCIsXG5cdFwiMTAuMlwiOiBcIjg1XCIsXG5cdFwiMTAuM1wiOiBcIjg1XCIsXG5cdFwiMTAuNFwiOiBcIjg1XCIsXG5cdFwiMTEuMFwiOiBcIjg3XCIsXG5cdFwiMTEuMVwiOiBcIjg3XCIsXG5cdFwiMTEuMlwiOiBcIjg3XCIsXG5cdFwiMTEuM1wiOiBcIjg3XCIsXG5cdFwiMTEuNFwiOiBcIjg3XCIsXG5cdFwiMTEuNVwiOiBcIjg3XCIsXG5cdFwiMTIuMFwiOiBcIjg5XCIsXG5cdFwiMTIuMVwiOiBcIjg5XCIsXG5cdFwiMTIuMlwiOiBcIjg5XCIsXG5cdFwiMTMuMFwiOiBcIjkxXCIsXG5cdFwiMTMuMVwiOiBcIjkxXCIsXG5cdFwiMTMuMlwiOiBcIjkxXCIsXG5cdFwiMTMuM1wiOiBcIjkxXCIsXG5cdFwiMTMuNFwiOiBcIjkxXCIsXG5cdFwiMTMuNVwiOiBcIjkxXCIsXG5cdFwiMTMuNlwiOiBcIjkxXCIsXG5cdFwiMTQuMFwiOiBcIjkzXCIsXG5cdFwiMTQuMVwiOiBcIjkzXCIsXG5cdFwiMTQuMlwiOiBcIjkzXCIsXG5cdFwiMTUuMFwiOiBcIjk0XCIsXG5cdFwiMTUuMVwiOiBcIjk0XCIsXG5cdFwiMTUuMlwiOiBcIjk0XCIsXG5cdFwiMTUuM1wiOiBcIjk0XCIsXG5cdFwiMTUuNFwiOiBcIjk0XCIsXG5cdFwiMTUuNVwiOiBcIjk0XCIsXG5cdFwiMTYuMFwiOiBcIjk2XCIsXG5cdFwiMTYuMVwiOiBcIjk2XCIsXG5cdFwiMTYuMlwiOiBcIjk2XCIsXG5cdFwiMTcuMFwiOiBcIjk4XCIsXG5cdFwiMTcuMVwiOiBcIjk4XCIsXG5cdFwiMTcuMlwiOiBcIjk4XCIsXG5cdFwiMTcuM1wiOiBcIjk4XCIsXG5cdFwiMTcuNFwiOiBcIjk4XCIsXG5cdFwiMTguMFwiOiBcIjEwMFwiLFxuXHRcIjE4LjFcIjogXCIxMDBcIixcblx0XCIxOC4yXCI6IFwiMTAwXCIsXG5cdFwiMTguM1wiOiBcIjEwMFwiLFxuXHRcIjE5LjBcIjogXCIxMDJcIixcblx0XCIxOS4xXCI6IFwiMTAyXCIsXG5cdFwiMjAuMFwiOiBcIjEwNFwiLFxuXHRcIjIwLjFcIjogXCIxMDRcIixcblx0XCIyMC4yXCI6IFwiMTA0XCIsXG5cdFwiMjAuM1wiOiBcIjEwNFwiLFxuXHRcIjIxLjBcIjogXCIxMDZcIixcblx0XCIyMS4xXCI6IFwiMTA2XCIsXG5cdFwiMjIuMFwiOiBcIjEwOFwiXG59OyIsImV4cG9ydCBkZWZhdWx0IFwiXFxcIk5vb2RsZXMuIFdlIGFsbCBlYXQgdGhlbS4gV2UgYWxsIGxvdmUgdGhlbS4gQW5kIERpYW1vbmQgQ2l0eSdzIFBvd2VyIE5vb2RsZXMgaGFzIHN1cHBsaWVkIHRoaXMgc3VzdGVuYW5jZSBmb3IgdGhlIHBhc3QgZmlmdGVlbiB5ZWFycy4gRnJvbSB0aGUgc3RpbHRlZCBtZWNoYW5pY2FsIGNhZGVuY2Ugb2YgVGFrYWhhc2hpJ3MgcHJvZ3JhbW1lZCBKYXBhbmVzZSwgdG8gdGhlIGZyYWdyYW50IHN0ZWFtIHRoYXQgd2FmdHMgZnJvbSBlYWNoIGJvd2wsIHRvIHRoZSBzY2FsZGluZyB0YW5nIG9mIGVhY2ggZGVsaWNpb3VzIG1vdXRoZnVsIC0gdGhlIG9yZGVyaW5nIGFuZCBlYXRpbmcgb2Ygbm9vZGxlcyBpcyBidXQgb25lIG9mIG1hbnkgc2hhcmVkIGh1bWFuIGV4cGVyaWVuY2VzLiBPciBpcyBpdD9cXFwiIFxcbi1UaGUgU3ludGhldGljIFRydXRoXFxuXFxuVGhpcyBzdHJ1Y3R1cmUgZGlyZWN0bHkgb3Bwb3NpdGUgdGhlIGNpdHkncyBtYWluIGVudHJhbmNlIGluIHRoZSBjZW50ZXIgb2YgdGhlIG1hcmtldCBpcyBhIHNtYWxsIG91dGRvb3IgcmVzdGF1cmFudC4gQ291bnRlcnMgZW5jaXJjbGUgYSBjZW50cmFsIHBpbGxhciwgd2l0aCBUYWthaGFzaGkgYmVoaW5kIG9uZSBvZiB0aGVtLiBBIGNvb2tpbmcgc3RhdGlvbiBzaXRzIG5lYXJieS4gVGhlIHBpbGxhciBmZWF0dXJlcyBhIGZ1bmN0aW9uYWwgcG93ZXIgcmVhY3Rvciwgc3VwcGx5aW5nIHRoZSBzdXJyb3VuZGluZyBidWlsZGluZ3Mgd2l0aCBlbGVjdHJpY2l0eS5cXG5cXG5BcHByb3hpbWF0ZWx5IDQzIHllYXJzIGJlZm9yZSBQb3dlciBOb29kbGVzIHdhcyBlc3RhYmxpc2hlZCwgYSBiYXIgdGhhdCBvY2N1cGllZCB0aGUgc2FtZSBzcGFjZSBpbiB0aGUgbWFya2V0IHdhcyB0aGUgc2NlbmUgb2YgdGhlIEJyb2tlbiBNYXNrIGluY2lkZW50LiBUaGlzIHZpb2xlbnQgZXZlbnQgcmVzdWx0ZWQgaW4gdGhlIGRlYXRoIG9mIHRlbiBpbmRpdmlkdWFscyBhdCB0aGUgaGFuZCBvZiBhIG1hbGZ1bmN0aW9uaW5nIEluc3RpdHV0ZSBzeW50aCBpbiBNYXkgMjIyOS5cXG5cXG5VcG9uIG1lZXRpbmcgVGFrYWhhc2hpIGZvciB0aGUgZmlyc3QgdGltZSBhbmQgaGVhcmluZyBoaXMgc2lnbmF0dXJlIHF1ZXN0aW9uIChcXFwiTmFuLW5pIHNoaW1hc2tvLWthP1xcXCIpLCBhIG5lYXJieSByZXNpZGVudCB3aWxsIHNheSBcXFwiSnVzdCBzYXkgeWVzLCBpdCdzIGFsbCBoZSB1bmRlcnN0YW5kcy5cXFwiXFxuXFxuQ29tcGFuaW9ucyB3aWxsIHRyeSB0byB0YWxrIHRvIFRha2FoYXNoaSB3aGVuIGFycml2aW5nIGluIHRoZSBEaWFtb25kIENpdHkgbWFya2V0IGZvciB0aGUgZmlyc3QgdGltZS5cXG5cXG5NYWNDcmVhZHkgZW5qb3lzIFRha2FoYXNoaSdzIG5vb2RsZXMgaW1tZW5zZWx5LiBJZiBoZSBpcyB0aGUgU29sZSBTdXJ2aXZvcidzIGN1cnJlbnQgY29tcGFuaW9uLCBoZSBhY2NlcHRzIGEgYm93bCBmcm9tIHRoZSByb2JvdGljIGNoZWYsIGFuZCB3aGVuIGZpbmlzaGVkLCBlbnRodXNpYXN0aWNhbGx5IGFza3MgZm9yIG1vcmUuXFxuXFxuSWYgdmlzaXRpbmcgRGlhbW9uZCBDaXR5IG9uIEhhbGxvd2VlbiwgUG93ZXIgTm9vZGxlcyBpcyBkZWNvcmF0ZWQgd2l0aCByZWQgc2t1bGwgY3V0b3V0cyBvbiB0aGUgY291bnRlciBhbmQgXFxcIkhhcHB5IEhhbGxvd2VlblxcXCIgYmFubmVycyBzdHJldGNoZWQgYWNyb3NzIHRoZSBjYW5vcHkuXFxuXFxuSWYgdmlzaXRpbmcgRGlhbW9uZCBDaXR5IG9uIENocmlzdG1hcywgUG93ZXIgTm9vZGxlcyBpcyBkZWNvcmF0ZWQgd2l0aCBDaHJpc3RtYXMgdHJlZXMgYW5kIGxpZ2h0cyBjb25uZWN0ZWQgdG8gc3Vycm91bmRpbmcgYnVpbGRpbmdzLlxcblxcblRoZSBGYXIgSGFyYm9yIG5vdGUgVGFzdGUgdGVzdCBmb3VuZCBpbiB0aGUgTnVjbGV1cyBtYWtlcyBhIHJlZmVyZW5jZSB0byBQb3dlciBOb29kbGVzLlxcblwiOyIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9nbG9iYWwuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9nbG9iYWwuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2luaXRpYWxQYWdlLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vaW5pdGlhbFBhZ2UuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL21lbnUuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9tZW51LmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc3R5bGVzSW5ET00gPSBbXTtcblxuZnVuY3Rpb24gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICB2YXIgcmVzdWx0ID0gLTE7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHlsZXNJbkRPTS5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzdHlsZXNJbkRPTVtpXS5pZGVudGlmaWVyID09PSBpZGVudGlmaWVyKSB7XG4gICAgICByZXN1bHQgPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpIHtcbiAgdmFyIGlkQ291bnRNYXAgPSB7fTtcbiAgdmFyIGlkZW50aWZpZXJzID0gW107XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldO1xuICAgIHZhciBpZCA9IG9wdGlvbnMuYmFzZSA/IGl0ZW1bMF0gKyBvcHRpb25zLmJhc2UgOiBpdGVtWzBdO1xuICAgIHZhciBjb3VudCA9IGlkQ291bnRNYXBbaWRdIHx8IDA7XG4gICAgdmFyIGlkZW50aWZpZXIgPSBcIlwiLmNvbmNhdChpZCwgXCIgXCIpLmNvbmNhdChjb3VudCk7XG4gICAgaWRDb3VudE1hcFtpZF0gPSBjb3VudCArIDE7XG4gICAgdmFyIGluZGV4QnlJZGVudGlmaWVyID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcik7XG4gICAgdmFyIG9iaiA9IHtcbiAgICAgIGNzczogaXRlbVsxXSxcbiAgICAgIG1lZGlhOiBpdGVtWzJdLFxuICAgICAgc291cmNlTWFwOiBpdGVtWzNdLFxuICAgICAgc3VwcG9ydHM6IGl0ZW1bNF0sXG4gICAgICBsYXllcjogaXRlbVs1XVxuICAgIH07XG5cbiAgICBpZiAoaW5kZXhCeUlkZW50aWZpZXIgIT09IC0xKSB7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleEJ5SWRlbnRpZmllcl0ucmVmZXJlbmNlcysrO1xuICAgICAgc3R5bGVzSW5ET01baW5kZXhCeUlkZW50aWZpZXJdLnVwZGF0ZXIob2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHVwZGF0ZXIgPSBhZGRFbGVtZW50U3R5bGUob2JqLCBvcHRpb25zKTtcbiAgICAgIG9wdGlvbnMuYnlJbmRleCA9IGk7XG4gICAgICBzdHlsZXNJbkRPTS5zcGxpY2UoaSwgMCwge1xuICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxuICAgICAgICB1cGRhdGVyOiB1cGRhdGVyLFxuICAgICAgICByZWZlcmVuY2VzOiAxXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50aWZpZXIpO1xuICB9XG5cbiAgcmV0dXJuIGlkZW50aWZpZXJzO1xufVxuXG5mdW5jdGlvbiBhZGRFbGVtZW50U3R5bGUob2JqLCBvcHRpb25zKSB7XG4gIHZhciBhcGkgPSBvcHRpb25zLmRvbUFQSShvcHRpb25zKTtcbiAgYXBpLnVwZGF0ZShvYmopO1xuXG4gIHZhciB1cGRhdGVyID0gZnVuY3Rpb24gdXBkYXRlcihuZXdPYmopIHtcbiAgICBpZiAobmV3T2JqKSB7XG4gICAgICBpZiAobmV3T2JqLmNzcyA9PT0gb2JqLmNzcyAmJiBuZXdPYmoubWVkaWEgPT09IG9iai5tZWRpYSAmJiBuZXdPYmouc291cmNlTWFwID09PSBvYmouc291cmNlTWFwICYmIG5ld09iai5zdXBwb3J0cyA9PT0gb2JqLnN1cHBvcnRzICYmIG5ld09iai5sYXllciA9PT0gb2JqLmxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYXBpLnVwZGF0ZShvYmogPSBuZXdPYmopO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcGkucmVtb3ZlKCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB1cGRhdGVyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChsaXN0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgdmFyIGxhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShsaXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZShuZXdMaXN0KSB7XG4gICAgbmV3TGlzdCA9IG5ld0xpc3QgfHwgW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhc3RJZGVudGlmaWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGlkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbaV07XG4gICAgICB2YXIgaW5kZXggPSBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4XS5yZWZlcmVuY2VzLS07XG4gICAgfVxuXG4gICAgdmFyIG5ld0xhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShuZXdMaXN0LCBvcHRpb25zKTtcblxuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICB2YXIgX2lkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbX2ldO1xuXG4gICAgICB2YXIgX2luZGV4ID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoX2lkZW50aWZpZXIpO1xuXG4gICAgICBpZiAoc3R5bGVzSW5ET01bX2luZGV4XS5yZWZlcmVuY2VzID09PSAwKSB7XG4gICAgICAgIHN0eWxlc0luRE9NW19pbmRleF0udXBkYXRlcigpO1xuXG4gICAgICAgIHN0eWxlc0luRE9NLnNwbGljZShfaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxhc3RJZGVudGlmaWVycyA9IG5ld0xhc3RJZGVudGlmaWVycztcbiAgfTtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBtZW1vID0ge307XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cblxuZnVuY3Rpb24gZ2V0VGFyZ2V0KHRhcmdldCkge1xuICBpZiAodHlwZW9mIG1lbW9bdGFyZ2V0XSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciBzdHlsZVRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0KTsgLy8gU3BlY2lhbCBjYXNlIHRvIHJldHVybiBoZWFkIG9mIGlmcmFtZSBpbnN0ZWFkIG9mIGlmcmFtZSBpdHNlbGZcblxuICAgIGlmICh3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQgJiYgc3R5bGVUYXJnZXQgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYWNjZXNzIHRvIGlmcmFtZSBpcyBibG9ja2VkXG4gICAgICAgIC8vIGR1ZSB0byBjcm9zcy1vcmlnaW4gcmVzdHJpY3Rpb25zXG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gc3R5bGVUYXJnZXQuY29udGVudERvY3VtZW50LmhlYWQ7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGlzdGFuYnVsIGlnbm9yZSBuZXh0XG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBtZW1vW3RhcmdldF0gPSBzdHlsZVRhcmdldDtcbiAgfVxuXG4gIHJldHVybiBtZW1vW3RhcmdldF07XG59XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cblxuXG5mdW5jdGlvbiBpbnNlcnRCeVNlbGVjdG9yKGluc2VydCwgc3R5bGUpIHtcbiAgdmFyIHRhcmdldCA9IGdldFRhcmdldChpbnNlcnQpO1xuXG4gIGlmICghdGFyZ2V0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGRuJ3QgZmluZCBhIHN0eWxlIHRhcmdldC4gVGhpcyBwcm9iYWJseSBtZWFucyB0aGF0IHRoZSB2YWx1ZSBmb3IgdGhlICdpbnNlcnQnIHBhcmFtZXRlciBpcyBpbnZhbGlkLlwiKTtcbiAgfVxuXG4gIHRhcmdldC5hcHBlbmRDaGlsZChzdHlsZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5zZXJ0QnlTZWxlY3RvcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucykge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgb3B0aW9ucy5zZXRBdHRyaWJ1dGVzKGVsZW1lbnQsIG9wdGlvbnMuYXR0cmlidXRlcyk7XG4gIG9wdGlvbnMuaW5zZXJ0KGVsZW1lbnQsIG9wdGlvbnMub3B0aW9ucyk7XG4gIHJldHVybiBlbGVtZW50O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluc2VydFN0eWxlRWxlbWVudDsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMoc3R5bGVFbGVtZW50KSB7XG4gIHZhciBub25jZSA9IHR5cGVvZiBfX3dlYnBhY2tfbm9uY2VfXyAhPT0gXCJ1bmRlZmluZWRcIiA/IF9fd2VicGFja19ub25jZV9fIDogbnVsbDtcblxuICBpZiAobm9uY2UpIHtcbiAgICBzdHlsZUVsZW1lbnQuc2V0QXR0cmlidXRlKFwibm9uY2VcIiwgbm9uY2UpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKSB7XG4gIHZhciBjc3MgPSBcIlwiO1xuXG4gIGlmIChvYmouc3VwcG9ydHMpIHtcbiAgICBjc3MgKz0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChvYmouc3VwcG9ydHMsIFwiKSB7XCIpO1xuICB9XG5cbiAgaWYgKG9iai5tZWRpYSkge1xuICAgIGNzcyArPSBcIkBtZWRpYSBcIi5jb25jYXQob2JqLm1lZGlhLCBcIiB7XCIpO1xuICB9XG5cbiAgdmFyIG5lZWRMYXllciA9IHR5cGVvZiBvYmoubGF5ZXIgIT09IFwidW5kZWZpbmVkXCI7XG5cbiAgaWYgKG5lZWRMYXllcikge1xuICAgIGNzcyArPSBcIkBsYXllclwiLmNvbmNhdChvYmoubGF5ZXIubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChvYmoubGF5ZXIpIDogXCJcIiwgXCIge1wiKTtcbiAgfVxuXG4gIGNzcyArPSBvYmouY3NzO1xuXG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cblxuICBpZiAob2JqLm1lZGlhKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG5cbiAgaWYgKG9iai5zdXBwb3J0cykge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuXG4gIHZhciBzb3VyY2VNYXAgPSBvYmouc291cmNlTWFwO1xuXG4gIGlmIChzb3VyY2VNYXAgJiYgdHlwZW9mIGJ0b2EgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBjc3MgKz0gXCJcXG4vKiMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LFwiLmNvbmNhdChidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShzb3VyY2VNYXApKSkpLCBcIiAqL1wiKTtcbiAgfSAvLyBGb3Igb2xkIElFXG5cbiAgLyogaXN0YW5idWwgaWdub3JlIGlmICAqL1xuXG5cbiAgb3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCwgb3B0aW9ucy5vcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCkge1xuICAvLyBpc3RhbmJ1bCBpZ25vcmUgaWZcbiAgaWYgKHN0eWxlRWxlbWVudC5wYXJlbnROb2RlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc3R5bGVFbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50KTtcbn1cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuXG5cbmZ1bmN0aW9uIGRvbUFQSShvcHRpb25zKSB7XG4gIHZhciBzdHlsZUVsZW1lbnQgPSBvcHRpb25zLmluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKTtcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShvYmopIHtcbiAgICAgIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge1xuICAgICAgcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG4gICAgfVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUFQSTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBzdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCkge1xuICBpZiAoc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQpIHtcbiAgICBzdHlsZUVsZW1lbnQuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICB9IGVsc2Uge1xuICAgIHdoaWxlIChzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgc3R5bGVFbGVtZW50LnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKTtcbiAgICB9XG5cbiAgICBzdHlsZUVsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzdHlsZVRhZ1RyYW5zZm9ybTsiLCJpbXBvcnQgZ2l0SHViSWNvbiBmcm9tICcuL2ltZ3MvZ2l0aHViLnBuZyc7XG5pbXBvcnQgJy4vZ2xvYmFsLmNzcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZUZvb3RlcihlbGVtZW50KSB7XG4gIGNvbnN0IGZvb3RlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Zvb3RlcicpO1xuICBmb290ZXIuY2xhc3NMaXN0LmFkZCgnZm9vdGVyJyk7XG4gIGZvb3Rlci5jbGFzc0xpc3QuYWRkKCdnbG93Jyk7XG5cbiAgY29uc3QgaWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICBpY29uLnNyYyA9IGdpdEh1Ykljb247XG5cbiAgY29uc3QgYXV0aG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDInKTtcbiAgYXV0aG9yLmlubmVyVGV4dCA9ICdqb3J0ZWdhMic7XG5cbiAgZm9vdGVyLmFwcGVuZChpY29uKTtcbiAgZm9vdGVyLmFwcGVuZChhdXRob3IpO1xuXG4gIGVsZW1lbnQuYXBwZW5kQ2hpbGQoZm9vdGVyKTtcbn1cbiIsImltcG9ydCAnLi9pbml0aWFsUGFnZS5jc3MnO1xuaW1wb3J0ICcuL2dsb2JhbC5jc3MnO1xuaW1wb3J0IGZhbGxvdXRMb2dvIGZyb20gJy4vaW1ncy9mYWxsb3V0LnBuZyc7XG5pbXBvcnQgbG9jYXRpb25JbWcgZnJvbSAnLi9pbWdzL2RpYW1vbmRjaXR5LmpwZyc7XG5pbXBvcnQgYWJvdXQgZnJvbSAnLi9hYm91dC50eHQnO1xuXG5mdW5jdGlvbiBjcmVhdGVIZWFkZXIoKSB7XG4gIGNvbnN0IGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBoZWFkZXIuY2xhc3NMaXN0LmFkZCgnaGVhZGVyJyk7XG4gIGhlYWRlci5jbGFzc0xpc3QuYWRkKCdnbG93Jyk7XG5cbiAgY29uc3QgdGl0bGVCRyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB0aXRsZUJHLmNsYXNzTGlzdC5hZGQoJ29wYXF1ZScpO1xuICB0aXRsZUJHLnRleHRDb250ZW50ID0gJ1Bvd2VyIE5vb2RsZXMnO1xuXG4gIGNvbnN0IG5hdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBuYXYuY2xhc3NMaXN0LmFkZCgnbmF2QmFyJyk7XG5cbiAgY29uc3QgZmFsbG91dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICBmYWxsb3V0LnNyYyA9IGZhbGxvdXRMb2dvO1xuICBmYWxsb3V0LmNsYXNzTGlzdC5hZGQoJ3RpdGxlSW1nJyk7XG5cbiAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCduYXZCdXR0b24nKTtcbiAgYnV0dG9uLnRleHRDb250ZW50ID0gJ1ZpZXcgdGhlIE1lbnUnO1xuXG4gIG5hdi5hcHBlbmRDaGlsZChmYWxsb3V0KTtcbiAgbmF2LmFwcGVuZENoaWxkKGJ1dHRvbik7XG5cbiAgaGVhZGVyLmFwcGVuZChuYXYpO1xuICBoZWFkZXIuYXBwZW5kKHRpdGxlQkcpO1xuXG4gIHJldHVybiBoZWFkZXI7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1hcCgpIHtcbiAgY29uc3QgbWFwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gIG1hcC5zcmMgPSBsb2NhdGlvbkltZztcbiAgbWFwLmNsYXNzTGlzdC5hZGQoJ21hcCcpO1xuICBtYXAuY2xhc3NMaXN0LmFkZCgnZ2xvdycpO1xuXG4gIHJldHVybiBtYXA7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUhvdXJzVGFibGUoKSB7XG4gIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0YWJsZScpO1xuXG4gIGNvbnN0IGNhcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYXB0aW9uJyk7XG4gIGNhcHRpb24udGV4dENvbnRlbnQgPSAnT1BFTklORyBIT1VSUyc7XG4gIGVsZW1lbnQuYXBwZW5kQ2hpbGQoY2FwdGlvbik7XG4gIGNvbnN0IGRheXMgPSBbJ01PTicsICdUVUUnLCAnV0VEJywgJ1RIVScsICdGUkknLCAnU0FUJywgJ1NVTiddO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgNzsgaSArPSAxKSB7XG4gICAgY29uc3QgZGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcblxuICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGgnKTtcbiAgICBsYWJlbC5pbm5lclRleHQgPSBkYXlzW2ldO1xuXG4gICAgY29uc3QgaG91cnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuICAgIGhvdXJzLmlubmVyVGV4dCA9ICc4OjAwIGEubS4gLSAxMDowMCBwLm0uJztcblxuICAgIGRheS5hcHBlbmQobGFiZWwpO1xuICAgIGRheS5hcHBlbmQoaG91cnMpO1xuICAgIGVsZW1lbnQuYXBwZW5kKGRheSk7XG4gIH1cbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUhvdXJzKCkge1xuICBjb25zdCBzdG9yZUhvdXJzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHN0b3JlSG91cnMuY2xhc3NMaXN0LmFkZCgnc3RvcmVIb3VycycpO1xuICBzdG9yZUhvdXJzLmNsYXNzTGlzdC5hZGQoJ2dsb3cnKTtcblxuICBjb25zdCBob3Vyc1RhYmxlID0gY3JlYXRlSG91cnNUYWJsZSgpO1xuXG4gIHN0b3JlSG91cnMuYXBwZW5kKGhvdXJzVGFibGUpO1xuXG4gIHJldHVybiBzdG9yZUhvdXJzO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJbmZvcm1hdGlvbigpIHtcbiAgY29uc3QgaW5mb3JtYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgaW5mb3JtYXRpb24uY2xhc3NMaXN0LmFkZCgnaW5mb3JtYXRpb24nKTtcbiAgaW5mb3JtYXRpb24uY2xhc3NMaXN0LmFkZCgnZ2xvdycpO1xuXG4gIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDInKTtcbiAgdGl0bGUuaW5uZXJUZXh0ID0gJ0Zyb20gdGhlIFdpa2knO1xuXG4gIGNvbnN0IGluZm8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gIGluZm8uaW5uZXJUZXh0ID0gYWJvdXQ7XG5cbiAgaW5mb3JtYXRpb24uYXBwZW5kKHRpdGxlKTtcbiAgaW5mb3JtYXRpb24uYXBwZW5kKGluZm8pO1xuXG4gIHJldHVybiBpbmZvcm1hdGlvbjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdGlhbFBhZ2UoZWxlbWVudCkge1xuICBlbGVtZW50LmFwcGVuZChjcmVhdGVIZWFkZXIoKSk7XG4gIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZU1hcCgpKTtcbiAgZWxlbWVudC5hcHBlbmQoY3JlYXRlSG91cnMoKSk7XG4gIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZUluZm9ybWF0aW9uKCkpO1xufVxuIiwiaW1wb3J0ICcuL2dsb2JhbC5jc3MnO1xuaW1wb3J0ICcuL21lbnUuY3NzJztcbmltcG9ydCB7IGRhdGEgfSBmcm9tICdicm93c2Vyc2xpc3QnO1xuaW1wb3J0IG1lbnVJdGVtcyBmcm9tICcuL21lbnUuY3N2JztcbmltcG9ydCBmYWxsb3V0TG9nbyBmcm9tICcuL2ltZ3MvZmFsbG91dC5wbmcnO1xuXG5mdW5jdGlvbiBhZGRNZW51KGVsZW1lbnQpIHtcbiAgLy8gdGFibGUgY2FwdGlvblxuICBjb25zdCBjYXB0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FwdGlvbicpO1xuICBjYXB0aW9uLmlubmVyVGV4dCA9ICdPdXIgTWVudSc7XG5cbiAgZWxlbWVudC5hcHBlbmRDaGlsZChjYXB0aW9uKTtcbiAgLy8gY3JlYXRlIHJvd3Mgb2YgdGFibGVcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZW51SXRlbXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBjb25zdCByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQocm93KTtcbiAgfVxuXG4gIGNvbnN0IHsgY2hpbGRyZW4gfSA9IGVsZW1lbnQ7XG5cbiAgLy8gY3JlYXRlIGhlYWRlciByb3dcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZW51SXRlbXNbMF0ubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBjb25zdCB0YWJsZUhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RoJyk7XG4gICAgdGFibGVIZWFkZXIuaW5uZXJUZXh0ID0gbWVudUl0ZW1zWzBdW2ldO1xuXG4gICAgY2hpbGRyZW5bMV0uYXBwZW5kKHRhYmxlSGVhZGVyKTtcbiAgfVxuXG4gIC8vIGNyZWF0ZSBkYXRhIGNlbGxzXG4gIGZvciAobGV0IGkgPSAxOyBpIDwgbWVudUl0ZW1zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBtZW51SXRlbXNbaV0ubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgIGNvbnN0IGRhdGFDZWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKTtcbiAgICAgIGRhdGFDZWxsLmlubmVyVGV4dCA9IG1lbnVJdGVtc1tpXVtqXTtcbiAgICAgIGNoaWxkcmVuW2kgKyAxXS5hcHBlbmQoZGF0YUNlbGwpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVCb2R5KCkge1xuICBjb25zdCBtZW51Q29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIG1lbnVDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnbWVudUNvbnRhaW5lcicpO1xuICBtZW51Q29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2dsb3cnKTtcblxuICBjb25zdCBuYXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgbmF2LmNsYXNzTGlzdC5hZGQoJ25hdkJhcicpO1xuXG4gIGNvbnN0IGZhbGxvdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgZmFsbG91dC5zcmMgPSBmYWxsb3V0TG9nbztcbiAgZmFsbG91dC5jbGFzc0xpc3QuYWRkKCd0aXRsZUltZycpO1xuXG4gIGNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICBidXR0b24uY2xhc3NMaXN0LmFkZCgnbmF2QnV0dG9uJyk7XG4gIGJ1dHRvbi50ZXh0Q29udGVudCA9ICdSZXR1cm4gdG8gSG9tZSc7XG5cbiAgY29uc3QgbWVudSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJyk7XG4gIG1lbnUuY2xhc3NMaXN0LmFkZCgnbWVudScpO1xuICBhZGRNZW51KG1lbnUpO1xuXG4gIG5hdi5hcHBlbmRDaGlsZChmYWxsb3V0KTtcbiAgbmF2LmFwcGVuZENoaWxkKGJ1dHRvbik7XG5cbiAgbWVudUNvbnRhaW5lci5hcHBlbmQobmF2KTtcbiAgbWVudUNvbnRhaW5lci5hcHBlbmQobWVudSk7XG5cbiAgcmV0dXJuIG1lbnVDb250YWluZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZU1lbnVQYWdlKGVsZW1lbnQpIHtcbiAgZWxlbWVudC5hcHBlbmRDaGlsZChjcmVhdGVCb2R5KCkpO1xufVxuIiwiLyogKGlnbm9yZWQpICovIiwiLyogZXMtbW9kdWxlLWxleGVyIDAuOS4zICovXG5jb25zdCBBPTE9PT1uZXcgVWludDhBcnJheShuZXcgVWludDE2QXJyYXkoWzFdKS5idWZmZXIpWzBdO2V4cG9ydCBmdW5jdGlvbiBwYXJzZShFLEk9XCJAXCIpe2lmKCFCKXJldHVybiBpbml0LnRoZW4oKCk9PnBhcnNlKEUpKTtjb25zdCBnPUUubGVuZ3RoKzEsRD0oQi5fX2hlYXBfYmFzZS52YWx1ZXx8Qi5fX2hlYXBfYmFzZSkrNCpnLUIubWVtb3J5LmJ1ZmZlci5ieXRlTGVuZ3RoO0Q+MCYmQi5tZW1vcnkuZ3JvdyhNYXRoLmNlaWwoRC82NTUzNikpO2NvbnN0IHc9Qi5zYShnLTEpO2lmKChBP0M6USkoRSxuZXcgVWludDE2QXJyYXkoQi5tZW1vcnkuYnVmZmVyLHcsZykpLCFCLnBhcnNlKCkpdGhyb3cgT2JqZWN0LmFzc2lnbihuZXcgRXJyb3IoYFBhcnNlIGVycm9yICR7SX06JHtFLnNsaWNlKDAsQi5lKCkpLnNwbGl0KFwiXFxuXCIpLmxlbmd0aH06JHtCLmUoKS1FLmxhc3RJbmRleE9mKFwiXFxuXCIsQi5lKCktMSl9YCkse2lkeDpCLmUoKX0pO2NvbnN0IEw9W10saz1bXTtmb3IoO0IucmkoKTspe2NvbnN0IEE9Qi5pcygpLFE9Qi5pZSgpLEM9Qi5haSgpLEk9Qi5pZCgpLGc9Qi5zcygpLEQ9Qi5zZSgpO2xldCB3O0IuaXAoKSYmKHc9SihFLnNsaWNlKC0xPT09ST9BLTE6QSwtMT09PUk/USsxOlEpKSksTC5wdXNoKHtuOncsczpBLGU6USxzczpnLHNlOkQsZDpJLGE6Q30pfWZvcig7Qi5yZSgpOyl7Y29uc3QgQT1FLnNsaWNlKEIuZXMoKSxCLmVlKCkpLFE9QVswXTtrLnB1c2goJ1wiJz09PVF8fFwiJ1wiPT09UT9KKEEpOkEpfWZ1bmN0aW9uIEooQSl7dHJ5e3JldHVybigwLGV2YWwpKEEpfWNhdGNoKEEpe319cmV0dXJuW0wsaywhIUIuZigpXX1mdW5jdGlvbiBRKEEsUSl7Y29uc3QgQz1BLmxlbmd0aDtsZXQgQj0wO2Zvcig7QjxDOyl7Y29uc3QgQz1BLmNoYXJDb2RlQXQoQik7UVtCKytdPSgyNTUmQyk8PDh8Qz4+Pjh9fWZ1bmN0aW9uIEMoQSxRKXtjb25zdCBDPUEubGVuZ3RoO2xldCBCPTA7Zm9yKDtCPEM7KVFbQl09QS5jaGFyQ29kZUF0KEIrKyl9bGV0IEI7ZXhwb3J0IGNvbnN0IGluaXQ9V2ViQXNzZW1ibHkuY29tcGlsZSgoRT1cIkFHRnpiUUVBQUFBQlhBMWdBWDhCZjJBRWYzOS9md0JnQW45L0FHQUFBWDlnQm45L2YzOS9md0YvWUFBQVlBRi9BR0FFZjM5L2Z3Ri9ZQU4vZjM4QmYyQUhmMzkvZjM5L2Z3Ri9ZQVYvZjM5L2Z3Ri9ZQUovZndGL1lBaC9mMzkvZjM5L2Z3Ri9BekV3QUFFQ0F3TURBd01EQXdNREF3TURBd0FBQkFVRkJRWUZCZ0FBQUFBRkJRQUVCd2dKQ2dzTUFBSUFBQUFMQXdrTUJBVUJjQUVCQVFVREFRQUJCZzhDZndGQjhQQUFDMzhBUWZEd0FBc0haQkVHYldWdGIzSjVBZ0FDYzJFQUFBRmxBQU1DYVhNQUJBSnBaUUFGQW5OekFBWUNjMlVBQndKaGFRQUlBbWxrQUFrQ2FYQUFDZ0psY3dBTEFtVmxBQXdDY21rQURRSnlaUUFPQVdZQUR3VndZWEp6WlFBUUMxOWZhR1ZoY0Y5aVlYTmxBd0VLOGprd2FBRUJmMEVBSUFBMkFyZ0lRUUFvQXBBSUlnRWdBRUVCZEdvaUFFRUFPd0VBUVFBZ0FFRUNhaUlBTmdLOENFRUFJQUEyQXNBSVFRQkJBRFlDbEFoQkFFRUFOZ0trQ0VFQVFRQTJBcHdJUVFCQkFEWUNtQWhCQUVFQU5nS3NDRUVBUVFBMkFxQUlJQUVMc2dFQkFuOUJBQ2dDcEFnaUJFRWNha0dVQ0NBRUcwRUFLQUxBQ0NJRk5nSUFRUUFnQlRZQ3BBaEJBQ0FFTmdLb0NFRUFJQVZCSUdvMkFzQUlJQVVnQURZQ0NBSkFBa0JCQUNnQ2lBZ2dBMGNOQUNBRklBSTJBZ3dNQVFzQ1FFRUFLQUtFQ0NBRFJ3MEFJQVVnQWtFQ2FqWUNEQXdCQ3lBRlFRQW9BcEFJTmdJTUN5QUZJQUUyQWdBZ0JTQUROZ0lVSUFWQkFEWUNFQ0FGSUFJMkFnUWdCVUVBTmdJY0lBVkJBQ2dDaEFnZ0EwWTZBQmdMU0FFQmYwRUFLQUtzQ0NJQ1FRaHFRWmdJSUFJYlFRQW9Bc0FJSWdJMkFnQkJBQ0FDTmdLc0NFRUFJQUpCREdvMkFzQUlJQUpCQURZQ0NDQUNJQUUyQWdRZ0FpQUFOZ0lBQ3dnQVFRQW9Bc1FJQ3hVQVFRQW9BcHdJS0FJQVFRQW9BcEFJYTBFQmRRc1ZBRUVBS0FLY0NDZ0NCRUVBS0FLUUNHdEJBWFVMRlFCQkFDZ0NuQWdvQWdoQkFDZ0NrQWhyUVFGMUN4VUFRUUFvQXB3SUtBSU1RUUFvQXBBSWEwRUJkUXNlQVFGL1FRQW9BcHdJS0FJUUlnQkJBQ2dDa0FoclFRRjFRWDhnQUJzTE93RUJmd0pBUVFBb0Fwd0lLQUlVSWdCQkFDZ0NoQWhIRFFCQmZ3OExBa0FnQUVFQUtBS0lDRWNOQUVGK0R3c2dBRUVBS0FLUUNHdEJBWFVMQ3dCQkFDZ0NuQWd0QUJnTEZRQkJBQ2dDb0Fnb0FnQkJBQ2dDa0FoclFRRjFDeFVBUVFBb0FxQUlLQUlFUVFBb0FwQUlhMEVCZFFzbEFRRi9RUUJCQUNnQ25BZ2lBRUVjYWtHVUNDQUFHeWdDQUNJQU5nS2NDQ0FBUVFCSEN5VUJBWDlCQUVFQUtBS2dDQ0lBUVFocVFaZ0lJQUFiS0FJQUlnQTJBcUFJSUFCQkFFY0xDQUJCQUMwQXlBZ0w5Z3NCQkg4akFFR0E4QUJySWdFa0FFRUFRUUU2QU1nSVFRQkIvLzhET3dIT0NFRUFRUUFvQW93SU5nTFFDRUVBUVFBb0FwQUlRWDVxSWdJMkF1UUlRUUFnQWtFQUtBSzRDRUVCZEdvaUF6WUM2QWhCQUVFQU93SEtDRUVBUVFBN0Fjd0lRUUJCQURvQTFBaEJBRUVBTmdMRUNFRUFRUUE2QUxRSVFRQWdBVUdBMEFCcU5nTFlDRUVBSUFGQmdCQnFOZ0xjQ0VFQVFRQTZBT0FJQWtBQ1FBSkFBa0FEUUVFQUlBSkJBbW9pQkRZQzVBZ2dBaUFEVHcwQkFrQWdCQzhCQUNJRFFYZHFRUVZKRFFBQ1FBSkFBa0FDUUFKQUlBTkJtMzlxRGdVQkNBZ0lBZ0FMSUFOQklFWU5CQ0FEUVM5R0RRTWdBMEU3UmcwQ0RBY0xRUUF2QWN3SURRRWdCQkFSUlEwQklBSkJCR3BCK0FCQjhBQkI3d0JCOGdCQjlBQVFFa1VOQVJBVFFRQXRBTWdJRFFGQkFFRUFLQUxrQ0NJQ05nTFFDQXdIQ3lBRUVCRkZEUUFnQWtFRWFrSHRBRUh3QUVIdkFFSHlBRUgwQUJBU1JRMEFFQlFMUVFCQkFDZ0M1QWcyQXRBSURBRUxBa0FnQWk4QkJDSUVRU3BHRFFBZ0JFRXZSdzBFRUJVTUFRdEJBUkFXQzBFQUtBTG9DQ0VEUVFBb0F1UUlJUUlNQUFzTFFRQWhBeUFFSVFKQkFDMEF0QWdOQWd3QkMwRUFJQUkyQXVRSVFRQkJBRG9BeUFnTEEwQkJBQ0FDUVFKcUlnUTJBdVFJQWtBQ1FBSkFBa0FDUUFKQUlBSkJBQ2dDNkFoUERRQWdCQzhCQUNJRFFYZHFRUVZKRFFVQ1FBSkFBa0FDUUFKQUFrQUNRQUpBQWtBQ1FDQURRV0JxRGdvUERnZ09EZzRPQndFQ0FBc0NRQUpBQWtBQ1FDQURRYUIvYWc0S0NCRVJBeEVCRVJFUkFnQUxJQU5CaFg5cURnTUZFQVlMQzBFQUx3SE1DQTBQSUFRUUVVVU5EeUFDUVFScVFmZ0FRZkFBUWU4QVFmSUFRZlFBRUJKRkRROFFFd3dQQ3lBRUVCRkZEUTRnQWtFRWFrSHRBRUh3QUVIdkFFSHlBRUgwQUJBU1JRME9FQlFNRGdzZ0JCQVJSUTBOSUFJdkFRcEI4d0JIRFEwZ0FpOEJDRUh6QUVjTkRTQUNMd0VHUWVFQVJ3ME5JQUl2QVFSQjdBQkhEUTBnQWk4QkRDSUVRWGRxSWdKQkYwc05DMEVCSUFKMFFaK0FnQVJ4UlEwTERBd0xRUUJCQUM4QnpBZ2lBa0VCYWpzQnpBaEJBQ2dDM0FnZ0FrRUNkR3BCQUNnQzBBZzJBZ0FNREF0QkFDOEJ6QWdpQWtVTkNFRUFJQUpCZjJvaUF6c0J6QWhCQUNnQ3NBZ2lBa1VOQ3lBQ0tBSVVRUUFvQXR3SUlBTkIvLzhEY1VFQ2RHb29BZ0JIRFFzQ1FDQUNLQUlFRFFBZ0FpQUVOZ0lFQ3lBQ0lBUTJBZ3hCQUVFQU5nS3dDQXdMQ3dKQVFRQW9BdEFJSWdRdkFRQkJLVWNOQUVFQUtBS2tDQ0lDUlEwQUlBSW9BZ1FnQkVjTkFFRUFRUUFvQXFnSUlnSTJBcVFJQWtBZ0FrVU5BQ0FDUVFBMkFod01BUXRCQUVFQU5nS1VDQXNnQVVFQUx3SE1DQ0lDYWtFQUxRRGdDRG9BQUVFQUlBSkJBV283QWN3SVFRQW9BdHdJSUFKQkFuUnFJQVEyQWdCQkFFRUFPZ0RnQ0F3S0MwRUFMd0hNQ0NJQ1JRMEdRUUFnQWtGL2FpSURPd0hNQ0NBQ1FRQXZBYzRJSWdSSERRRkJBRUVBTHdIS0NFRi9haUlDT3dIS0NFRUFRUUFvQXRnSUlBSkIvLzhEY1VFQmRHb3ZBUUE3QWM0SUN4QVhEQWdMSUFSQi8vOERSZzBISUFOQi8vOERjU0FFU1EwRURBY0xRU2NRR0F3R0MwRWlFQmdNQlFzZ0EwRXZSdzBFQWtBQ1FDQUNMd0VFSWdKQktrWU5BQ0FDUVM5SERRRVFGUXdIQzBFQkVCWU1CZ3NDUUFKQUFrQUNRRUVBS0FMUUNDSUVMd0VBSWdJUUdVVU5BQUpBQWtBQ1FDQUNRVlZxRGdRQkJRSUFCUXNnQkVGK2FpOEJBRUZRYWtILy93TnhRUXBKRFFNTUJBc2dCRUYrYWk4QkFFRXJSZzBDREFNTElBUkJmbW92QVFCQkxVWU5BUXdDQ3dKQUlBSkIvUUJHRFFBZ0FrRXBSdzBCUVFBb0F0d0lRUUF2QWN3SVFRSjBhaWdDQUJBYVJRMEJEQUlMUVFBb0F0d0lRUUF2QWN3SUlnTkJBblJxS0FJQUVCc05BU0FCSUFOcUxRQUFEUUVMSUFRUUhBMEFJQUpGRFFCQkFTRUVJQUpCTDBaQkFDMEExQWhCQUVkeFJRMEJDeEFkUVFBaEJBdEJBQ0FFT2dEVUNBd0VDMEVBTHdIT0NFSC8vd05HUVFBdkFjd0lSWEZCQUMwQXRBaEZjU0VEREFZTEVCNUJBQ0VEREFVTElBUkJvQUZIRFFFTFFRQkJBVG9BNEFnTFFRQkJBQ2dDNUFnMkF0QUlDMEVBS0FMa0NDRUNEQUFMQ3lBQlFZRHdBR29rQUNBREN4MEFBa0JCQUNnQ2tBZ2dBRWNOQUVFQkR3c2dBRUYrYWk4QkFCQWZDejhCQVg5QkFDRUdBa0FnQUM4QkNDQUZSdzBBSUFBdkFRWWdCRWNOQUNBQUx3RUVJQU5IRFFBZ0FDOEJBaUFDUncwQUlBQXZBUUFnQVVZaEJnc2dCZ3ZVQmdFRWYwRUFRUUFvQXVRSUlnQkJER29pQVRZQzVBaEJBUkFuSVFJQ1FBSkFBa0FDUUFKQVFRQW9BdVFJSWdNZ0FVY05BQ0FDRUN0RkRRRUxBa0FDUUFKQUFrQUNRQ0FDUVo5L2FnNE1CZ0VEQ0FFSEFRRUJBUUVFQUFzQ1FBSkFJQUpCS2tZTkFDQUNRZllBUmcwRklBSkIrd0JIRFFKQkFDQURRUUpxTmdMa0NFRUJFQ2NoQTBFQUtBTGtDQ0VCQTBBQ1FBSkFJQU5CLy84RGNTSUNRU0pHRFFBZ0FrRW5SZzBBSUFJUUtocEJBQ2dDNUFnaEFnd0JDeUFDRUJoQkFFRUFLQUxrQ0VFQ2FpSUNOZ0xrQ0F0QkFSQW5HZ0pBSUFFZ0FoQXNJZ05CTEVjTkFFRUFRUUFvQXVRSVFRSnFOZ0xrQ0VFQkVDY2hBd3RCQUNnQzVBZ2hBZ0pBSUFOQi9RQkdEUUFnQWlBQlJnMEZJQUloQVNBQ1FRQW9BdWdJVFEwQkRBVUxDMEVBSUFKQkFtbzJBdVFJREFFTFFRQWdBMEVDYWpZQzVBaEJBUkFuR2tFQUtBTGtDQ0lDSUFJUUxCb0xRUUVRSnlFQ0MwRUFLQUxrQ0NFREFrQWdBa0htQUVjTkFDQURMd0VHUWUwQVJ3MEFJQU12QVFSQjd3QkhEUUFnQXk4QkFrSHlBRWNOQUVFQUlBTkJDR28yQXVRSUlBQkJBUkFuRUNnUEMwRUFJQU5CZm1vMkF1UUlEQU1MRUI0UEN3SkFJQU12QVFoQjh3QkhEUUFnQXk4QkJrSHpBRWNOQUNBREx3RUVRZUVBUncwQUlBTXZBUUpCN0FCSERRQWdBeThCQ2hBZlJRMEFRUUFnQTBFS2FqWUM1QWhCQVJBbklRSkJBQ2dDNUFnaEF5QUNFQ29hSUFOQkFDZ0M1QWdRQWtFQVFRQW9BdVFJUVg1cU5nTGtDQThMUVFBZ0EwRUVhaUlETmdMa0NBdEJBQ0FEUVFScUlnSTJBdVFJUVFCQkFEb0F5QWdEUUVFQUlBSkJBbW8yQXVRSVFRRVFKeUVEUVFBb0F1UUlJUUlDUUNBREVDcEJJSEpCK3dCSERRQkJBRUVBS0FMa0NFRithallDNUFnUEMwRUFLQUxrQ0NJRElBSkdEUUVnQWlBREVBSUNRRUVCRUNjaUFrRXNSZzBBQWtBZ0FrRTlSdzBBUVFCQkFDZ0M1QWhCZm1vMkF1UUlEd3RCQUVFQUtBTGtDRUYrYWpZQzVBZ1BDMEVBS0FMa0NDRUNEQUFMQ3c4TFFRQWdBMEVLYWpZQzVBaEJBUkFuR2tFQUtBTGtDQ0VEQzBFQUlBTkJFR28yQXVRSUFrQkJBUkFuSWdKQktrY05BRUVBUVFBb0F1UUlRUUpxTmdMa0NFRUJFQ2NoQWd0QkFDZ0M1QWdoQXlBQ0VDb2FJQU5CQUNnQzVBZ1FBa0VBUVFBb0F1UUlRWDVxTmdMa0NBOExJQU1nQTBFT2FoQUNDNjRHQVFSL1FRQkJBQ2dDNUFnaUFFRU1haUlCTmdMa0NBSkFBa0FDUUFKQUFrQUNRQUpBQWtBQ1FBSkFRUUVRSnlJQ1FWbHFEZ2dDQ0FFQ0FRRUJCd0FMSUFKQklrWU5BU0FDUWZzQVJnMENDMEVBS0FMa0NDQUJSZzBIQzBFQUx3SE1DQTBCUVFBb0F1UUlJUUpCQUNnQzZBZ2hBd05BSUFJZ0EwOE5CQUpBQWtBZ0FpOEJBQ0lCUVNkR0RRQWdBVUVpUncwQkN5QUFJQUVRS0E4TFFRQWdBa0VDYWlJQ05nTGtDQXdBQ3d0QkFDZ0M1QWdoQWtFQUx3SE1DQTBCQWtBRFFBSkFBa0FDUUNBQ1FRQW9BdWdJVHcwQVFRRVFKeUlDUVNKR0RRRWdBa0VuUmcwQklBSkIvUUJIRFFKQkFFRUFLQUxrQ0VFQ2FqWUM1QWdMUVFFUUp4cEJBQ2dDNUFnaUFpOEJCa0h0QUVjTkJpQUNMd0VFUWU4QVJ3MEdJQUl2QVFKQjhnQkhEUVlnQWk4QkFFSG1BRWNOQmtFQUlBSkJDR28yQXVRSVFRRVFKeUlDUVNKR0RRTWdBa0VuUmcwRERBWUxJQUlRR0F0QkFFRUFLQUxrQ0VFQ2FpSUNOZ0xrQ0F3QUN3c2dBQ0FDRUNnTUJRdEJBRUVBS0FMa0NFRithallDNUFnUEMwRUFJQUpCZm1vMkF1UUlEd3NRSGc4TFFRQkJBQ2dDNUFoQkFtbzJBdVFJUVFFUUowSHRBRWNOQVVFQUtBTGtDQ0lDTHdFR1FlRUFSdzBCSUFJdkFRUkI5QUJIRFFFZ0FpOEJBa0hsQUVjTkFVRUFLQUxRQ0M4QkFFRXVSZzBCSUFBZ0FDQUNRUWhxUVFBb0FvZ0lFQUVQQzBFQUtBTGNDRUVBTHdITUNDSUNRUUowYWlBQU5nSUFRUUFnQWtFQmFqc0J6QWhCQUNnQzBBZ3ZBUUJCTGtZTkFDQUFRUUFvQXVRSVFRSnFRUUFnQUJBQlFRQkJBQ2dDcEFnMkFyQUlRUUJCQUNnQzVBaEJBbW8yQXVRSUFrQkJBUkFuSWdKQklrWU5BQ0FDUVNkR0RRQkJBRUVBS0FMa0NFRithallDNUFnUEN5QUNFQmhCQUVFQUtBTGtDRUVDYWpZQzVBZ0NRQUpBQWtCQkFSQW5RVmRxRGdRQkFnSUFBZ3RCQUNnQ3BBaEJBQ2dDNUFnaUFqWUNCRUVBSUFKQkFtbzJBdVFJUVFFUUp4cEJBQ2dDcEFnaUFrRUJPZ0FZSUFKQkFDZ0M1QWdpQVRZQ0VFRUFJQUZCZm1vMkF1UUlEd3RCQUNnQ3BBZ2lBa0VCT2dBWUlBSkJBQ2dDNUFnaUFUWUNEQ0FDSUFFMkFnUkJBRUVBTHdITUNFRi9hanNCekFnUEMwRUFRUUFvQXVRSVFYNXFOZ0xrQ0E4TEMwY0JBMzlCQUNnQzVBaEJBbW9oQUVFQUtBTG9DQ0VCQWtBRFFDQUFJZ0pCZm1vZ0FVOE5BU0FDUVFKcUlRQWdBaThCQUVGMmFnNEVBUUFBQVFBTEMwRUFJQUkyQXVRSUM1Z0JBUU4vUVFCQkFDZ0M1QWdpQVVFQ2FqWUM1QWdnQVVFR2FpRUJRUUFvQXVnSUlRSURRQUpBQWtBQ1FDQUJRWHhxSUFKUERRQWdBVUYrYWk4QkFDRURBa0FDUUNBQURRQWdBMEVxUmcwQklBTkJkbW9PQkFJRUJBSUVDeUFEUVNwSERRTUxJQUV2QVFCQkwwY05Ba0VBSUFGQmZtbzJBdVFJREFFTElBRkJmbW9oQVF0QkFDQUJOZ0xrQ0E4TElBRkJBbW9oQVF3QUN3dS9BUUVFZjBFQUtBTGtDQ0VBUVFBb0F1Z0lJUUVDUUFKQUEwQWdBQ0lDUVFKcUlRQWdBaUFCVHcwQkFrQUNRQ0FBTHdFQUlnTkJwSDlxRGdVQkFnSUNCQUFMSUFOQkpFY05BU0FDTHdFRVFmc0FSdzBCUVFCQkFDOEJ5Z2dpQUVFQmFqc0J5Z2hCQUNnQzJBZ2dBRUVCZEdwQkFDOEJ6Z2c3QVFCQkFDQUNRUVJxTmdMa0NFRUFRUUF2QWN3SVFRRnFJZ0E3QWM0SVFRQWdBRHNCekFnUEN5QUNRUVJxSVFBTUFBc0xRUUFnQURZQzVBZ1FIZzhMUVFBZ0FEWUM1QWdMaUFFQkJIOUJBQ2dDNUFnaEFVRUFLQUxvQ0NFQ0FrQUNRQU5BSUFFaUEwRUNhaUVCSUFNZ0FrOE5BU0FCTHdFQUlnUWdBRVlOQWdKQUlBUkIzQUJHRFFBZ0JFRjJhZzRFQWdFQkFnRUxJQU5CQkdvaEFTQURMd0VFUVExSERRQWdBMEVHYWlBQklBTXZBUVpCQ2tZYklRRU1BQXNMUVFBZ0FUWUM1QWdRSGc4TFFRQWdBVFlDNUFnTGJBRUJmd0pBQWtBZ0FFRmZhaUlCUVFWTERRQkJBU0FCZEVFeGNRMEJDeUFBUVVacVFmLy9BM0ZCQmtrTkFDQUFRU2xISUFCQldHcEIvLzhEY1VFSFNYRU5BQUpBSUFCQnBYOXFEZ1FCQUFBQkFBc2dBRUg5QUVjZ0FFR0ZmMnBCLy84RGNVRUVTWEVQQzBFQkN6MEJBWDlCQVNFQkFrQWdBRUgzQUVIb0FFSHBBRUhzQUVIbEFCQWdEUUFnQUVIbUFFSHZBRUh5QUJBaERRQWdBRUhwQUVIbUFCQWlJUUVMSUFFTG13RUJBbjlCQVNFQkFrQUNRQUpBQWtBQ1FBSkFJQUF2QVFBaUFrRkZhZzRFQlFRRUFRQUxBa0FnQWtHYmYyb09CQU1FQkFJQUN5QUNRU2xHRFFRZ0FrSDVBRWNOQXlBQVFYNXFRZVlBUWVrQVFlNEFRZUVBUWV3QVFld0FFQ01QQ3lBQVFYNXFMd0VBUVQxR0R3c2dBRUYrYWtIakFFSGhBRUgwQUVIakFCQWtEd3NnQUVGK2FrSGxBRUhzQUVIekFCQWhEd3RCQUNFQkN5QUJDOUlEQVFKL1FRQWhBUUpBQWtBQ1FBSkFBa0FDUUFKQUFrQUNRQ0FBTHdFQVFaeC9hZzRVQUFFQ0NBZ0lDQWdJQ0FNRUNBZ0ZDQVlJQ0FjSUN3SkFBa0FnQUVGK2FpOEJBRUdYZjJvT0JBQUpDUUVKQ3lBQVFYeHFRZllBUWU4QUVDSVBDeUFBUVh4cVFma0FRZWtBUWVVQUVDRVBDd0pBQWtBZ0FFRithaThCQUVHTmYyb09BZ0FCQ0FzQ1FDQUFRWHhxTHdFQUlnSkI0UUJHRFFBZ0FrSHNBRWNOQ0NBQVFYcHFRZVVBRUNVUEN5QUFRWHBxUWVNQUVDVVBDeUFBUVh4cVFlUUFRZVVBUWV3QVFlVUFFQ1FQQ3lBQVFYNXFMd0VBUWU4QVJ3MEZJQUJCZkdvdkFRQkI1UUJIRFFVQ1FDQUFRWHBxTHdFQUlnSkI4QUJHRFFBZ0FrSGpBRWNOQmlBQVFYaHFRZWtBUWU0QVFmTUFRZlFBUWVFQVFlNEFFQ01QQ3lBQVFYaHFRZlFBUWZrQUVDSVBDMEVCSVFFZ0FFRithaUlBUWVrQUVDVU5CQ0FBUWZJQVFlVUFRZlFBUWZVQVFmSUFFQ0FQQ3lBQVFYNXFRZVFBRUNVUEN5QUFRWDVxUWVRQVFlVUFRZUlBUWZVQVFlY0FRZWNBUWVVQUVDWVBDeUFBUVg1cVFlRUFRZmNBUWVFQVFla0FFQ1FQQ3dKQUlBQkJmbW92QVFBaUFrSHZBRVlOQUNBQ1FlVUFSdzBCSUFCQmZHcEI3Z0FRSlE4TElBQkJmR3BCOUFCQjZBQkI4Z0FRSVNFQkN5QUJDM0FCQW44Q1FBSkFBMEJCQUVFQUtBTGtDQ0lBUVFKcUlnRTJBdVFJSUFCQkFDZ0M2QWhQRFFFQ1FBSkFBa0FnQVM4QkFDSUJRYVYvYWc0Q0FRSUFDd0pBSUFGQmRtb09CQVFEQXdRQUN5QUJRUzlIRFFJTUJBc1FMUm9NQVF0QkFDQUFRUVJxTmdMa0NBd0FDd3NRSGdzTE5RRUJmMEVBUVFFNkFMUUlRUUFvQXVRSUlRQkJBRUVBS0FMb0NFRUNhallDNUFoQkFDQUFRUUFvQXBBSWEwRUJkVFlDeEFnTE5BRUJmMEVCSVFFQ1FDQUFRWGRxUWYvL0EzRkJCVWtOQUNBQVFZQUJja0dnQVVZTkFDQUFRUzVISUFBUUszRWhBUXNnQVF0SkFRTi9RUUFoQmdKQUlBQkJlR29pQjBFQUtBS1FDQ0lJU1EwQUlBY2dBU0FDSUFNZ0JDQUZFQkpGRFFBQ1FDQUhJQWhIRFFCQkFROExJQUJCZG1vdkFRQVFIeUVHQ3lBR0Mxa0JBMzlCQUNFRUFrQWdBRUY4YWlJRlFRQW9BcEFJSWdaSkRRQWdBQzhCQUNBRFJ3MEFJQUJCZm1vdkFRQWdBa2NOQUNBRkx3RUFJQUZIRFFBQ1FDQUZJQVpIRFFCQkFROExJQUJCZW1vdkFRQVFIeUVFQ3lBRUMwd0JBMzlCQUNFREFrQWdBRUYrYWlJRVFRQW9BcEFJSWdWSkRRQWdBQzhCQUNBQ1J3MEFJQVF2QVFBZ0FVY05BQUpBSUFRZ0JVY05BRUVCRHdzZ0FFRjhhaThCQUJBZklRTUxJQU1MU3dFRGYwRUFJUWNDUUNBQVFYWnFJZ2hCQUNnQ2tBZ2lDVWtOQUNBSUlBRWdBaUFESUFRZ0JTQUdFQzVGRFFBQ1FDQUlJQWxIRFFCQkFROExJQUJCZEdvdkFRQVFIeUVIQ3lBSEMyWUJBMzlCQUNFRkFrQWdBRUY2YWlJR1FRQW9BcEFJSWdkSkRRQWdBQzhCQUNBRVJ3MEFJQUJCZm1vdkFRQWdBMGNOQUNBQVFYeHFMd0VBSUFKSERRQWdCaThCQUNBQlJ3MEFBa0FnQmlBSFJ3MEFRUUVQQ3lBQVFYaHFMd0VBRUI4aEJRc2dCUXM5QVFKL1FRQWhBZ0pBUVFBb0FwQUlJZ01nQUVzTkFDQUFMd0VBSUFGSERRQUNRQ0FESUFCSERRQkJBUThMSUFCQmZtb3ZBUUFRSHlFQ0N5QUNDMDBCQTM5QkFDRUlBa0FnQUVGMGFpSUpRUUFvQXBBSUlncEpEUUFnQ1NBQklBSWdBeUFFSUFVZ0JpQUhFQzlGRFFBQ1FDQUpJQXBIRFFCQkFROExJQUJCY21vdkFRQVFIeUVJQ3lBSUM1d0JBUU4vUVFBb0F1UUlJUUVDUUFOQUFrQUNRQ0FCTHdFQUlnSkJMMGNOQUFKQUlBRXZBUUlpQVVFcVJnMEFJQUZCTDBjTkJCQVZEQUlMSUFBUUZnd0JDd0pBQWtBZ0FFVU5BQ0FDUVhkcUlnRkJGMHNOQVVFQklBRjBRWitBZ0FSeFJRMEJEQUlMSUFJUUtVVU5Bd3dCQ3lBQ1FhQUJSdzBDQzBFQVFRQW9BdVFJSWdOQkFtb2lBVFlDNUFnZ0EwRUFLQUxvQ0VrTkFBc0xJQUlMeXdNQkFYOENRQ0FCUVNKR0RRQWdBVUVuUmcwQUVCNFBDMEVBS0FMa0NDRUNJQUVRR0NBQUlBSkJBbXBCQUNnQzVBaEJBQ2dDaEFnUUFVRUFRUUFvQXVRSVFRSnFOZ0xrQ0VFQUVDY2hBRUVBS0FMa0NDRUJBa0FDUUNBQVFlRUFSdzBBSUFGQkFtcEI4d0JCOHdCQjVRQkI4Z0JCOUFBUUVnMEJDMEVBSUFGQmZtbzJBdVFJRHd0QkFDQUJRUXhxTmdMa0NBSkFRUUVRSjBIN0FFWU5BRUVBSUFFMkF1UUlEd3RCQUNnQzVBZ2lBaUVBQTBCQkFDQUFRUUpxTmdMa0NBSkFBa0FDUUVFQkVDY2lBRUVpUmcwQUlBQkJKMGNOQVVFbkVCaEJBRUVBS0FMa0NFRUNhallDNUFoQkFSQW5JUUFNQWd0QkloQVlRUUJCQUNnQzVBaEJBbW8yQXVRSVFRRVFKeUVBREFFTElBQVFLaUVBQ3dKQUlBQkJPa1lOQUVFQUlBRTJBdVFJRHd0QkFFRUFLQUxrQ0VFQ2FqWUM1QWdDUUVFQkVDY2lBRUVpUmcwQUlBQkJKMFlOQUVFQUlBRTJBdVFJRHdzZ0FCQVlRUUJCQUNnQzVBaEJBbW8yQXVRSUFrQUNRRUVCRUNjaUFFRXNSZzBBSUFCQi9RQkdEUUZCQUNBQk5nTGtDQThMUVFCQkFDZ0M1QWhCQW1vMkF1UUlRUUVRSjBIOUFFWU5BRUVBS0FMa0NDRUFEQUVMQzBFQUtBS2tDQ0lCSUFJMkFoQWdBVUVBS0FMa0NFRUNhallDREFzd0FRRi9Ba0FDUUNBQVFYZHFJZ0ZCRjBzTkFFRUJJQUYwUVkyQWdBUnhEUUVMSUFCQm9BRkdEUUJCQUE4TFFRRUxiUUVDZndKQUFrQURRQUpBSUFCQi8vOERjU0lCUVhkcUlnSkJGMHNOQUVFQklBSjBRWitBZ0FSeERRSUxJQUZCb0FGR0RRRWdBQ0VDSUFFUUt3MENRUUFoQWtFQVFRQW9BdVFJSWdCQkFtbzJBdVFJSUFBdkFRSWlBQTBBREFJTEN5QUFJUUlMSUFKQi8vOERjUXRvQVFKL1FRRWhBUUpBQWtBZ0FFRmZhaUlDUVFWTERRQkJBU0FDZEVFeGNRMEJDeUFBUWZqL0EzRkJLRVlOQUNBQVFVWnFRZi8vQTNGQkJra05BQUpBSUFCQnBYOXFJZ0pCQTBzTkFDQUNRUUZIRFFFTElBQkJoWDlxUWYvL0EzRkJCRWtoQVFzZ0FRdUxBUUVDZndKQVFRQW9BdVFJSWdJdkFRQWlBMEhoQUVjTkFFRUFJQUpCQkdvMkF1UUlRUUVRSnlFQ1FRQW9BdVFJSVFBQ1FBSkFJQUpCSWtZTkFDQUNRU2RHRFFBZ0FoQXFHa0VBS0FMa0NDRUJEQUVMSUFJUUdFRUFRUUFvQXVRSVFRSnFJZ0UyQXVRSUMwRUJFQ2NoQTBFQUtBTGtDQ0VDQ3dKQUlBSWdBRVlOQUNBQUlBRVFBZ3NnQXd0eUFRUi9RUUFvQXVRSUlRQkJBQ2dDNkFnaEFRSkFBa0FEUUNBQVFRSnFJUUlnQUNBQlR3MEJBa0FDUUNBQ0x3RUFJZ05CcEg5cURnSUJCQUFMSUFJaEFDQURRWFpxRGdRQ0FRRUNBUXNnQUVFRWFpRUFEQUFMQzBFQUlBSTJBdVFJRUI1QkFBOExRUUFnQWpZQzVBaEIzUUFMU1FFQmYwRUFJUWNDUUNBQUx3RUtJQVpIRFFBZ0FDOEJDQ0FGUncwQUlBQXZBUVlnQkVjTkFDQUFMd0VFSUFOSERRQWdBQzhCQWlBQ1J3MEFJQUF2QVFBZ0FVWWhCd3NnQnd0VEFRRi9RUUFoQ0FKQUlBQXZBUXdnQjBjTkFDQUFMd0VLSUFaSERRQWdBQzhCQ0NBRlJ3MEFJQUF2QVFZZ0JFY05BQ0FBTHdFRUlBTkhEUUFnQUM4QkFpQUNSdzBBSUFBdkFRQWdBVVloQ0FzZ0NBc0xId0lBUVlBSUN3SUFBQUJCaEFnTEVBRUFBQUFDQUFBQUFBUUFBSEE0QUFBPVwiLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBCdWZmZXI/QnVmZmVyLmZyb20oRSxcImJhc2U2NFwiKTpVaW50OEFycmF5LmZyb20oYXRvYihFKSxBPT5BLmNoYXJDb2RlQXQoMCkpKSkudGhlbihXZWJBc3NlbWJseS5pbnN0YW50aWF0ZSkudGhlbigoe2V4cG9ydHM6QX0pPT57Qj1BfSk7dmFyIEU7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHRpZDogbW9kdWxlSWQsXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbi8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBfX3dlYnBhY2tfbW9kdWxlc19fO1xuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18uZyA9IChmdW5jdGlvbigpIHtcblx0aWYgKHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JykgcmV0dXJuIGdsb2JhbFRoaXM7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIHRoaXMgfHwgbmV3IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcpIHJldHVybiB3aW5kb3c7XG5cdH1cbn0pKCk7IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsInZhciBzY3JpcHRVcmw7XG5pZiAoX193ZWJwYWNrX3JlcXVpcmVfXy5nLmltcG9ydFNjcmlwdHMpIHNjcmlwdFVybCA9IF9fd2VicGFja19yZXF1aXJlX18uZy5sb2NhdGlvbiArIFwiXCI7XG52YXIgZG9jdW1lbnQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fLmcuZG9jdW1lbnQ7XG5pZiAoIXNjcmlwdFVybCAmJiBkb2N1bWVudCkge1xuXHRpZiAoZG9jdW1lbnQuY3VycmVudFNjcmlwdClcblx0XHRzY3JpcHRVcmwgPSBkb2N1bWVudC5jdXJyZW50U2NyaXB0LnNyY1xuXHRpZiAoIXNjcmlwdFVybCkge1xuXHRcdHZhciBzY3JpcHRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzY3JpcHRcIik7XG5cdFx0aWYoc2NyaXB0cy5sZW5ndGgpIHNjcmlwdFVybCA9IHNjcmlwdHNbc2NyaXB0cy5sZW5ndGggLSAxXS5zcmNcblx0fVxufVxuLy8gV2hlbiBzdXBwb3J0aW5nIGJyb3dzZXJzIHdoZXJlIGFuIGF1dG9tYXRpYyBwdWJsaWNQYXRoIGlzIG5vdCBzdXBwb3J0ZWQgeW91IG11c3Qgc3BlY2lmeSBhbiBvdXRwdXQucHVibGljUGF0aCBtYW51YWxseSB2aWEgY29uZmlndXJhdGlvblxuLy8gb3IgcGFzcyBhbiBlbXB0eSBzdHJpbmcgKFwiXCIpIGFuZCBzZXQgdGhlIF9fd2VicGFja19wdWJsaWNfcGF0aF9fIHZhcmlhYmxlIGZyb20geW91ciBjb2RlIHRvIHVzZSB5b3VyIG93biBsb2dpYy5cbmlmICghc2NyaXB0VXJsKSB0aHJvdyBuZXcgRXJyb3IoXCJBdXRvbWF0aWMgcHVibGljUGF0aCBpcyBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlclwiKTtcbnNjcmlwdFVybCA9IHNjcmlwdFVybC5yZXBsYWNlKC8jLiokLywgXCJcIikucmVwbGFjZSgvXFw/LiokLywgXCJcIikucmVwbGFjZSgvXFwvW15cXC9dKyQvLCBcIi9cIik7XG5fX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBzY3JpcHRVcmw7IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5iID0gZG9jdW1lbnQuYmFzZVVSSSB8fCBzZWxmLmxvY2F0aW9uLmhyZWY7XG5cbi8vIG9iamVjdCB0byBzdG9yZSBsb2FkZWQgYW5kIGxvYWRpbmcgY2h1bmtzXG4vLyB1bmRlZmluZWQgPSBjaHVuayBub3QgbG9hZGVkLCBudWxsID0gY2h1bmsgcHJlbG9hZGVkL3ByZWZldGNoZWRcbi8vIFtyZXNvbHZlLCByZWplY3QsIFByb21pc2VdID0gY2h1bmsgbG9hZGluZywgMCA9IGNodW5rIGxvYWRlZFxudmFyIGluc3RhbGxlZENodW5rcyA9IHtcblx0XCJtYWluXCI6IDBcbn07XG5cbi8vIG5vIGNodW5rIG9uIGRlbWFuZCBsb2FkaW5nXG5cbi8vIG5vIHByZWZldGNoaW5nXG5cbi8vIG5vIHByZWxvYWRlZFxuXG4vLyBubyBITVJcblxuLy8gbm8gSE1SIG1hbmlmZXN0XG5cbi8vIG5vIG9uIGNodW5rcyBsb2FkZWRcblxuLy8gbm8ganNvbnAgZnVuY3Rpb24iLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm5jID0gdW5kZWZpbmVkOyIsImltcG9ydCB7IGluaXQgfSBmcm9tICdlcy1tb2R1bGUtbGV4ZXInO1xuaW1wb3J0IGluaXRpYWxQYWdlIGZyb20gJy4vaW5pdGlhbHBhZ2UnO1xuaW1wb3J0IGNyZWF0ZUZvb3RlciBmcm9tICcuL2Zvb3Rlcic7XG5pbXBvcnQgY3JlYXRlTWVudSBmcm9tICcuL21lbnUnO1xuXG5jb25zdCBjb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NvbnRlbnQnKTtcblxuY3JlYXRlTWVudShjb250ZW50KTtcbmNyZWF0ZUZvb3Rlcihjb250ZW50KTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==