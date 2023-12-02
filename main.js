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
___CSS_LOADER_EXPORT___.push([module.id, ".glow {\n  background-color: black;\n  border-style: solid;\n  border-color: green;\n  border-width: 5px;\n  \n  box-shadow: 0 0 40px black;\n}\n\n.navButton {\n  background-color: green;\n  color: black;\n\n  border-radius: 5px;\n  border-width: 0px;\n\n  font-size: x-large;\n  font-weight: bold;\n  padding: 5px;\n}\n\n.navButton:hover {\n  background-color: black;\n  color: green;\n\n  outline-style: solid;\n  outline-width: 2px;\n}\n\n.footer {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 10px;\n  padding: 10px;\n  width: 900px;\n}\n\n@media only screen and (max-width: 1000px) {\n  .navButton{\n    font-size: larger;\n  }\n}", "",{"version":3,"sources":["webpack://./src/global.css"],"names":[],"mappings":"AAAA;EACE,uBAAuB;EACvB,mBAAmB;EACnB,mBAAmB;EACnB,iBAAiB;;EAEjB,0BAA0B;AAC5B;;AAEA;EACE,uBAAuB;EACvB,YAAY;;EAEZ,kBAAkB;EAClB,iBAAiB;;EAEjB,kBAAkB;EAClB,iBAAiB;EACjB,YAAY;AACd;;AAEA;EACE,uBAAuB;EACvB,YAAY;;EAEZ,oBAAoB;EACpB,kBAAkB;AACpB;;AAEA;EACE,aAAa;EACb,uBAAuB;EACvB,mBAAmB;EACnB,SAAS;EACT,aAAa;EACb,YAAY;AACd;;AAEA;EACE;IACE,iBAAiB;EACnB;AACF","sourcesContent":[".glow {\n  background-color: black;\n  border-style: solid;\n  border-color: green;\n  border-width: 5px;\n  \n  box-shadow: 0 0 40px black;\n}\n\n.navButton {\n  background-color: green;\n  color: black;\n\n  border-radius: 5px;\n  border-width: 0px;\n\n  font-size: x-large;\n  font-weight: bold;\n  padding: 5px;\n}\n\n.navButton:hover {\n  background-color: black;\n  color: green;\n\n  outline-style: solid;\n  outline-width: 2px;\n}\n\n.footer {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 10px;\n  padding: 10px;\n  width: 900px;\n}\n\n@media only screen and (max-width: 1000px) {\n  .navButton{\n    font-size: larger;\n  }\n}"],"sourceRoot":""}]);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSx3QkFBd0IsbUJBQU8sQ0FBQyxxREFBUzs7QUFFekM7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBLEdBQUc7O0FBRUg7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7Ozs7Ozs7Ozs7QUNYQSxpQkFBaUIsbUJBQU8sQ0FBQyxxR0FBd0M7QUFDakUsYUFBYSw0SEFBbUQ7QUFDaEUsWUFBWSxtQkFBTyxDQUFDLDJJQUEyRDtBQUMvRSxXQUFXLG1CQUFPLENBQUMsbUJBQU07QUFDekIsVUFBVSxtQkFBTyxDQUFDLHNGQUErQjs7QUFFakQsd0JBQXdCLG1CQUFPLENBQUMscURBQVM7QUFDekMsWUFBWSxtQkFBTyxDQUFDLHFEQUFTO0FBQzdCLFVBQVUsbUJBQU8sQ0FBQyxzREFBUTs7QUFFMUI7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQ0FBb0MsUUFBUTtBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxrQkFBa0Isa0JBQWtCO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQSx1Q0FBdUMsbUJBQW1CO0FBQzFEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULFFBQVE7QUFDUjtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQixxQkFBcUI7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBOzs7OztXQ2ZBOztXQUVBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7V0FFQTs7Ozs7V0NyQkE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0F1QztBQUNIO0FBQ0k7QUFDSjtBQUNKOztBQUVoQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxJQUFJLHdEQUFXO0FBQ2YsSUFBSSxtREFBWTtBQUNoQjtBQUNBOztBQUVBO0FBQ0E7QUFDQSxJQUFJLGlEQUFVO0FBQ2QsSUFBSSxtREFBWTtBQUNoQjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvYnJvd3NlcnNsaXN0L2Jyb3dzZXIuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvYnJvd3NlcnNsaXN0L2Vycm9yLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJzbGlzdC9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9icm93c2Vyc2xpc3QvcGFyc2UuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY2FsbC1iaW5kL2NhbGxCb3VuZC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYWxsLWJpbmQvaW5kZXguanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY2FuaXVzZS1saXRlL2RhdGEvYWdlbnRzLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nhbml1c2UtbGl0ZS9kYXRhL2Jyb3dzZXJWZXJzaW9ucy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYW5pdXNlLWxpdGUvZGF0YS9icm93c2Vycy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jYW5pdXNlLWxpdGUvZGlzdC91bnBhY2tlci9hZ2VudHMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY2FuaXVzZS1saXRlL2Rpc3QvdW5wYWNrZXIvYnJvd3NlclZlcnNpb25zLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nhbml1c2UtbGl0ZS9kaXN0L3VucGFja2VyL2Jyb3dzZXJzLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL2dsb2JhbC5jc3MiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvaW5pdGlhbFBhZ2UuY3NzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL21lbnUuY3NzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9nZXRVcmwuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9tZW51LmNzdiIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9lbGVjdHJvbi10by1jaHJvbWl1bS92ZXJzaW9ucy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9mdW5jdGlvbi1iaW5kL2ltcGxlbWVudGF0aW9uLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2Z1bmN0aW9uLWJpbmQvaW5kZXguanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvZ2V0LWludHJpbnNpYy9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9oYXMtc3ltYm9scy9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9oYXMtc3ltYm9scy9zaGFtcy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9oYXMvc3JjL2luZGV4LmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL2ludGVybmFsLXNsb3QvaW5kZXguanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvb2JqZWN0LWluc3BlY3QvaW5kZXguanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvYWJvdXQudHh0Iiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vbm9kZV9tb2R1bGVzL3NpZGUtY2hhbm5lbC9pbmRleC5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9nbG9iYWwuY3NzP2QzYmMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvaW5pdGlhbFBhZ2UuY3NzP2E5YTMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9zcmMvbWVudS5jc3M/MTEwYiIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlLy4vc3JjL2Zvb3Rlci5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9pbml0aWFscGFnZS5qcyIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9tZW51LmpzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL2lnbm9yZWR8L1VzZXJzL2pvcnRlZ2EvRG9jdW1lbnRzL0Rldi9PZGluL3Jlc3RhdXJhbnRQYWdlL25vZGVfbW9kdWxlcy9icm93c2Vyc2xpc3R8cGF0aCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS9pZ25vcmVkfC9Vc2Vycy9qb3J0ZWdhL0RvY3VtZW50cy9EZXYvT2Rpbi9yZXN0YXVyYW50UGFnZS9ub2RlX21vZHVsZXMvb2JqZWN0LWluc3BlY3R8Li91dGlsLmluc3BlY3QiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2UvLi9ub2RlX21vZHVsZXMvZXMtbW9kdWxlLWxleGVyL2Rpc3QvbGV4ZXIuanMiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL2NvbXBhdCBnZXQgZGVmYXVsdCBleHBvcnQiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL3dlYnBhY2svcnVudGltZS9nbG9iYWwiLCJ3ZWJwYWNrOi8vcmVzdGF1cmFudHBhZ2Uvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL3dlYnBhY2svcnVudGltZS9wdWJsaWNQYXRoIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL3dlYnBhY2svcnVudGltZS9qc29ucCBjaHVuayBsb2FkaW5nIiwid2VicGFjazovL3Jlc3RhdXJhbnRwYWdlL3dlYnBhY2svcnVudGltZS9ub25jZSIsIndlYnBhY2s6Ly9yZXN0YXVyYW50cGFnZS8uL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgQnJvd3NlcnNsaXN0RXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBsb2FkUXVlcmllczogZnVuY3Rpb24gbG9hZFF1ZXJpZXMoKSB7XG4gICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgJ1NoYXJhYmxlIGNvbmZpZ3MgYXJlIG5vdCBzdXBwb3J0ZWQgaW4gY2xpZW50LXNpZGUgYnVpbGQgb2YgQnJvd3NlcnNsaXN0J1xuICAgIClcbiAgfSxcblxuICBnZXRTdGF0OiBmdW5jdGlvbiBnZXRTdGF0KG9wdHMpIHtcbiAgICByZXR1cm4gb3B0cy5zdGF0c1xuICB9LFxuXG4gIGxvYWRDb25maWc6IGZ1bmN0aW9uIGxvYWRDb25maWcob3B0cykge1xuICAgIGlmIChvcHRzLmNvbmZpZykge1xuICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgICAnQnJvd3NlcnNsaXN0IGNvbmZpZyBhcmUgbm90IHN1cHBvcnRlZCBpbiBjbGllbnQtc2lkZSBidWlsZCdcbiAgICAgIClcbiAgICB9XG4gIH0sXG5cbiAgbG9hZENvdW50cnk6IGZ1bmN0aW9uIGxvYWRDb3VudHJ5KCkge1xuICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICdDb3VudHJ5IHN0YXRpc3RpY3MgYXJlIG5vdCBzdXBwb3J0ZWQgJyArXG4gICAgICAgICdpbiBjbGllbnQtc2lkZSBidWlsZCBvZiBCcm93c2Vyc2xpc3QnXG4gICAgKVxuICB9LFxuXG4gIGxvYWRGZWF0dXJlOiBmdW5jdGlvbiBsb2FkRmVhdHVyZSgpIHtcbiAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAnU3VwcG9ydHMgcXVlcmllcyBhcmUgbm90IGF2YWlsYWJsZSBpbiBjbGllbnQtc2lkZSBidWlsZCBvZiBCcm93c2Vyc2xpc3QnXG4gICAgKVxuICB9LFxuXG4gIGN1cnJlbnROb2RlOiBmdW5jdGlvbiBjdXJyZW50Tm9kZShyZXNvbHZlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHJlc29sdmUoWydtYWludGFpbmVkIG5vZGUgdmVyc2lvbnMnXSwgY29udGV4dClbMF1cbiAgfSxcblxuICBwYXJzZUNvbmZpZzogbm9vcCxcblxuICByZWFkQ29uZmlnOiBub29wLFxuXG4gIGZpbmRDb25maWc6IG5vb3AsXG5cbiAgY2xlYXJDYWNoZXM6IG5vb3AsXG5cbiAgb2xkRGF0YVdhcm5pbmc6IG5vb3Bcbn1cbiIsImZ1bmN0aW9uIEJyb3dzZXJzbGlzdEVycm9yKG1lc3NhZ2UpIHtcbiAgdGhpcy5uYW1lID0gJ0Jyb3dzZXJzbGlzdEVycm9yJ1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlXG4gIHRoaXMuYnJvd3NlcnNsaXN0ID0gdHJ1ZVxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBCcm93c2Vyc2xpc3RFcnJvcilcbiAgfVxufVxuXG5Ccm93c2Vyc2xpc3RFcnJvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGVcblxubW9kdWxlLmV4cG9ydHMgPSBCcm93c2Vyc2xpc3RFcnJvclxuIiwidmFyIGpzUmVsZWFzZXMgPSByZXF1aXJlKCdub2RlLXJlbGVhc2VzL2RhdGEvcHJvY2Vzc2VkL2VudnMuanNvbicpXG52YXIgYWdlbnRzID0gcmVxdWlyZSgnY2FuaXVzZS1saXRlL2Rpc3QvdW5wYWNrZXIvYWdlbnRzJykuYWdlbnRzXG52YXIganNFT0wgPSByZXF1aXJlKCdub2RlLXJlbGVhc2VzL2RhdGEvcmVsZWFzZS1zY2hlZHVsZS9yZWxlYXNlLXNjaGVkdWxlLmpzb24nKVxudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJylcbnZhciBlMmMgPSByZXF1aXJlKCdlbGVjdHJvbi10by1jaHJvbWl1bS92ZXJzaW9ucycpXG5cbnZhciBCcm93c2Vyc2xpc3RFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKVxudmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpXG52YXIgZW52ID0gcmVxdWlyZSgnLi9ub2RlJykgLy8gV2lsbCBsb2FkIGJyb3dzZXIuanMgaW4gd2VicGFja1xuXG52YXIgWUVBUiA9IDM2NS4yNTk2NDEgKiAyNCAqIDYwICogNjAgKiAxMDAwXG52YXIgQU5EUk9JRF9FVkVSR1JFRU5fRklSU1QgPSAzN1xuXG4vLyBIZWxwZXJzXG5cbmZ1bmN0aW9uIGlzVmVyc2lvbnNNYXRjaCh2ZXJzaW9uQSwgdmVyc2lvbkIpIHtcbiAgcmV0dXJuICh2ZXJzaW9uQSArICcuJykuaW5kZXhPZih2ZXJzaW9uQiArICcuJykgPT09IDBcbn1cblxuZnVuY3Rpb24gaXNFb2xSZWxlYXNlZChuYW1lKSB7XG4gIHZhciB2ZXJzaW9uID0gbmFtZS5zbGljZSgxKVxuICByZXR1cm4gYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9ucy5zb21lKGZ1bmN0aW9uIChpKSB7XG4gICAgcmV0dXJuIGlzVmVyc2lvbnNNYXRjaChpLCB2ZXJzaW9uKVxuICB9KVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemUodmVyc2lvbnMpIHtcbiAgcmV0dXJuIHZlcnNpb25zLmZpbHRlcihmdW5jdGlvbiAodmVyc2lvbikge1xuICAgIHJldHVybiB0eXBlb2YgdmVyc2lvbiA9PT0gJ3N0cmluZydcbiAgfSlcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplRWxlY3Ryb24odmVyc2lvbikge1xuICB2YXIgdmVyc2lvblRvVXNlID0gdmVyc2lvblxuICBpZiAodmVyc2lvbi5zcGxpdCgnLicpLmxlbmd0aCA9PT0gMykge1xuICAgIHZlcnNpb25Ub1VzZSA9IHZlcnNpb24uc3BsaXQoJy4nKS5zbGljZSgwLCAtMSkuam9pbignLicpXG4gIH1cbiAgcmV0dXJuIHZlcnNpb25Ub1VzZVxufVxuXG5mdW5jdGlvbiBuYW1lTWFwcGVyKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIG1hcE5hbWUodmVyc2lvbikge1xuICAgIHJldHVybiBuYW1lICsgJyAnICsgdmVyc2lvblxuICB9XG59XG5cbmZ1bmN0aW9uIGdldE1ham9yKHZlcnNpb24pIHtcbiAgcmV0dXJuIHBhcnNlSW50KHZlcnNpb24uc3BsaXQoJy4nKVswXSlcbn1cblxuZnVuY3Rpb24gZ2V0TWFqb3JWZXJzaW9ucyhyZWxlYXNlZCwgbnVtYmVyKSB7XG4gIGlmIChyZWxlYXNlZC5sZW5ndGggPT09IDApIHJldHVybiBbXVxuICB2YXIgbWFqb3JWZXJzaW9ucyA9IHVuaXEocmVsZWFzZWQubWFwKGdldE1ham9yKSlcbiAgdmFyIG1pbmltdW0gPSBtYWpvclZlcnNpb25zW21ham9yVmVyc2lvbnMubGVuZ3RoIC0gbnVtYmVyXVxuICBpZiAoIW1pbmltdW0pIHtcbiAgICByZXR1cm4gcmVsZWFzZWRcbiAgfVxuICB2YXIgc2VsZWN0ZWQgPSBbXVxuICBmb3IgKHZhciBpID0gcmVsZWFzZWQubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAobWluaW11bSA+IGdldE1ham9yKHJlbGVhc2VkW2ldKSkgYnJlYWtcbiAgICBzZWxlY3RlZC51bnNoaWZ0KHJlbGVhc2VkW2ldKVxuICB9XG4gIHJldHVybiBzZWxlY3RlZFxufVxuXG5mdW5jdGlvbiB1bmlxKGFycmF5KSB7XG4gIHZhciBmaWx0ZXJlZCA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZmlsdGVyZWQuaW5kZXhPZihhcnJheVtpXSkgPT09IC0xKSBmaWx0ZXJlZC5wdXNoKGFycmF5W2ldKVxuICB9XG4gIHJldHVybiBmaWx0ZXJlZFxufVxuXG5mdW5jdGlvbiBmaWxsVXNhZ2UocmVzdWx0LCBuYW1lLCBkYXRhKSB7XG4gIGZvciAodmFyIGkgaW4gZGF0YSkge1xuICAgIHJlc3VsdFtuYW1lICsgJyAnICsgaV0gPSBkYXRhW2ldXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVGaWx0ZXIoc2lnbiwgdmVyc2lvbikge1xuICB2ZXJzaW9uID0gcGFyc2VGbG9hdCh2ZXJzaW9uKVxuICBpZiAoc2lnbiA9PT0gJz4nKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdCh2KSA+IHZlcnNpb25cbiAgICB9XG4gIH0gZWxzZSBpZiAoc2lnbiA9PT0gJz49Jykge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodikgPj0gdmVyc2lvblxuICAgIH1cbiAgfSBlbHNlIGlmIChzaWduID09PSAnPCcpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHYpIDwgdmVyc2lvblxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHYpIDw9IHZlcnNpb25cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVTZW12ZXJGaWx0ZXIoc2lnbiwgdmVyc2lvbikge1xuICB2ZXJzaW9uID0gdmVyc2lvbi5zcGxpdCgnLicpLm1hcChwYXJzZVNpbXBsZUludClcbiAgdmVyc2lvblsxXSA9IHZlcnNpb25bMV0gfHwgMFxuICB2ZXJzaW9uWzJdID0gdmVyc2lvblsyXSB8fCAwXG4gIGlmIChzaWduID09PSAnPicpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHYgPSB2LnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICAgICAgcmV0dXJuIGNvbXBhcmVTZW12ZXIodiwgdmVyc2lvbikgPiAwXG4gICAgfVxuICB9IGVsc2UgaWYgKHNpZ24gPT09ICc+PScpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHYgPSB2LnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICAgICAgcmV0dXJuIGNvbXBhcmVTZW12ZXIodiwgdmVyc2lvbikgPj0gMFxuICAgIH1cbiAgfSBlbHNlIGlmIChzaWduID09PSAnPCcpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHYgPSB2LnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICAgICAgcmV0dXJuIGNvbXBhcmVTZW12ZXIodmVyc2lvbiwgdikgPiAwXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmdW5jdGlvbiAodikge1xuICAgICAgdiA9IHYuc3BsaXQoJy4nKS5tYXAocGFyc2VTaW1wbGVJbnQpXG4gICAgICByZXR1cm4gY29tcGFyZVNlbXZlcih2ZXJzaW9uLCB2KSA+PSAwXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlU2ltcGxlSW50KHgpIHtcbiAgcmV0dXJuIHBhcnNlSW50KHgpXG59XG5cbmZ1bmN0aW9uIGNvbXBhcmUoYSwgYikge1xuICBpZiAoYSA8IGIpIHJldHVybiAtMVxuICBpZiAoYSA+IGIpIHJldHVybiArMVxuICByZXR1cm4gMFxufVxuXG5mdW5jdGlvbiBjb21wYXJlU2VtdmVyKGEsIGIpIHtcbiAgcmV0dXJuIChcbiAgICBjb21wYXJlKHBhcnNlSW50KGFbMF0pLCBwYXJzZUludChiWzBdKSkgfHxcbiAgICBjb21wYXJlKHBhcnNlSW50KGFbMV0gfHwgJzAnKSwgcGFyc2VJbnQoYlsxXSB8fCAnMCcpKSB8fFxuICAgIGNvbXBhcmUocGFyc2VJbnQoYVsyXSB8fCAnMCcpLCBwYXJzZUludChiWzJdIHx8ICcwJykpXG4gIClcbn1cblxuLy8gdGhpcyBmb2xsb3dzIHRoZSBucG0tbGlrZSBzZW12ZXIgYmVoYXZpb3JcbmZ1bmN0aW9uIHNlbXZlckZpbHRlckxvb3NlKG9wZXJhdG9yLCByYW5nZSkge1xuICByYW5nZSA9IHJhbmdlLnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICBpZiAodHlwZW9mIHJhbmdlWzFdID09PSAndW5kZWZpbmVkJykge1xuICAgIHJhbmdlWzFdID0gJ3gnXG4gIH1cbiAgLy8gaWdub3JlIGFueSBwYXRjaCB2ZXJzaW9uIGJlY2F1c2Ugd2Ugb25seSByZXR1cm4gbWlub3IgdmVyc2lvbnNcbiAgLy8gcmFuZ2VbMl0gPSAneCdcbiAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgIGNhc2UgJzw9JzpcbiAgICAgIHJldHVybiBmdW5jdGlvbiAodmVyc2lvbikge1xuICAgICAgICB2ZXJzaW9uID0gdmVyc2lvbi5zcGxpdCgnLicpLm1hcChwYXJzZVNpbXBsZUludClcbiAgICAgICAgcmV0dXJuIGNvbXBhcmVTZW12ZXJMb29zZSh2ZXJzaW9uLCByYW5nZSkgPD0gMFxuICAgICAgfVxuICAgIGNhc2UgJz49JzpcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLnNwbGl0KCcuJykubWFwKHBhcnNlU2ltcGxlSW50KVxuICAgICAgICByZXR1cm4gY29tcGFyZVNlbXZlckxvb3NlKHZlcnNpb24sIHJhbmdlKSA+PSAwXG4gICAgICB9XG4gIH1cbn1cblxuLy8gdGhpcyBmb2xsb3dzIHRoZSBucG0tbGlrZSBzZW12ZXIgYmVoYXZpb3JcbmZ1bmN0aW9uIGNvbXBhcmVTZW12ZXJMb29zZSh2ZXJzaW9uLCByYW5nZSkge1xuICBpZiAodmVyc2lvblswXSAhPT0gcmFuZ2VbMF0pIHtcbiAgICByZXR1cm4gdmVyc2lvblswXSA8IHJhbmdlWzBdID8gLTEgOiArMVxuICB9XG4gIGlmIChyYW5nZVsxXSA9PT0gJ3gnKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBpZiAodmVyc2lvblsxXSAhPT0gcmFuZ2VbMV0pIHtcbiAgICByZXR1cm4gdmVyc2lvblsxXSA8IHJhbmdlWzFdID8gLTEgOiArMVxuICB9XG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIHJlc29sdmVWZXJzaW9uKGRhdGEsIHZlcnNpb24pIHtcbiAgaWYgKGRhdGEudmVyc2lvbnMuaW5kZXhPZih2ZXJzaW9uKSAhPT0gLTEpIHtcbiAgICByZXR1cm4gdmVyc2lvblxuICB9IGVsc2UgaWYgKGJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlc1tkYXRhLm5hbWVdW3ZlcnNpb25dKSB7XG4gICAgcmV0dXJuIGJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlc1tkYXRhLm5hbWVdW3ZlcnNpb25dXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVmVyc2lvbihkYXRhLCB2ZXJzaW9uKSB7XG4gIHZhciByZXNvbHZlZCA9IHJlc29sdmVWZXJzaW9uKGRhdGEsIHZlcnNpb24pXG4gIGlmIChyZXNvbHZlZCkge1xuICAgIHJldHVybiByZXNvbHZlZFxuICB9IGVsc2UgaWYgKGRhdGEudmVyc2lvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGRhdGEudmVyc2lvbnNbMF1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBmaWx0ZXJCeVllYXIoc2luY2UsIGNvbnRleHQpIHtcbiAgc2luY2UgPSBzaW5jZSAvIDEwMDBcbiAgcmV0dXJuIE9iamVjdC5rZXlzKGFnZW50cykucmVkdWNlKGZ1bmN0aW9uIChzZWxlY3RlZCwgbmFtZSkge1xuICAgIHZhciBkYXRhID0gYnlOYW1lKG5hbWUsIGNvbnRleHQpXG4gICAgaWYgKCFkYXRhKSByZXR1cm4gc2VsZWN0ZWRcbiAgICB2YXIgdmVyc2lvbnMgPSBPYmplY3Qua2V5cyhkYXRhLnJlbGVhc2VEYXRlKS5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgIHZhciBkYXRlID0gZGF0YS5yZWxlYXNlRGF0ZVt2XVxuICAgICAgcmV0dXJuIGRhdGUgIT09IG51bGwgJiYgZGF0ZSA+PSBzaW5jZVxuICAgIH0pXG4gICAgcmV0dXJuIHNlbGVjdGVkLmNvbmNhdCh2ZXJzaW9ucy5tYXAobmFtZU1hcHBlcihkYXRhLm5hbWUpKSlcbiAgfSwgW10pXG59XG5cbmZ1bmN0aW9uIGNsb25lRGF0YShkYXRhKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogZGF0YS5uYW1lLFxuICAgIHZlcnNpb25zOiBkYXRhLnZlcnNpb25zLFxuICAgIHJlbGVhc2VkOiBkYXRhLnJlbGVhc2VkLFxuICAgIHJlbGVhc2VEYXRlOiBkYXRhLnJlbGVhc2VEYXRlXG4gIH1cbn1cblxuZnVuY3Rpb24gbWFwVmVyc2lvbnMoZGF0YSwgbWFwKSB7XG4gIGRhdGEudmVyc2lvbnMgPSBkYXRhLnZlcnNpb25zLm1hcChmdW5jdGlvbiAoaSkge1xuICAgIHJldHVybiBtYXBbaV0gfHwgaVxuICB9KVxuICBkYXRhLnJlbGVhc2VkID0gZGF0YS5yZWxlYXNlZC5tYXAoZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gbWFwW2ldIHx8IGlcbiAgfSlcbiAgdmFyIGZpeGVkRGF0ZSA9IHt9XG4gIGZvciAodmFyIGkgaW4gZGF0YS5yZWxlYXNlRGF0ZSkge1xuICAgIGZpeGVkRGF0ZVttYXBbaV0gfHwgaV0gPSBkYXRhLnJlbGVhc2VEYXRlW2ldXG4gIH1cbiAgZGF0YS5yZWxlYXNlRGF0ZSA9IGZpeGVkRGF0ZVxuICByZXR1cm4gZGF0YVxufVxuXG5mdW5jdGlvbiBieU5hbWUobmFtZSwgY29udGV4dCkge1xuICBuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIG5hbWUgPSBicm93c2Vyc2xpc3QuYWxpYXNlc1tuYW1lXSB8fCBuYW1lXG4gIGlmIChjb250ZXh0Lm1vYmlsZVRvRGVza3RvcCAmJiBicm93c2Vyc2xpc3QuZGVza3RvcE5hbWVzW25hbWVdKSB7XG4gICAgdmFyIGRlc2t0b3AgPSBicm93c2Vyc2xpc3QuZGF0YVticm93c2Vyc2xpc3QuZGVza3RvcE5hbWVzW25hbWVdXVxuICAgIGlmIChuYW1lID09PSAnYW5kcm9pZCcpIHtcbiAgICAgIHJldHVybiBub3JtYWxpemVBbmRyb2lkRGF0YShjbG9uZURhdGEoYnJvd3NlcnNsaXN0LmRhdGFbbmFtZV0pLCBkZXNrdG9wKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgY2xvbmVkID0gY2xvbmVEYXRhKGRlc2t0b3ApXG4gICAgICBjbG9uZWQubmFtZSA9IG5hbWVcbiAgICAgIGlmIChuYW1lID09PSAnb3BfbW9iJykge1xuICAgICAgICBjbG9uZWQgPSBtYXBWZXJzaW9ucyhjbG9uZWQsIHsgJzEwLjAtMTAuMSc6ICcxMCcgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBjbG9uZWRcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJyb3dzZXJzbGlzdC5kYXRhW25hbWVdXG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUFuZHJvaWRWZXJzaW9ucyhhbmRyb2lkVmVyc2lvbnMsIGNocm9tZVZlcnNpb25zKSB7XG4gIHZhciBmaXJzdEV2ZXJncmVlbiA9IEFORFJPSURfRVZFUkdSRUVOX0ZJUlNUXG4gIHZhciBsYXN0ID0gY2hyb21lVmVyc2lvbnNbY2hyb21lVmVyc2lvbnMubGVuZ3RoIC0gMV1cbiAgcmV0dXJuIGFuZHJvaWRWZXJzaW9uc1xuICAgIC5maWx0ZXIoZnVuY3Rpb24gKHZlcnNpb24pIHtcbiAgICAgIHJldHVybiAvXig/OlsyLTRdXFwufFszNF0kKS8udGVzdCh2ZXJzaW9uKVxuICAgIH0pXG4gICAgLmNvbmNhdChjaHJvbWVWZXJzaW9ucy5zbGljZShmaXJzdEV2ZXJncmVlbiAtIGxhc3QgLSAxKSlcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQW5kcm9pZERhdGEoYW5kcm9pZCwgY2hyb21lKSB7XG4gIGFuZHJvaWQucmVsZWFzZWQgPSBub3JtYWxpemVBbmRyb2lkVmVyc2lvbnMoYW5kcm9pZC5yZWxlYXNlZCwgY2hyb21lLnJlbGVhc2VkKVxuICBhbmRyb2lkLnZlcnNpb25zID0gbm9ybWFsaXplQW5kcm9pZFZlcnNpb25zKGFuZHJvaWQudmVyc2lvbnMsIGNocm9tZS52ZXJzaW9ucylcbiAgcmV0dXJuIGFuZHJvaWRcbn1cblxuZnVuY3Rpb24gY2hlY2tOYW1lKG5hbWUsIGNvbnRleHQpIHtcbiAgdmFyIGRhdGEgPSBieU5hbWUobmFtZSwgY29udGV4dClcbiAgaWYgKCFkYXRhKSB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoJ1Vua25vd24gYnJvd3NlciAnICsgbmFtZSlcbiAgcmV0dXJuIGRhdGFcbn1cblxuZnVuY3Rpb24gdW5rbm93blF1ZXJ5KHF1ZXJ5KSB7XG4gIHJldHVybiBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgJ1Vua25vd24gYnJvd3NlciBxdWVyeSBgJyArXG4gICAgICBxdWVyeSArXG4gICAgICAnYC4gJyArXG4gICAgICAnTWF5YmUgeW91IGFyZSB1c2luZyBvbGQgQnJvd3NlcnNsaXN0IG9yIG1hZGUgdHlwbyBpbiBxdWVyeS4nXG4gIClcbn1cblxuZnVuY3Rpb24gZmlsdGVyQW5kcm9pZChsaXN0LCB2ZXJzaW9ucywgY29udGV4dCkge1xuICBpZiAoY29udGV4dC5tb2JpbGVUb0Rlc2t0b3ApIHJldHVybiBsaXN0XG4gIHZhciByZWxlYXNlZCA9IGJyb3dzZXJzbGlzdC5kYXRhLmFuZHJvaWQucmVsZWFzZWRcbiAgdmFyIGxhc3QgPSByZWxlYXNlZFtyZWxlYXNlZC5sZW5ndGggLSAxXVxuICB2YXIgZGlmZiA9IGxhc3QgLSBBTkRST0lEX0VWRVJHUkVFTl9GSVJTVCAtIHZlcnNpb25zXG4gIGlmIChkaWZmID4gMCkge1xuICAgIHJldHVybiBsaXN0LnNsaWNlKC0xKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBsaXN0LnNsaWNlKGRpZmYgLSAxKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJlc29sdmUocXVlcmllcywgY29udGV4dCkge1xuICByZXR1cm4gcGFyc2UoUVVFUklFUywgcXVlcmllcykucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIG5vZGUsIGluZGV4KSB7XG4gICAgaWYgKG5vZGUubm90ICYmIGluZGV4ID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAgICdXcml0ZSBhbnkgYnJvd3NlcnMgcXVlcnkgKGZvciBpbnN0YW5jZSwgYGRlZmF1bHRzYCkgJyArXG4gICAgICAgICAgJ2JlZm9yZSBgJyArXG4gICAgICAgICAgbm9kZS5xdWVyeSArXG4gICAgICAgICAgJ2AnXG4gICAgICApXG4gICAgfVxuICAgIHZhciB0eXBlID0gUVVFUklFU1tub2RlLnR5cGVdXG4gICAgdmFyIGFycmF5ID0gdHlwZS5zZWxlY3QuY2FsbChicm93c2Vyc2xpc3QsIGNvbnRleHQsIG5vZGUpLm1hcChmdW5jdGlvbiAoaikge1xuICAgICAgdmFyIHBhcnRzID0gai5zcGxpdCgnICcpXG4gICAgICBpZiAocGFydHNbMV0gPT09ICcwJykge1xuICAgICAgICByZXR1cm4gcGFydHNbMF0gKyAnICcgKyBieU5hbWUocGFydHNbMF0sIGNvbnRleHQpLnZlcnNpb25zWzBdXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4galxuICAgICAgfVxuICAgIH0pXG5cbiAgICBpZiAobm9kZS5jb21wb3NlID09PSAnYW5kJykge1xuICAgICAgaWYgKG5vZGUubm90KSB7XG4gICAgICAgIHJldHVybiByZXN1bHQuZmlsdGVyKGZ1bmN0aW9uIChqKSB7XG4gICAgICAgICAgcmV0dXJuIGFycmF5LmluZGV4T2YoaikgPT09IC0xXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVzdWx0LmZpbHRlcihmdW5jdGlvbiAoaikge1xuICAgICAgICAgIHJldHVybiBhcnJheS5pbmRleE9mKGopICE9PSAtMVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAobm9kZS5ub3QpIHtcbiAgICAgICAgdmFyIGZpbHRlciA9IHt9XG4gICAgICAgIGFycmF5LmZvckVhY2goZnVuY3Rpb24gKGopIHtcbiAgICAgICAgICBmaWx0ZXJbal0gPSB0cnVlXG4gICAgICAgIH0pXG4gICAgICAgIHJldHVybiByZXN1bHQuZmlsdGVyKGZ1bmN0aW9uIChqKSB7XG4gICAgICAgICAgcmV0dXJuICFmaWx0ZXJbal1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQuY29uY2F0KGFycmF5KVxuICAgIH1cbiAgfSwgW10pXG59XG5cbmZ1bmN0aW9uIHByZXBhcmVPcHRzKG9wdHMpIHtcbiAgaWYgKHR5cGVvZiBvcHRzID09PSAndW5kZWZpbmVkJykgb3B0cyA9IHt9XG5cbiAgaWYgKHR5cGVvZiBvcHRzLnBhdGggPT09ICd1bmRlZmluZWQnKSB7XG4gICAgb3B0cy5wYXRoID0gcGF0aC5yZXNvbHZlID8gcGF0aC5yZXNvbHZlKCcuJykgOiAnLidcbiAgfVxuXG4gIHJldHVybiBvcHRzXG59XG5cbmZ1bmN0aW9uIHByZXBhcmVRdWVyaWVzKHF1ZXJpZXMsIG9wdHMpIHtcbiAgaWYgKHR5cGVvZiBxdWVyaWVzID09PSAndW5kZWZpbmVkJyB8fCBxdWVyaWVzID09PSBudWxsKSB7XG4gICAgdmFyIGNvbmZpZyA9IGJyb3dzZXJzbGlzdC5sb2FkQ29uZmlnKG9wdHMpXG4gICAgaWYgKGNvbmZpZykge1xuICAgICAgcXVlcmllcyA9IGNvbmZpZ1xuICAgIH0gZWxzZSB7XG4gICAgICBxdWVyaWVzID0gYnJvd3NlcnNsaXN0LmRlZmF1bHRzXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHF1ZXJpZXNcbn1cblxuZnVuY3Rpb24gY2hlY2tRdWVyaWVzKHF1ZXJpZXMpIHtcbiAgaWYgKCEodHlwZW9mIHF1ZXJpZXMgPT09ICdzdHJpbmcnIHx8IEFycmF5LmlzQXJyYXkocXVlcmllcykpKSB7XG4gICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKFxuICAgICAgJ0Jyb3dzZXIgcXVlcmllcyBtdXN0IGJlIGFuIGFycmF5IG9yIHN0cmluZy4gR290ICcgKyB0eXBlb2YgcXVlcmllcyArICcuJ1xuICAgIClcbiAgfVxufVxuXG52YXIgY2FjaGUgPSB7fVxuXG5mdW5jdGlvbiBicm93c2Vyc2xpc3QocXVlcmllcywgb3B0cykge1xuICBvcHRzID0gcHJlcGFyZU9wdHMob3B0cylcbiAgcXVlcmllcyA9IHByZXBhcmVRdWVyaWVzKHF1ZXJpZXMsIG9wdHMpXG4gIGNoZWNrUXVlcmllcyhxdWVyaWVzKVxuXG4gIHZhciBjb250ZXh0ID0ge1xuICAgIGlnbm9yZVVua25vd25WZXJzaW9uczogb3B0cy5pZ25vcmVVbmtub3duVmVyc2lvbnMsXG4gICAgZGFuZ2Vyb3VzRXh0ZW5kOiBvcHRzLmRhbmdlcm91c0V4dGVuZCxcbiAgICBtb2JpbGVUb0Rlc2t0b3A6IG9wdHMubW9iaWxlVG9EZXNrdG9wLFxuICAgIHBhdGg6IG9wdHMucGF0aCxcbiAgICBlbnY6IG9wdHMuZW52XG4gIH1cblxuICBlbnYub2xkRGF0YVdhcm5pbmcoYnJvd3NlcnNsaXN0LmRhdGEpXG4gIHZhciBzdGF0cyA9IGVudi5nZXRTdGF0KG9wdHMsIGJyb3dzZXJzbGlzdC5kYXRhKVxuICBpZiAoc3RhdHMpIHtcbiAgICBjb250ZXh0LmN1c3RvbVVzYWdlID0ge31cbiAgICBmb3IgKHZhciBicm93c2VyIGluIHN0YXRzKSB7XG4gICAgICBmaWxsVXNhZ2UoY29udGV4dC5jdXN0b21Vc2FnZSwgYnJvd3Nlciwgc3RhdHNbYnJvd3Nlcl0pXG4gICAgfVxuICB9XG5cbiAgdmFyIGNhY2hlS2V5ID0gSlNPTi5zdHJpbmdpZnkoW3F1ZXJpZXMsIGNvbnRleHRdKVxuICBpZiAoY2FjaGVbY2FjaGVLZXldKSByZXR1cm4gY2FjaGVbY2FjaGVLZXldXG5cbiAgdmFyIHJlc3VsdCA9IHVuaXEocmVzb2x2ZShxdWVyaWVzLCBjb250ZXh0KSkuc29ydChmdW5jdGlvbiAobmFtZTEsIG5hbWUyKSB7XG4gICAgbmFtZTEgPSBuYW1lMS5zcGxpdCgnICcpXG4gICAgbmFtZTIgPSBuYW1lMi5zcGxpdCgnICcpXG4gICAgaWYgKG5hbWUxWzBdID09PSBuYW1lMlswXSkge1xuICAgICAgLy8gYXNzdW1wdGlvbnMgb24gY2FuaXVzZSBkYXRhXG4gICAgICAvLyAxKSB2ZXJzaW9uIHJhbmdlcyBuZXZlciBvdmVybGFwc1xuICAgICAgLy8gMikgaWYgdmVyc2lvbiBpcyBub3QgYSByYW5nZSwgaXQgbmV2ZXIgY29udGFpbnMgYC1gXG4gICAgICB2YXIgdmVyc2lvbjEgPSBuYW1lMVsxXS5zcGxpdCgnLScpWzBdXG4gICAgICB2YXIgdmVyc2lvbjIgPSBuYW1lMlsxXS5zcGxpdCgnLScpWzBdXG4gICAgICByZXR1cm4gY29tcGFyZVNlbXZlcih2ZXJzaW9uMi5zcGxpdCgnLicpLCB2ZXJzaW9uMS5zcGxpdCgnLicpKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY29tcGFyZShuYW1lMVswXSwgbmFtZTJbMF0pXG4gICAgfVxuICB9KVxuICBpZiAoIXByb2Nlc3MuZW52LkJST1dTRVJTTElTVF9ESVNBQkxFX0NBQ0hFKSB7XG4gICAgY2FjaGVbY2FjaGVLZXldID0gcmVzdWx0XG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5icm93c2Vyc2xpc3QucGFyc2UgPSBmdW5jdGlvbiAocXVlcmllcywgb3B0cykge1xuICBvcHRzID0gcHJlcGFyZU9wdHMob3B0cylcbiAgcXVlcmllcyA9IHByZXBhcmVRdWVyaWVzKHF1ZXJpZXMsIG9wdHMpXG4gIGNoZWNrUXVlcmllcyhxdWVyaWVzKVxuICByZXR1cm4gcGFyc2UoUVVFUklFUywgcXVlcmllcylcbn1cblxuLy8gV2lsbCBiZSBmaWxsZWQgYnkgQ2FuIEkgVXNlIGRhdGEgYmVsb3dcbmJyb3dzZXJzbGlzdC5jYWNoZSA9IHt9XG5icm93c2Vyc2xpc3QuZGF0YSA9IHt9XG5icm93c2Vyc2xpc3QudXNhZ2UgPSB7XG4gIGdsb2JhbDoge30sXG4gIGN1c3RvbTogbnVsbFxufVxuXG4vLyBEZWZhdWx0IGJyb3dzZXJzIHF1ZXJ5XG5icm93c2Vyc2xpc3QuZGVmYXVsdHMgPSBbJz4gMC41JScsICdsYXN0IDIgdmVyc2lvbnMnLCAnRmlyZWZveCBFU1InLCAnbm90IGRlYWQnXVxuXG4vLyBCcm93c2VyIG5hbWVzIGFsaWFzZXNcbmJyb3dzZXJzbGlzdC5hbGlhc2VzID0ge1xuICBmeDogJ2ZpcmVmb3gnLFxuICBmZjogJ2ZpcmVmb3gnLFxuICBpb3M6ICdpb3Nfc2FmJyxcbiAgZXhwbG9yZXI6ICdpZScsXG4gIGJsYWNrYmVycnk6ICdiYicsXG4gIGV4cGxvcmVybW9iaWxlOiAnaWVfbW9iJyxcbiAgb3BlcmFtaW5pOiAnb3BfbWluaScsXG4gIG9wZXJhbW9iaWxlOiAnb3BfbW9iJyxcbiAgY2hyb21lYW5kcm9pZDogJ2FuZF9jaHInLFxuICBmaXJlZm94YW5kcm9pZDogJ2FuZF9mZicsXG4gIHVjYW5kcm9pZDogJ2FuZF91YycsXG4gIHFxYW5kcm9pZDogJ2FuZF9xcSdcbn1cblxuLy8gQ2FuIEkgVXNlIG9ubHkgcHJvdmlkZXMgYSBmZXcgdmVyc2lvbnMgZm9yIHNvbWUgYnJvd3NlcnMgKGUuZy4gYW5kX2NocikuXG4vLyBGYWxsYmFjayB0byBhIHNpbWlsYXIgYnJvd3NlciBmb3IgdW5rbm93biB2ZXJzaW9uc1xuYnJvd3NlcnNsaXN0LmRlc2t0b3BOYW1lcyA9IHtcbiAgYW5kX2NocjogJ2Nocm9tZScsXG4gIGFuZF9mZjogJ2ZpcmVmb3gnLFxuICBpZV9tb2I6ICdpZScsXG4gIG9wX21vYjogJ29wZXJhJyxcbiAgYW5kcm9pZDogJ2Nocm9tZScgLy8gaGFzIGV4dHJhIHByb2Nlc3NpbmcgbG9naWNcbn1cblxuLy8gQWxpYXNlcyB0byB3b3JrIHdpdGggam9pbmVkIHZlcnNpb25zIGxpa2UgYGlvc19zYWYgNy4wLTcuMWBcbmJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlcyA9IHt9XG5cbmJyb3dzZXJzbGlzdC5jbGVhckNhY2hlcyA9IGVudi5jbGVhckNhY2hlc1xuYnJvd3NlcnNsaXN0LnBhcnNlQ29uZmlnID0gZW52LnBhcnNlQ29uZmlnXG5icm93c2Vyc2xpc3QucmVhZENvbmZpZyA9IGVudi5yZWFkQ29uZmlnXG5icm93c2Vyc2xpc3QuZmluZENvbmZpZyA9IGVudi5maW5kQ29uZmlnXG5icm93c2Vyc2xpc3QubG9hZENvbmZpZyA9IGVudi5sb2FkQ29uZmlnXG5cbmJyb3dzZXJzbGlzdC5jb3ZlcmFnZSA9IGZ1bmN0aW9uIChicm93c2Vycywgc3RhdHMpIHtcbiAgdmFyIGRhdGFcbiAgaWYgKHR5cGVvZiBzdGF0cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBkYXRhID0gYnJvd3NlcnNsaXN0LnVzYWdlLmdsb2JhbFxuICB9IGVsc2UgaWYgKHN0YXRzID09PSAnbXkgc3RhdHMnKSB7XG4gICAgdmFyIG9wdHMgPSB7fVxuICAgIG9wdHMucGF0aCA9IHBhdGgucmVzb2x2ZSA/IHBhdGgucmVzb2x2ZSgnLicpIDogJy4nXG4gICAgdmFyIGN1c3RvbVN0YXRzID0gZW52LmdldFN0YXQob3B0cylcbiAgICBpZiAoIWN1c3RvbVN0YXRzKSB7XG4gICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoJ0N1c3RvbSB1c2FnZSBzdGF0aXN0aWNzIHdhcyBub3QgcHJvdmlkZWQnKVxuICAgIH1cbiAgICBkYXRhID0ge31cbiAgICBmb3IgKHZhciBicm93c2VyIGluIGN1c3RvbVN0YXRzKSB7XG4gICAgICBmaWxsVXNhZ2UoZGF0YSwgYnJvd3NlciwgY3VzdG9tU3RhdHNbYnJvd3Nlcl0pXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiBzdGF0cyA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAoc3RhdHMubGVuZ3RoID4gMikge1xuICAgICAgc3RhdHMgPSBzdGF0cy50b0xvd2VyQ2FzZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRzID0gc3RhdHMudG9VcHBlckNhc2UoKVxuICAgIH1cbiAgICBlbnYubG9hZENvdW50cnkoYnJvd3NlcnNsaXN0LnVzYWdlLCBzdGF0cywgYnJvd3NlcnNsaXN0LmRhdGEpXG4gICAgZGF0YSA9IGJyb3dzZXJzbGlzdC51c2FnZVtzdGF0c11cbiAgfSBlbHNlIHtcbiAgICBpZiAoJ2RhdGFCeUJyb3dzZXInIGluIHN0YXRzKSB7XG4gICAgICBzdGF0cyA9IHN0YXRzLmRhdGFCeUJyb3dzZXJcbiAgICB9XG4gICAgZGF0YSA9IHt9XG4gICAgZm9yICh2YXIgbmFtZSBpbiBzdGF0cykge1xuICAgICAgZm9yICh2YXIgdmVyc2lvbiBpbiBzdGF0c1tuYW1lXSkge1xuICAgICAgICBkYXRhW25hbWUgKyAnICcgKyB2ZXJzaW9uXSA9IHN0YXRzW25hbWVdW3ZlcnNpb25dXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJyb3dzZXJzLnJlZHVjZShmdW5jdGlvbiAoYWxsLCBpKSB7XG4gICAgdmFyIHVzYWdlID0gZGF0YVtpXVxuICAgIGlmICh1c2FnZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB1c2FnZSA9IGRhdGFbaS5yZXBsYWNlKC8gXFxTKyQvLCAnIDAnKV1cbiAgICB9XG4gICAgcmV0dXJuIGFsbCArICh1c2FnZSB8fCAwKVxuICB9LCAwKVxufVxuXG5mdW5jdGlvbiBub2RlUXVlcnkoY29udGV4dCwgbm9kZSkge1xuICB2YXIgbWF0Y2hlZCA9IGJyb3dzZXJzbGlzdC5ub2RlVmVyc2lvbnMuZmlsdGVyKGZ1bmN0aW9uIChpKSB7XG4gICAgcmV0dXJuIGlzVmVyc2lvbnNNYXRjaChpLCBub2RlLnZlcnNpb24pXG4gIH0pXG4gIGlmIChtYXRjaGVkLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChjb250ZXh0Lmlnbm9yZVVua25vd25WZXJzaW9ucykge1xuICAgICAgcmV0dXJuIFtdXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICAgJ1Vua25vd24gdmVyc2lvbiAnICsgbm9kZS52ZXJzaW9uICsgJyBvZiBOb2RlLmpzJ1xuICAgICAgKVxuICAgIH1cbiAgfVxuICByZXR1cm4gWydub2RlICcgKyBtYXRjaGVkW21hdGNoZWQubGVuZ3RoIC0gMV1dXG59XG5cbmZ1bmN0aW9uIHNpbmNlUXVlcnkoY29udGV4dCwgbm9kZSkge1xuICB2YXIgeWVhciA9IHBhcnNlSW50KG5vZGUueWVhcilcbiAgdmFyIG1vbnRoID0gcGFyc2VJbnQobm9kZS5tb250aCB8fCAnMDEnKSAtIDFcbiAgdmFyIGRheSA9IHBhcnNlSW50KG5vZGUuZGF5IHx8ICcwMScpXG4gIHJldHVybiBmaWx0ZXJCeVllYXIoRGF0ZS5VVEMoeWVhciwgbW9udGgsIGRheSwgMCwgMCwgMCksIGNvbnRleHQpXG59XG5cbmZ1bmN0aW9uIGNvdmVyUXVlcnkoY29udGV4dCwgbm9kZSkge1xuICB2YXIgY292ZXJhZ2UgPSBwYXJzZUZsb2F0KG5vZGUuY292ZXJhZ2UpXG4gIHZhciB1c2FnZSA9IGJyb3dzZXJzbGlzdC51c2FnZS5nbG9iYWxcbiAgaWYgKG5vZGUucGxhY2UpIHtcbiAgICBpZiAobm9kZS5wbGFjZS5tYXRjaCgvXm15XFxzK3N0YXRzJC9pKSkge1xuICAgICAgaWYgKCFjb250ZXh0LmN1c3RvbVVzYWdlKSB7XG4gICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcignQ3VzdG9tIHVzYWdlIHN0YXRpc3RpY3Mgd2FzIG5vdCBwcm92aWRlZCcpXG4gICAgICB9XG4gICAgICB1c2FnZSA9IGNvbnRleHQuY3VzdG9tVXNhZ2VcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHBsYWNlXG4gICAgICBpZiAobm9kZS5wbGFjZS5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgcGxhY2UgPSBub2RlLnBsYWNlLnRvVXBwZXJDYXNlKClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBsYWNlID0gbm9kZS5wbGFjZS50b0xvd2VyQ2FzZSgpXG4gICAgICB9XG4gICAgICBlbnYubG9hZENvdW50cnkoYnJvd3NlcnNsaXN0LnVzYWdlLCBwbGFjZSwgYnJvd3NlcnNsaXN0LmRhdGEpXG4gICAgICB1c2FnZSA9IGJyb3dzZXJzbGlzdC51c2FnZVtwbGFjZV1cbiAgICB9XG4gIH1cbiAgdmFyIHZlcnNpb25zID0gT2JqZWN0LmtleXModXNhZ2UpLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gdXNhZ2VbYl0gLSB1c2FnZVthXVxuICB9KVxuICB2YXIgY292ZXJhZ2VkID0gMFxuICB2YXIgcmVzdWx0ID0gW11cbiAgdmFyIHZlcnNpb25cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJzaW9ucy5sZW5ndGg7IGkrKykge1xuICAgIHZlcnNpb24gPSB2ZXJzaW9uc1tpXVxuICAgIGlmICh1c2FnZVt2ZXJzaW9uXSA9PT0gMCkgYnJlYWtcbiAgICBjb3ZlcmFnZWQgKz0gdXNhZ2VbdmVyc2lvbl1cbiAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgIGlmIChjb3ZlcmFnZWQgPj0gY292ZXJhZ2UpIGJyZWFrXG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG52YXIgUVVFUklFUyA9IHtcbiAgbGFzdF9tYWpvcl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrbWFqb3JcXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhhZ2VudHMpLnJlZHVjZShmdW5jdGlvbiAoc2VsZWN0ZWQsIG5hbWUpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBieU5hbWUobmFtZSwgY29udGV4dClcbiAgICAgICAgaWYgKCFkYXRhKSByZXR1cm4gc2VsZWN0ZWRcbiAgICAgICAgdmFyIGxpc3QgPSBnZXRNYWpvclZlcnNpb25zKGRhdGEucmVsZWFzZWQsIG5vZGUudmVyc2lvbnMpXG4gICAgICAgIGxpc3QgPSBsaXN0Lm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpXG4gICAgICAgIGlmIChkYXRhLm5hbWUgPT09ICdhbmRyb2lkJykge1xuICAgICAgICAgIGxpc3QgPSBmaWx0ZXJBbmRyb2lkKGxpc3QsIG5vZGUudmVyc2lvbnMsIGNvbnRleHQpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkLmNvbmNhdChsaXN0KVxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICBsYXN0X3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGFnZW50cykucmVkdWNlKGZ1bmN0aW9uIChzZWxlY3RlZCwgbmFtZSkge1xuICAgICAgICB2YXIgZGF0YSA9IGJ5TmFtZShuYW1lLCBjb250ZXh0KVxuICAgICAgICBpZiAoIWRhdGEpIHJldHVybiBzZWxlY3RlZFxuICAgICAgICB2YXIgbGlzdCA9IGRhdGEucmVsZWFzZWQuc2xpY2UoLW5vZGUudmVyc2lvbnMpXG4gICAgICAgIGxpc3QgPSBsaXN0Lm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpXG4gICAgICAgIGlmIChkYXRhLm5hbWUgPT09ICdhbmRyb2lkJykge1xuICAgICAgICAgIGxpc3QgPSBmaWx0ZXJBbmRyb2lkKGxpc3QsIG5vZGUudmVyc2lvbnMsIGNvbnRleHQpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkLmNvbmNhdChsaXN0KVxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICBsYXN0X2VsZWN0cm9uX21ham9yX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9ucyddLFxuICAgIHJlZ2V4cDogL15sYXN0XFxzKyhcXGQrKVxccytlbGVjdHJvblxccyttYWpvclxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIHZhbGlkVmVyc2lvbnMgPSBnZXRNYWpvclZlcnNpb25zKE9iamVjdC5rZXlzKGUyYyksIG5vZGUudmVyc2lvbnMpXG4gICAgICByZXR1cm4gdmFsaWRWZXJzaW9ucy5tYXAoZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgcmV0dXJuICdjaHJvbWUgJyArIGUyY1tpXVxuICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIGxhc3Rfbm9kZV9tYWpvcl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrbm9kZVxccyttYWpvclxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIGdldE1ham9yVmVyc2lvbnMoYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9ucywgbm9kZS52ZXJzaW9ucykubWFwKFxuICAgICAgICBmdW5jdGlvbiAodmVyc2lvbikge1xuICAgICAgICAgIHJldHVybiAnbm9kZSAnICsgdmVyc2lvblxuICAgICAgICB9XG4gICAgICApXG4gICAgfVxuICB9LFxuICBsYXN0X2Jyb3dzZXJfbWFqb3JfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb25zJywgJ2Jyb3dzZXInXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrKFxcdyspXFxzK21ham9yXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgZGF0YSA9IGNoZWNrTmFtZShub2RlLmJyb3dzZXIsIGNvbnRleHQpXG4gICAgICB2YXIgdmFsaWRWZXJzaW9ucyA9IGdldE1ham9yVmVyc2lvbnMoZGF0YS5yZWxlYXNlZCwgbm9kZS52ZXJzaW9ucylcbiAgICAgIHZhciBsaXN0ID0gdmFsaWRWZXJzaW9ucy5tYXAobmFtZU1hcHBlcihkYXRhLm5hbWUpKVxuICAgICAgaWYgKGRhdGEubmFtZSA9PT0gJ2FuZHJvaWQnKSB7XG4gICAgICAgIGxpc3QgPSBmaWx0ZXJBbmRyb2lkKGxpc3QsIG5vZGUudmVyc2lvbnMsIGNvbnRleHQpXG4gICAgICB9XG4gICAgICByZXR1cm4gbGlzdFxuICAgIH1cbiAgfSxcbiAgbGFzdF9lbGVjdHJvbl92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrZWxlY3Ryb25cXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhlMmMpXG4gICAgICAgIC5zbGljZSgtbm9kZS52ZXJzaW9ucylcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoaSkge1xuICAgICAgICAgIHJldHVybiAnY2hyb21lICcgKyBlMmNbaV1cbiAgICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIGxhc3Rfbm9kZV92ZXJzaW9uczoge1xuICAgIG1hdGNoZXM6IFsndmVyc2lvbnMnXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrbm9kZVxccyt2ZXJzaW9ucz8kL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIGJyb3dzZXJzbGlzdC5ub2RlVmVyc2lvbnNcbiAgICAgICAgLnNsaWNlKC1ub2RlLnZlcnNpb25zKVxuICAgICAgICAubWFwKGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuICdub2RlICcgKyB2ZXJzaW9uXG4gICAgICAgIH0pXG4gICAgfVxuICB9LFxuICBsYXN0X2Jyb3dzZXJfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb25zJywgJ2Jyb3dzZXInXSxcbiAgICByZWdleHA6IC9ebGFzdFxccysoXFxkKylcXHMrKFxcdyspXFxzK3ZlcnNpb25zPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgZGF0YSA9IGNoZWNrTmFtZShub2RlLmJyb3dzZXIsIGNvbnRleHQpXG4gICAgICB2YXIgbGlzdCA9IGRhdGEucmVsZWFzZWQuc2xpY2UoLW5vZGUudmVyc2lvbnMpLm1hcChuYW1lTWFwcGVyKGRhdGEubmFtZSkpXG4gICAgICBpZiAoZGF0YS5uYW1lID09PSAnYW5kcm9pZCcpIHtcbiAgICAgICAgbGlzdCA9IGZpbHRlckFuZHJvaWQobGlzdCwgbm9kZS52ZXJzaW9ucywgY29udGV4dClcbiAgICAgIH1cbiAgICAgIHJldHVybiBsaXN0XG4gICAgfVxuICB9LFxuICB1bnJlbGVhc2VkX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXnVucmVsZWFzZWRcXHMrdmVyc2lvbnMkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGFnZW50cykucmVkdWNlKGZ1bmN0aW9uIChzZWxlY3RlZCwgbmFtZSkge1xuICAgICAgICB2YXIgZGF0YSA9IGJ5TmFtZShuYW1lLCBjb250ZXh0KVxuICAgICAgICBpZiAoIWRhdGEpIHJldHVybiBzZWxlY3RlZFxuICAgICAgICB2YXIgbGlzdCA9IGRhdGEudmVyc2lvbnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGEucmVsZWFzZWQuaW5kZXhPZih2KSA9PT0gLTFcbiAgICAgICAgfSlcbiAgICAgICAgbGlzdCA9IGxpc3QubWFwKG5hbWVNYXBwZXIoZGF0YS5uYW1lKSlcbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkLmNvbmNhdChsaXN0KVxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICB1bnJlbGVhc2VkX2VsZWN0cm9uX3ZlcnNpb25zOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXnVucmVsZWFzZWRcXHMrZWxlY3Ryb25cXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFtdXG4gICAgfVxuICB9LFxuICB1bnJlbGVhc2VkX2Jyb3dzZXJfdmVyc2lvbnM6IHtcbiAgICBtYXRjaGVzOiBbJ2Jyb3dzZXInXSxcbiAgICByZWdleHA6IC9edW5yZWxlYXNlZFxccysoXFx3KylcXHMrdmVyc2lvbnM/JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHJldHVybiBkYXRhLnZlcnNpb25zXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YS5yZWxlYXNlZC5pbmRleE9mKHYpID09PSAtMVxuICAgICAgICB9KVxuICAgICAgICAubWFwKG5hbWVNYXBwZXIoZGF0YS5uYW1lKSlcbiAgICB9XG4gIH0sXG4gIGxhc3RfeWVhcnM6IHtcbiAgICBtYXRjaGVzOiBbJ3llYXJzJ10sXG4gICAgcmVnZXhwOiAvXmxhc3RcXHMrKFxcZCouP1xcZCspXFxzK3llYXJzPyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gZmlsdGVyQnlZZWFyKERhdGUubm93KCkgLSBZRUFSICogbm9kZS55ZWFycywgY29udGV4dClcbiAgICB9XG4gIH0sXG4gIHNpbmNlX3k6IHtcbiAgICBtYXRjaGVzOiBbJ3llYXInXSxcbiAgICByZWdleHA6IC9ec2luY2UgKFxcZCspJC9pLFxuICAgIHNlbGVjdDogc2luY2VRdWVyeVxuICB9LFxuICBzaW5jZV95X206IHtcbiAgICBtYXRjaGVzOiBbJ3llYXInLCAnbW9udGgnXSxcbiAgICByZWdleHA6IC9ec2luY2UgKFxcZCspLShcXGQrKSQvaSxcbiAgICBzZWxlY3Q6IHNpbmNlUXVlcnlcbiAgfSxcbiAgc2luY2VfeV9tX2Q6IHtcbiAgICBtYXRjaGVzOiBbJ3llYXInLCAnbW9udGgnLCAnZGF5J10sXG4gICAgcmVnZXhwOiAvXnNpbmNlIChcXGQrKS0oXFxkKyktKFxcZCspJC9pLFxuICAgIHNlbGVjdDogc2luY2VRdWVyeVxuICB9LFxuICBwb3B1bGFyaXR5OiB7XG4gICAgbWF0Y2hlczogWydzaWduJywgJ3BvcHVsYXJpdHknXSxcbiAgICByZWdleHA6IC9eKD49P3w8PT8pXFxzKihcXGQrfFxcZCtcXC5cXGQrfFxcLlxcZCspJSQvLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBwb3B1bGFyaXR5ID0gcGFyc2VGbG9hdChub2RlLnBvcHVsYXJpdHkpXG4gICAgICB2YXIgdXNhZ2UgPSBicm93c2Vyc2xpc3QudXNhZ2UuZ2xvYmFsXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXModXNhZ2UpLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCB2ZXJzaW9uKSB7XG4gICAgICAgIGlmIChub2RlLnNpZ24gPT09ICc+Jykge1xuICAgICAgICAgIGlmICh1c2FnZVt2ZXJzaW9uXSA+IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuc2lnbiA9PT0gJzwnKSB7XG4gICAgICAgICAgaWYgKHVzYWdlW3ZlcnNpb25dIDwgcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPD0nKSB7XG4gICAgICAgICAgaWYgKHVzYWdlW3ZlcnNpb25dIDw9IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHVzYWdlW3ZlcnNpb25dID49IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgIH0sIFtdKVxuICAgIH1cbiAgfSxcbiAgcG9wdWxhcml0eV9pbl9teV9zdGF0czoge1xuICAgIG1hdGNoZXM6IFsnc2lnbicsICdwb3B1bGFyaXR5J10sXG4gICAgcmVnZXhwOiAvXig+PT98PD0/KVxccyooXFxkK3xcXGQrXFwuXFxkK3xcXC5cXGQrKSVcXHMraW5cXHMrbXlcXHMrc3RhdHMkLyxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgcG9wdWxhcml0eSA9IHBhcnNlRmxvYXQobm9kZS5wb3B1bGFyaXR5KVxuICAgICAgaWYgKCFjb250ZXh0LmN1c3RvbVVzYWdlKSB7XG4gICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcignQ3VzdG9tIHVzYWdlIHN0YXRpc3RpY3Mgd2FzIG5vdCBwcm92aWRlZCcpXG4gICAgICB9XG4gICAgICB2YXIgdXNhZ2UgPSBjb250ZXh0LmN1c3RvbVVzYWdlXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXModXNhZ2UpLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCB2ZXJzaW9uKSB7XG4gICAgICAgIHZhciBwZXJjZW50YWdlID0gdXNhZ2VbdmVyc2lvbl1cbiAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChub2RlLnNpZ24gPT09ICc+Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlID4gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPCcpIHtcbiAgICAgICAgICBpZiAocGVyY2VudGFnZSA8IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuc2lnbiA9PT0gJzw9Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlIDw9IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHBlcmNlbnRhZ2UgPj0gcG9wdWxhcml0eSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICBwb3B1bGFyaXR5X2luX2NvbmZpZ19zdGF0czoge1xuICAgIG1hdGNoZXM6IFsnc2lnbicsICdwb3B1bGFyaXR5JywgJ2NvbmZpZyddLFxuICAgIHJlZ2V4cDogL14oPj0/fDw9PylcXHMqKFxcZCt8XFxkK1xcLlxcZCt8XFwuXFxkKyklXFxzK2luXFxzKyhcXFMrKVxccytzdGF0cyQvLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBwb3B1bGFyaXR5ID0gcGFyc2VGbG9hdChub2RlLnBvcHVsYXJpdHkpXG4gICAgICB2YXIgc3RhdHMgPSBlbnYubG9hZFN0YXQoY29udGV4dCwgbm9kZS5jb25maWcsIGJyb3dzZXJzbGlzdC5kYXRhKVxuICAgICAgaWYgKHN0YXRzKSB7XG4gICAgICAgIGNvbnRleHQuY3VzdG9tVXNhZ2UgPSB7fVxuICAgICAgICBmb3IgKHZhciBicm93c2VyIGluIHN0YXRzKSB7XG4gICAgICAgICAgZmlsbFVzYWdlKGNvbnRleHQuY3VzdG9tVXNhZ2UsIGJyb3dzZXIsIHN0YXRzW2Jyb3dzZXJdKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWNvbnRleHQuY3VzdG9tVXNhZ2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKCdDdXN0b20gdXNhZ2Ugc3RhdGlzdGljcyB3YXMgbm90IHByb3ZpZGVkJylcbiAgICAgIH1cbiAgICAgIHZhciB1c2FnZSA9IGNvbnRleHQuY3VzdG9tVXNhZ2VcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyh1c2FnZSkucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZlcnNpb24pIHtcbiAgICAgICAgdmFyIHBlcmNlbnRhZ2UgPSB1c2FnZVt2ZXJzaW9uXVxuICAgICAgICBpZiAocGVyY2VudGFnZSA9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuc2lnbiA9PT0gJz4nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPiBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2ZXJzaW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLnNpZ24gPT09ICc8Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlIDwgcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPD0nKSB7XG4gICAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPD0gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocGVyY2VudGFnZSA+PSBwb3B1bGFyaXR5KSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIHBvcHVsYXJpdHlfaW5fcGxhY2U6IHtcbiAgICBtYXRjaGVzOiBbJ3NpZ24nLCAncG9wdWxhcml0eScsICdwbGFjZSddLFxuICAgIHJlZ2V4cDogL14oPj0/fDw9PylcXHMqKFxcZCt8XFxkK1xcLlxcZCt8XFwuXFxkKyklXFxzK2luXFxzKygoYWx0LSk/XFx3XFx3KSQvLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBwb3B1bGFyaXR5ID0gcGFyc2VGbG9hdChub2RlLnBvcHVsYXJpdHkpXG4gICAgICB2YXIgcGxhY2UgPSBub2RlLnBsYWNlXG4gICAgICBpZiAocGxhY2UubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIHBsYWNlID0gcGxhY2UudG9VcHBlckNhc2UoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGxhY2UgPSBwbGFjZS50b0xvd2VyQ2FzZSgpXG4gICAgICB9XG4gICAgICBlbnYubG9hZENvdW50cnkoYnJvd3NlcnNsaXN0LnVzYWdlLCBwbGFjZSwgYnJvd3NlcnNsaXN0LmRhdGEpXG4gICAgICB2YXIgdXNhZ2UgPSBicm93c2Vyc2xpc3QudXNhZ2VbcGxhY2VdXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXModXNhZ2UpLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCB2ZXJzaW9uKSB7XG4gICAgICAgIHZhciBwZXJjZW50YWdlID0gdXNhZ2VbdmVyc2lvbl1cbiAgICAgICAgaWYgKHBlcmNlbnRhZ2UgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChub2RlLnNpZ24gPT09ICc+Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlID4gcG9wdWxhcml0eSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5zaWduID09PSAnPCcpIHtcbiAgICAgICAgICBpZiAocGVyY2VudGFnZSA8IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuc2lnbiA9PT0gJzw9Jykge1xuICAgICAgICAgIGlmIChwZXJjZW50YWdlIDw9IHBvcHVsYXJpdHkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHBlcmNlbnRhZ2UgPj0gcG9wdWxhcml0eSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHZlcnNpb24pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgfSwgW10pXG4gICAgfVxuICB9LFxuICBjb3Zlcjoge1xuICAgIG1hdGNoZXM6IFsnY292ZXJhZ2UnXSxcbiAgICByZWdleHA6IC9eY292ZXJcXHMrKFxcZCt8XFxkK1xcLlxcZCt8XFwuXFxkKyklJC9pLFxuICAgIHNlbGVjdDogY292ZXJRdWVyeVxuICB9LFxuICBjb3Zlcl9pbjoge1xuICAgIG1hdGNoZXM6IFsnY292ZXJhZ2UnLCAncGxhY2UnXSxcbiAgICByZWdleHA6IC9eY292ZXJcXHMrKFxcZCt8XFxkK1xcLlxcZCt8XFwuXFxkKyklXFxzK2luXFxzKyhteVxccytzdGF0c3woYWx0LSk/XFx3XFx3KSQvaSxcbiAgICBzZWxlY3Q6IGNvdmVyUXVlcnlcbiAgfSxcbiAgc3VwcG9ydHM6IHtcbiAgICBtYXRjaGVzOiBbJ2ZlYXR1cmUnXSxcbiAgICByZWdleHA6IC9ec3VwcG9ydHNcXHMrKFtcXHctXSspJC8sXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgZW52LmxvYWRGZWF0dXJlKGJyb3dzZXJzbGlzdC5jYWNoZSwgbm9kZS5mZWF0dXJlKVxuICAgICAgdmFyIGZlYXR1cmVzID0gYnJvd3NlcnNsaXN0LmNhY2hlW25vZGUuZmVhdHVyZV1cbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhmZWF0dXJlcykucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZlcnNpb24pIHtcbiAgICAgICAgdmFyIGZsYWdzID0gZmVhdHVyZXNbdmVyc2lvbl1cbiAgICAgICAgaWYgKGZsYWdzLmluZGV4T2YoJ3knKSA+PSAwIHx8IGZsYWdzLmluZGV4T2YoJ2EnKSA+PSAwKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmVyc2lvbilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICB9LCBbXSlcbiAgICB9XG4gIH0sXG4gIGVsZWN0cm9uX3JhbmdlOiB7XG4gICAgbWF0Y2hlczogWydmcm9tJywgJ3RvJ10sXG4gICAgcmVnZXhwOiAvXmVsZWN0cm9uXFxzKyhbXFxkLl0rKVxccyotXFxzKihbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgZnJvbVRvVXNlID0gbm9ybWFsaXplRWxlY3Ryb24obm9kZS5mcm9tKVxuICAgICAgdmFyIHRvVG9Vc2UgPSBub3JtYWxpemVFbGVjdHJvbihub2RlLnRvKVxuICAgICAgdmFyIGZyb20gPSBwYXJzZUZsb2F0KG5vZGUuZnJvbSlcbiAgICAgIHZhciB0byA9IHBhcnNlRmxvYXQobm9kZS50bylcbiAgICAgIGlmICghZTJjW2Zyb21Ub1VzZV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEJyb3dzZXJzbGlzdEVycm9yKCdVbmtub3duIHZlcnNpb24gJyArIGZyb20gKyAnIG9mIGVsZWN0cm9uJylcbiAgICAgIH1cbiAgICAgIGlmICghZTJjW3RvVG9Vc2VdKSB7XG4gICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcignVW5rbm93biB2ZXJzaW9uICcgKyB0byArICcgb2YgZWxlY3Ryb24nKVxuICAgICAgfVxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGUyYylcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoaSkge1xuICAgICAgICAgIHZhciBwYXJzZWQgPSBwYXJzZUZsb2F0KGkpXG4gICAgICAgICAgcmV0dXJuIHBhcnNlZCA+PSBmcm9tICYmIHBhcnNlZCA8PSB0b1xuICAgICAgICB9KVxuICAgICAgICAubWFwKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgcmV0dXJuICdjaHJvbWUgJyArIGUyY1tpXVxuICAgICAgICB9KVxuICAgIH1cbiAgfSxcbiAgbm9kZV9yYW5nZToge1xuICAgIG1hdGNoZXM6IFsnZnJvbScsICd0byddLFxuICAgIHJlZ2V4cDogL15ub2RlXFxzKyhbXFxkLl0rKVxccyotXFxzKihbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9uc1xuICAgICAgICAuZmlsdGVyKHNlbXZlckZpbHRlckxvb3NlKCc+PScsIG5vZGUuZnJvbSkpXG4gICAgICAgIC5maWx0ZXIoc2VtdmVyRmlsdGVyTG9vc2UoJzw9Jywgbm9kZS50bykpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICByZXR1cm4gJ25vZGUgJyArIHZcbiAgICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIGJyb3dzZXJfcmFuZ2U6IHtcbiAgICBtYXRjaGVzOiBbJ2Jyb3dzZXInLCAnZnJvbScsICd0byddLFxuICAgIHJlZ2V4cDogL14oXFx3KylcXHMrKFtcXGQuXSspXFxzKi1cXHMqKFtcXGQuXSspJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQsIG5vZGUpIHtcbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHZhciBmcm9tID0gcGFyc2VGbG9hdChub3JtYWxpemVWZXJzaW9uKGRhdGEsIG5vZGUuZnJvbSkgfHwgbm9kZS5mcm9tKVxuICAgICAgdmFyIHRvID0gcGFyc2VGbG9hdChub3JtYWxpemVWZXJzaW9uKGRhdGEsIG5vZGUudG8pIHx8IG5vZGUudG8pXG4gICAgICBmdW5jdGlvbiBmaWx0ZXIodikge1xuICAgICAgICB2YXIgcGFyc2VkID0gcGFyc2VGbG9hdCh2KVxuICAgICAgICByZXR1cm4gcGFyc2VkID49IGZyb20gJiYgcGFyc2VkIDw9IHRvXG4gICAgICB9XG4gICAgICByZXR1cm4gZGF0YS5yZWxlYXNlZC5maWx0ZXIoZmlsdGVyKS5tYXAobmFtZU1hcHBlcihkYXRhLm5hbWUpKVxuICAgIH1cbiAgfSxcbiAgZWxlY3Ryb25fcmF5OiB7XG4gICAgbWF0Y2hlczogWydzaWduJywgJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9eZWxlY3Ryb25cXHMqKD49P3w8PT8pXFxzKihbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgdmVyc2lvblRvVXNlID0gbm9ybWFsaXplRWxlY3Ryb24obm9kZS52ZXJzaW9uKVxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGUyYylcbiAgICAgICAgLmZpbHRlcihnZW5lcmF0ZUZpbHRlcihub2RlLnNpZ24sIHZlcnNpb25Ub1VzZSkpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICByZXR1cm4gJ2Nocm9tZSAnICsgZTJjW2ldXG4gICAgICAgIH0pXG4gICAgfVxuICB9LFxuICBub2RlX3JheToge1xuICAgIG1hdGNoZXM6IFsnc2lnbicsICd2ZXJzaW9uJ10sXG4gICAgcmVnZXhwOiAvXm5vZGVcXHMqKD49P3w8PT8pXFxzKihbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICByZXR1cm4gYnJvd3NlcnNsaXN0Lm5vZGVWZXJzaW9uc1xuICAgICAgICAuZmlsdGVyKGdlbmVyYXRlU2VtdmVyRmlsdGVyKG5vZGUuc2lnbiwgbm9kZS52ZXJzaW9uKSlcbiAgICAgICAgLm1hcChmdW5jdGlvbiAodikge1xuICAgICAgICAgIHJldHVybiAnbm9kZSAnICsgdlxuICAgICAgICB9KVxuICAgIH1cbiAgfSxcbiAgYnJvd3Nlcl9yYXk6IHtcbiAgICBtYXRjaGVzOiBbJ2Jyb3dzZXInLCAnc2lnbicsICd2ZXJzaW9uJ10sXG4gICAgcmVnZXhwOiAvXihcXHcrKVxccyooPj0/fDw9PylcXHMqKFtcXGQuXSspJC8sXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgdmFyIHZlcnNpb24gPSBub2RlLnZlcnNpb25cbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHZhciBhbGlhcyA9IGJyb3dzZXJzbGlzdC52ZXJzaW9uQWxpYXNlc1tkYXRhLm5hbWVdW3ZlcnNpb25dXG4gICAgICBpZiAoYWxpYXMpIHZlcnNpb24gPSBhbGlhc1xuICAgICAgcmV0dXJuIGRhdGEucmVsZWFzZWRcbiAgICAgICAgLmZpbHRlcihnZW5lcmF0ZUZpbHRlcihub2RlLnNpZ24sIHZlcnNpb24pKVxuICAgICAgICAubWFwKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGEubmFtZSArICcgJyArIHZcbiAgICAgICAgfSlcbiAgICB9XG4gIH0sXG4gIGZpcmVmb3hfZXNyOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXihmaXJlZm94fGZmfGZ4KVxccytlc3IkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gWydmaXJlZm94IDEwMiddXG4gICAgfVxuICB9LFxuICBvcGVyYV9taW5pX2FsbDoge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogLyhvcGVyYW1pbml8b3BfbWluaSlcXHMrYWxsL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gWydvcF9taW5pIGFsbCddXG4gICAgfVxuICB9LFxuICBlbGVjdHJvbl92ZXJzaW9uOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9uJ10sXG4gICAgcmVnZXhwOiAvXmVsZWN0cm9uXFxzKyhbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgdmVyc2lvblRvVXNlID0gbm9ybWFsaXplRWxlY3Ryb24obm9kZS52ZXJzaW9uKVxuICAgICAgdmFyIGNocm9tZSA9IGUyY1t2ZXJzaW9uVG9Vc2VdXG4gICAgICBpZiAoIWNocm9tZSkge1xuICAgICAgICB0aHJvdyBuZXcgQnJvd3NlcnNsaXN0RXJyb3IoXG4gICAgICAgICAgJ1Vua25vd24gdmVyc2lvbiAnICsgbm9kZS52ZXJzaW9uICsgJyBvZiBlbGVjdHJvbidcbiAgICAgICAgKVxuICAgICAgfVxuICAgICAgcmV0dXJuIFsnY2hyb21lICcgKyBjaHJvbWVdXG4gICAgfVxuICB9LFxuICBub2RlX21ham9yX3ZlcnNpb246IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9ebm9kZVxccysoXFxkKykkL2ksXG4gICAgc2VsZWN0OiBub2RlUXVlcnlcbiAgfSxcbiAgbm9kZV9taW5vcl92ZXJzaW9uOiB7XG4gICAgbWF0Y2hlczogWyd2ZXJzaW9uJ10sXG4gICAgcmVnZXhwOiAvXm5vZGVcXHMrKFxcZCtcXC5cXGQrKSQvaSxcbiAgICBzZWxlY3Q6IG5vZGVRdWVyeVxuICB9LFxuICBub2RlX3BhdGNoX3ZlcnNpb246IHtcbiAgICBtYXRjaGVzOiBbJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9ebm9kZVxccysoXFxkK1xcLlxcZCtcXC5cXGQrKSQvaSxcbiAgICBzZWxlY3Q6IG5vZGVRdWVyeVxuICB9LFxuICBjdXJyZW50X25vZGU6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eY3VycmVudFxccytub2RlJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgIHJldHVybiBbZW52LmN1cnJlbnROb2RlKHJlc29sdmUsIGNvbnRleHQpXVxuICAgIH1cbiAgfSxcbiAgbWFpbnRhaW5lZF9ub2RlOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXm1haW50YWluZWRcXHMrbm9kZVxccyt2ZXJzaW9ucyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKVxuICAgICAgdmFyIHF1ZXJpZXMgPSBPYmplY3Qua2V5cyhqc0VPTClcbiAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIG5vdyA8IERhdGUucGFyc2UoanNFT0xba2V5XS5lbmQpICYmXG4gICAgICAgICAgICBub3cgPiBEYXRlLnBhcnNlKGpzRU9MW2tleV0uc3RhcnQpICYmXG4gICAgICAgICAgICBpc0VvbFJlbGVhc2VkKGtleSlcbiAgICAgICAgICApXG4gICAgICAgIH0pXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgIHJldHVybiAnbm9kZSAnICsga2V5LnNsaWNlKDEpXG4gICAgICAgIH0pXG4gICAgICByZXR1cm4gcmVzb2x2ZShxdWVyaWVzLCBjb250ZXh0KVxuICAgIH1cbiAgfSxcbiAgcGhhbnRvbWpzXzFfOToge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogL15waGFudG9tanNcXHMrMS45JC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFsnc2FmYXJpIDUnXVxuICAgIH1cbiAgfSxcbiAgcGhhbnRvbWpzXzJfMToge1xuICAgIG1hdGNoZXM6IFtdLFxuICAgIHJlZ2V4cDogL15waGFudG9tanNcXHMrMi4xJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFsnc2FmYXJpIDYnXVxuICAgIH1cbiAgfSxcbiAgYnJvd3Nlcl92ZXJzaW9uOiB7XG4gICAgbWF0Y2hlczogWydicm93c2VyJywgJ3ZlcnNpb24nXSxcbiAgICByZWdleHA6IC9eKFxcdyspXFxzKyh0cHxbXFxkLl0rKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICB2YXIgdmVyc2lvbiA9IG5vZGUudmVyc2lvblxuICAgICAgaWYgKC9edHAkL2kudGVzdCh2ZXJzaW9uKSkgdmVyc2lvbiA9ICdUUCdcbiAgICAgIHZhciBkYXRhID0gY2hlY2tOYW1lKG5vZGUuYnJvd3NlciwgY29udGV4dClcbiAgICAgIHZhciBhbGlhcyA9IG5vcm1hbGl6ZVZlcnNpb24oZGF0YSwgdmVyc2lvbilcbiAgICAgIGlmIChhbGlhcykge1xuICAgICAgICB2ZXJzaW9uID0gYWxpYXNcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh2ZXJzaW9uLmluZGV4T2YoJy4nKSA9PT0gLTEpIHtcbiAgICAgICAgICBhbGlhcyA9IHZlcnNpb24gKyAnLjAnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWxpYXMgPSB2ZXJzaW9uLnJlcGxhY2UoL1xcLjAkLywgJycpXG4gICAgICAgIH1cbiAgICAgICAgYWxpYXMgPSBub3JtYWxpemVWZXJzaW9uKGRhdGEsIGFsaWFzKVxuICAgICAgICBpZiAoYWxpYXMpIHtcbiAgICAgICAgICB2ZXJzaW9uID0gYWxpYXNcbiAgICAgICAgfSBlbHNlIGlmIChjb250ZXh0Lmlnbm9yZVVua25vd25WZXJzaW9ucykge1xuICAgICAgICAgIHJldHVybiBbXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICAgICAgICdVbmtub3duIHZlcnNpb24gJyArIHZlcnNpb24gKyAnIG9mICcgKyBub2RlLmJyb3dzZXJcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBbZGF0YS5uYW1lICsgJyAnICsgdmVyc2lvbl1cbiAgICB9XG4gIH0sXG4gIGJyb3dzZXJzbGlzdF9jb25maWc6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eYnJvd3NlcnNsaXN0IGNvbmZpZyQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgICByZXR1cm4gYnJvd3NlcnNsaXN0KHVuZGVmaW5lZCwgY29udGV4dClcbiAgICB9XG4gIH0sXG4gIGV4dGVuZHM6IHtcbiAgICBtYXRjaGVzOiBbJ2NvbmZpZyddLFxuICAgIHJlZ2V4cDogL15leHRlbmRzICguKykkL2ksXG4gICAgc2VsZWN0OiBmdW5jdGlvbiAoY29udGV4dCwgbm9kZSkge1xuICAgICAgcmV0dXJuIHJlc29sdmUoZW52LmxvYWRRdWVyaWVzKGNvbnRleHQsIG5vZGUuY29uZmlnKSwgY29udGV4dClcbiAgICB9XG4gIH0sXG4gIGRlZmF1bHRzOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXmRlZmF1bHRzJC9pLFxuICAgIHNlbGVjdDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgIHJldHVybiByZXNvbHZlKGJyb3dzZXJzbGlzdC5kZWZhdWx0cywgY29udGV4dClcbiAgICB9XG4gIH0sXG4gIGRlYWQ6IHtcbiAgICBtYXRjaGVzOiBbXSxcbiAgICByZWdleHA6IC9eZGVhZCQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgICB2YXIgZGVhZCA9IFtcbiAgICAgICAgJ0JhaWR1ID49IDAnLFxuICAgICAgICAnaWUgPD0gMTEnLFxuICAgICAgICAnaWVfbW9iIDw9IDExJyxcbiAgICAgICAgJ2JiIDw9IDEwJyxcbiAgICAgICAgJ29wX21vYiA8PSAxMi4xJyxcbiAgICAgICAgJ3NhbXN1bmcgNCdcbiAgICAgIF1cbiAgICAgIHJldHVybiByZXNvbHZlKGRlYWQsIGNvbnRleHQpXG4gICAgfVxuICB9LFxuICB1bmtub3duOiB7XG4gICAgbWF0Y2hlczogW10sXG4gICAgcmVnZXhwOiAvXihcXHcrKSQvaSxcbiAgICBzZWxlY3Q6IGZ1bmN0aW9uIChjb250ZXh0LCBub2RlKSB7XG4gICAgICBpZiAoYnlOYW1lKG5vZGUucXVlcnksIGNvbnRleHQpKSB7XG4gICAgICAgIHRocm93IG5ldyBCcm93c2Vyc2xpc3RFcnJvcihcbiAgICAgICAgICAnU3BlY2lmeSB2ZXJzaW9ucyBpbiBCcm93c2Vyc2xpc3QgcXVlcnkgZm9yIGJyb3dzZXIgJyArIG5vZGUucXVlcnlcbiAgICAgICAgKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgdW5rbm93blF1ZXJ5KG5vZGUucXVlcnkpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8vIEdldCBhbmQgY29udmVydCBDYW4gSSBVc2UgZGF0YVxuXG47KGZ1bmN0aW9uICgpIHtcbiAgZm9yICh2YXIgbmFtZSBpbiBhZ2VudHMpIHtcbiAgICB2YXIgYnJvd3NlciA9IGFnZW50c1tuYW1lXVxuICAgIGJyb3dzZXJzbGlzdC5kYXRhW25hbWVdID0ge1xuICAgICAgbmFtZTogbmFtZSxcbiAgICAgIHZlcnNpb25zOiBub3JtYWxpemUoYWdlbnRzW25hbWVdLnZlcnNpb25zKSxcbiAgICAgIHJlbGVhc2VkOiBub3JtYWxpemUoYWdlbnRzW25hbWVdLnZlcnNpb25zLnNsaWNlKDAsIC0zKSksXG4gICAgICByZWxlYXNlRGF0ZTogYWdlbnRzW25hbWVdLnJlbGVhc2VfZGF0ZVxuICAgIH1cbiAgICBmaWxsVXNhZ2UoYnJvd3NlcnNsaXN0LnVzYWdlLmdsb2JhbCwgbmFtZSwgYnJvd3Nlci51c2FnZV9nbG9iYWwpXG5cbiAgICBicm93c2Vyc2xpc3QudmVyc2lvbkFsaWFzZXNbbmFtZV0gPSB7fVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnJvd3Nlci52ZXJzaW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGZ1bGwgPSBicm93c2VyLnZlcnNpb25zW2ldXG4gICAgICBpZiAoIWZ1bGwpIGNvbnRpbnVlXG5cbiAgICAgIGlmIChmdWxsLmluZGV4T2YoJy0nKSAhPT0gLTEpIHtcbiAgICAgICAgdmFyIGludGVydmFsID0gZnVsbC5zcGxpdCgnLScpXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgaW50ZXJ2YWwubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBicm93c2Vyc2xpc3QudmVyc2lvbkFsaWFzZXNbbmFtZV1baW50ZXJ2YWxbal1dID0gZnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYnJvd3NlcnNsaXN0LnZlcnNpb25BbGlhc2VzLm9wX21vYlsnNTknXSA9ICc1OCdcblxuICBicm93c2Vyc2xpc3Qubm9kZVZlcnNpb25zID0ganNSZWxlYXNlcy5tYXAoZnVuY3Rpb24gKHJlbGVhc2UpIHtcbiAgICByZXR1cm4gcmVsZWFzZS52ZXJzaW9uXG4gIH0pXG59KSgpXG5cbm1vZHVsZS5leHBvcnRzID0gYnJvd3NlcnNsaXN0XG4iLCJ2YXIgQU5EX1JFR0VYUCA9IC9eXFxzK2FuZFxccysoLiopL2lcbnZhciBPUl9SRUdFWFAgPSAvXig/OixcXHMqfFxccytvclxccyspKC4qKS9pXG5cbmZ1bmN0aW9uIGZsYXR0ZW4oYXJyYXkpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGFycmF5KSkgcmV0dXJuIFthcnJheV1cbiAgcmV0dXJuIGFycmF5LnJlZHVjZShmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiBhLmNvbmNhdChmbGF0dGVuKGIpKVxuICB9LCBbXSlcbn1cblxuZnVuY3Rpb24gZmluZChzdHJpbmcsIHByZWRpY2F0ZSkge1xuICBmb3IgKHZhciBuID0gMSwgbWF4ID0gc3RyaW5nLmxlbmd0aDsgbiA8PSBtYXg7IG4rKykge1xuICAgIHZhciBwYXJzZWQgPSBzdHJpbmcuc3Vic3RyKC1uLCBuKVxuICAgIGlmIChwcmVkaWNhdGUocGFyc2VkLCBuLCBtYXgpKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnNsaWNlKDAsIC1uKVxuICAgIH1cbiAgfVxuICByZXR1cm4gJydcbn1cblxuZnVuY3Rpb24gbWF0Y2hRdWVyeShhbGwsIHF1ZXJ5KSB7XG4gIHZhciBub2RlID0geyBxdWVyeTogcXVlcnkgfVxuICBpZiAocXVlcnkuaW5kZXhPZignbm90ICcpID09PSAwKSB7XG4gICAgbm9kZS5ub3QgPSB0cnVlXG4gICAgcXVlcnkgPSBxdWVyeS5zbGljZSg0KVxuICB9XG5cbiAgZm9yICh2YXIgbmFtZSBpbiBhbGwpIHtcbiAgICB2YXIgdHlwZSA9IGFsbFtuYW1lXVxuICAgIHZhciBtYXRjaCA9IHF1ZXJ5Lm1hdGNoKHR5cGUucmVnZXhwKVxuICAgIGlmIChtYXRjaCkge1xuICAgICAgbm9kZS50eXBlID0gbmFtZVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlLm1hdGNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbm9kZVt0eXBlLm1hdGNoZXNbaV1dID0gbWF0Y2hbaSArIDFdXG4gICAgICB9XG4gICAgICByZXR1cm4gbm9kZVxuICAgIH1cbiAgfVxuXG4gIG5vZGUudHlwZSA9ICd1bmtub3duJ1xuICByZXR1cm4gbm9kZVxufVxuXG5mdW5jdGlvbiBtYXRjaEJsb2NrKGFsbCwgc3RyaW5nLCBxcykge1xuICB2YXIgbm9kZVxuICByZXR1cm4gZmluZChzdHJpbmcsIGZ1bmN0aW9uIChwYXJzZWQsIG4sIG1heCkge1xuICAgIGlmIChBTkRfUkVHRVhQLnRlc3QocGFyc2VkKSkge1xuICAgICAgbm9kZSA9IG1hdGNoUXVlcnkoYWxsLCBwYXJzZWQubWF0Y2goQU5EX1JFR0VYUClbMV0pXG4gICAgICBub2RlLmNvbXBvc2UgPSAnYW5kJ1xuICAgICAgcXMudW5zaGlmdChub2RlKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9IGVsc2UgaWYgKE9SX1JFR0VYUC50ZXN0KHBhcnNlZCkpIHtcbiAgICAgIG5vZGUgPSBtYXRjaFF1ZXJ5KGFsbCwgcGFyc2VkLm1hdGNoKE9SX1JFR0VYUClbMV0pXG4gICAgICBub2RlLmNvbXBvc2UgPSAnb3InXG4gICAgICBxcy51bnNoaWZ0KG5vZGUpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0gZWxzZSBpZiAobiA9PT0gbWF4KSB7XG4gICAgICBub2RlID0gbWF0Y2hRdWVyeShhbGwsIHBhcnNlZC50cmltKCkpXG4gICAgICBub2RlLmNvbXBvc2UgPSAnb3InXG4gICAgICBxcy51bnNoaWZ0KG5vZGUpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZShhbGwsIHF1ZXJpZXMpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHF1ZXJpZXMpKSBxdWVyaWVzID0gW3F1ZXJpZXNdXG4gIHJldHVybiBmbGF0dGVuKFxuICAgIHF1ZXJpZXMubWFwKGZ1bmN0aW9uIChibG9jaykge1xuICAgICAgdmFyIHFzID0gW11cbiAgICAgIGRvIHtcbiAgICAgICAgYmxvY2sgPSBtYXRjaEJsb2NrKGFsbCwgYmxvY2ssIHFzKVxuICAgICAgfSB3aGlsZSAoYmxvY2spXG4gICAgICByZXR1cm4gcXNcbiAgICB9KVxuICApXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBHZXRJbnRyaW5zaWMgPSByZXF1aXJlKCdnZXQtaW50cmluc2ljJyk7XG5cbnZhciBjYWxsQmluZCA9IHJlcXVpcmUoJy4vJyk7XG5cbnZhciAkaW5kZXhPZiA9IGNhbGxCaW5kKEdldEludHJpbnNpYygnU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mJykpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNhbGxCb3VuZEludHJpbnNpYyhuYW1lLCBhbGxvd01pc3NpbmcpIHtcblx0dmFyIGludHJpbnNpYyA9IEdldEludHJpbnNpYyhuYW1lLCAhIWFsbG93TWlzc2luZyk7XG5cdGlmICh0eXBlb2YgaW50cmluc2ljID09PSAnZnVuY3Rpb24nICYmICRpbmRleE9mKG5hbWUsICcucHJvdG90eXBlLicpID4gLTEpIHtcblx0XHRyZXR1cm4gY2FsbEJpbmQoaW50cmluc2ljKTtcblx0fVxuXHRyZXR1cm4gaW50cmluc2ljO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGJpbmQgPSByZXF1aXJlKCdmdW5jdGlvbi1iaW5kJyk7XG52YXIgR2V0SW50cmluc2ljID0gcmVxdWlyZSgnZ2V0LWludHJpbnNpYycpO1xuXG52YXIgJGFwcGx5ID0gR2V0SW50cmluc2ljKCclRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5JScpO1xudmFyICRjYWxsID0gR2V0SW50cmluc2ljKCclRnVuY3Rpb24ucHJvdG90eXBlLmNhbGwlJyk7XG52YXIgJHJlZmxlY3RBcHBseSA9IEdldEludHJpbnNpYygnJVJlZmxlY3QuYXBwbHklJywgdHJ1ZSkgfHwgYmluZC5jYWxsKCRjYWxsLCAkYXBwbHkpO1xuXG52YXIgJGdPUEQgPSBHZXRJbnRyaW5zaWMoJyVPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yJScsIHRydWUpO1xudmFyICRkZWZpbmVQcm9wZXJ0eSA9IEdldEludHJpbnNpYygnJU9iamVjdC5kZWZpbmVQcm9wZXJ0eSUnLCB0cnVlKTtcbnZhciAkbWF4ID0gR2V0SW50cmluc2ljKCclTWF0aC5tYXglJyk7XG5cbmlmICgkZGVmaW5lUHJvcGVydHkpIHtcblx0dHJ5IHtcblx0XHQkZGVmaW5lUHJvcGVydHkoe30sICdhJywgeyB2YWx1ZTogMSB9KTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdC8vIElFIDggaGFzIGEgYnJva2VuIGRlZmluZVByb3BlcnR5XG5cdFx0JGRlZmluZVByb3BlcnR5ID0gbnVsbDtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNhbGxCaW5kKG9yaWdpbmFsRnVuY3Rpb24pIHtcblx0dmFyIGZ1bmMgPSAkcmVmbGVjdEFwcGx5KGJpbmQsICRjYWxsLCBhcmd1bWVudHMpO1xuXHRpZiAoJGdPUEQgJiYgJGRlZmluZVByb3BlcnR5KSB7XG5cdFx0dmFyIGRlc2MgPSAkZ09QRChmdW5jLCAnbGVuZ3RoJyk7XG5cdFx0aWYgKGRlc2MuY29uZmlndXJhYmxlKSB7XG5cdFx0XHQvLyBvcmlnaW5hbCBsZW5ndGgsIHBsdXMgdGhlIHJlY2VpdmVyLCBtaW51cyBhbnkgYWRkaXRpb25hbCBhcmd1bWVudHMgKGFmdGVyIHRoZSByZWNlaXZlcilcblx0XHRcdCRkZWZpbmVQcm9wZXJ0eShcblx0XHRcdFx0ZnVuYyxcblx0XHRcdFx0J2xlbmd0aCcsXG5cdFx0XHRcdHsgdmFsdWU6IDEgKyAkbWF4KDAsIG9yaWdpbmFsRnVuY3Rpb24ubGVuZ3RoIC0gKGFyZ3VtZW50cy5sZW5ndGggLSAxKSkgfVxuXHRcdFx0KTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIGZ1bmM7XG59O1xuXG52YXIgYXBwbHlCaW5kID0gZnVuY3Rpb24gYXBwbHlCaW5kKCkge1xuXHRyZXR1cm4gJHJlZmxlY3RBcHBseShiaW5kLCAkYXBwbHksIGFyZ3VtZW50cyk7XG59O1xuXG5pZiAoJGRlZmluZVByb3BlcnR5KSB7XG5cdCRkZWZpbmVQcm9wZXJ0eShtb2R1bGUuZXhwb3J0cywgJ2FwcGx5JywgeyB2YWx1ZTogYXBwbHlCaW5kIH0pO1xufSBlbHNlIHtcblx0bW9kdWxlLmV4cG9ydHMuYXBwbHkgPSBhcHBseUJpbmQ7XG59XG4iLCJtb2R1bGUuZXhwb3J0cz17QTp7QTp7SjowLjAxMzEyMTcsRDowLjAwNjIxMTUyLEU6MC4wNTgxMjQ2LEY6MC4wNzc0OTk1LEE6MC4wMDk2ODc0MyxCOjAuNTcxNTU5LFwiOUJcIjowLjAwOTI5OH0sQjpcIm1zXCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCI5QlwiLFwiSlwiLFwiRFwiLFwiRVwiLFwiRlwiLFwiQVwiLFwiQlwiLFwiXCIsXCJcIixcIlwiXSxFOlwiSUVcIixGOntcIjlCXCI6OTYyMzIzMjAwLEo6OTk4ODcwNDAwLEQ6MTE2MTEyOTYwMCxFOjEyMzc0MjA4MDAsRjoxMzAwMDYwODAwLEE6MTM0NjcxNjgwMCxCOjEzODE5NjgwMDB9fSxCOntBOntDOjAuMDAzNzczLEs6MC4wMDQyNjcsTDowLjAwNDI2OCxHOjAuMDAzNzczLE06MC4wMDM3MDIsTjowLjAwMzc3MyxPOjAuMDE1MDkyLFA6MCxROjAuMDA0Mjk4LFI6MC4wMDk0NCxTOjAuMDA0MDQzLFQ6MC4wMDM3NzMsVTowLjAwMzc3MyxWOjAuMDAzOTc0LFc6MC4wMDM5MDEsWDowLjAwNDMxOCxZOjAuMDAzNzczLFo6MC4wMDQxMTgsYTowLjAwMzkzOSxiOjAuMDA3NTQ2LGU6MC4wMDQxMTgsZjowLjAwMzkzOSxnOjAuMDAzODAxLGg6MC4wMDM5MDEsaTowLjAwMzg1NSxqOjAuMDAzOTI5LGs6MC4wMDM5MDEsbDowLjAwMzc3MyxtOjAuMDA3NTQ2LG46MC4wMDM3NzMsbzowLjAxMTMxOSxwOjAuMDExMzE5LHE6MC4wMTg4NjUscjowLjAzMzk1NyxjOjEuMTM5NDUsSDoyLjg1MjM5fSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIkNcIixcIktcIixcIkxcIixcIkdcIixcIk1cIixcIk5cIixcIk9cIixcIlBcIixcIlFcIixcIlJcIixcIlNcIixcIlRcIixcIlVcIixcIlZcIixcIldcIixcIlhcIixcIllcIixcIlpcIixcImFcIixcImJcIixcImVcIixcImZcIixcImdcIixcImhcIixcImlcIixcImpcIixcImtcIixcImxcIixcIm1cIixcIm5cIixcIm9cIixcInBcIixcInFcIixcInJcIixcImNcIixcIkhcIixcIlwiLFwiXCIsXCJcIl0sRTpcIkVkZ2VcIixGOntDOjE0MzgxMjgwMDAsSzoxNDQ3Mjg2NDAwLEw6MTQ3MDA5NjAwMCxHOjE0OTE4Njg4MDAsTToxNTA4MTk4NDAwLE46MTUyNTA0NjQwMCxPOjE1NDIwNjcyMDAsUDoxNTc5MDQ2NDAwLFE6MTU4MTAzMzYwMCxSOjE1ODY3MzYwMDAsUzoxNTkwMDE5MjAwLFQ6MTU5NDg1NzYwMCxVOjE1OTg0ODY0MDAsVjoxNjAyMjAxNjAwLFc6MTYwNTgzMDQwMCxYOjE2MTEzNjAwMDAsWToxNjE0ODE2MDAwLFo6MTYxODM1ODQwMCxhOjE2MjIwNzM2MDAsYjoxNjI2OTEyMDAwLGU6MTYzMDYyNzIwMCxmOjE2MzI0NDE2MDAsZzoxNjM0Nzc0NDAwLGg6MTYzNzUzOTIwMCxpOjE2NDE0MjcyMDAsajoxNjQzOTMyODAwLGs6MTY0NjI2NTYwMCxsOjE2NDk2MzUyMDAsbToxNjUxMTkwNDAwLG46MTY1Mzk1NTIwMCxvOjE2NTU5NDI0MDAscDoxNjU5NjU3NjAwLHE6MTY2MTk5MDQwMCxyOjE2NjQ3NTUyMDAsYzoxNjY2OTE1MjAwLEg6MTY3MDE5ODQwMH0sRDp7QzpcIm1zXCIsSzpcIm1zXCIsTDpcIm1zXCIsRzpcIm1zXCIsTTpcIm1zXCIsTjpcIm1zXCIsTzpcIm1zXCJ9fSxDOntBOntcIjBcIjowLjAwNDMxNyxcIjFcIjowLjAwNDM5MyxcIjJcIjowLjAwNDQxOCxcIjNcIjowLjAwODgzNCxcIjRcIjowLjAwODMyMixcIjVcIjowLjAwODkyOCxcIjZcIjowLjAwNDQ3MSxcIjdcIjowLjAwOTI4NCxcIjhcIjowLjAwNDcwNyxcIjlcIjowLjAwOTA3NixBQzowLjAwNDExOCxyQjowLjAwNDI3MSxJOjAuMDExNzAzLHM6MC4wMDQ4NzksSjowLjAyMDEzNixEOjAuMDA1NzI1LEU6MC4wMDQ1MjUsRjowLjAwNTMzLEE6MC4wMDQyODMsQjowLjAwNzU0NixDOjAuMDA0NDcxLEs6MC4wMDQ0ODYsTDowLjAwNDUzLEc6MC4wMDgzMjIsTTowLjAwNDQxNyxOOjAuMDA0NDI1LE86MC4wMDQxNjEsdDowLjAwNDQ0Myx1OjAuMDA0MjgzLHY6MC4wMDgzMjIsdzowLjAxMzY5OCx4OjAuMDA0MTYxLHk6MC4wMDg3ODYsejowLjAwNDExOCxBQjowLjAwNzU0NixCQjowLjAwNDc4MyxDQjowLjAwMzkyOSxEQjowLjAwNDc4MyxFQjowLjAwNDg3LEZCOjAuMDA1MDI5LEdCOjAuMDA0NyxIQjowLjA5NDMyNSxJQjowLjAwNzU0NixKQjowLjAwMzg2NyxLQjowLjAwNDUyNSxMQjowLjAwNDI5MyxNQjowLjAwMzc3MyxOQjowLjAwNDUzOCxPQjowLjAwODI4MixQQjowLjAxMTYwMSxRQjowLjA1MjgyMixSQjowLjAxMTYwMSxTQjowLjAwMzkyOSxUQjowLjAwMzk3NCxVQjowLjAwNzU0NixWQjowLjAxMTYwMSxXQjowLjAwMzkzOSxzQjowLjAwMzc3MyxYQjowLjAwMzkyOSx0QjowLjAwNDM1NixZQjowLjAwNDQyNSxaQjowLjAwODMyMixhQjowLjAwNDE1LGJCOjAuMDA0MjY3LGNCOjAuMDAzODAxLGRCOjAuMDA0MjY3LGVCOjAuMDAzNzczLGZCOjAuMDA0MTUsZ0I6MC4wMDQyOTMsaEI6MC4wMDQ0MjUsZDowLjAwMzc3MyxpQjowLjAwNDE1LGpCOjAuMDA0MTUsa0I6MC4wMDQzMTgsbEI6MC4wMDQzNTYsbUI6MC4wMDM5NzQsbkI6MC4wMzM5NTcsUDowLjAwMzc3MyxROjAuMDAzNzczLFI6MC4wMDM3NzMsdUI6MC4wMDM3NzMsUzowLjAwMzc3MyxUOjAuMDAzOTI5LFU6MC4wMDQyNjgsVjowLjAwMzgwMSxXOjAuMDExMzE5LFg6MC4wMDc1NDYsWTowLjAwMzc3MyxaOjAuMDAzNzczLGE6MC4wMTg4NjUsYjowLjAwMzgwMSxlOjAuMDAzODU1LGY6MC4wMTg4NjUsZzowLjAwMzc3MyxoOjAuMDAzNzczLGk6MC4wMDM5MDEsajowLjAwMzkwMSxrOjAuMDA3NTQ2LGw6MC4wMDc1NDYsbTowLjAwNzU0NixuOjAuMDgzMDA2LG86MC4wMzAxODQscDowLjAxNTA5MixxOjAuMDMwMTg0LHI6MC4wNDkwNDksYzoxLjEyMDU4LEg6MC45Mzk0NzcsdkI6MC4wMTEzMTksd0I6MCxCQzowLjAwODc4NixDQzowLjAwNDg3fSxCOlwibW96XCIsQzpbXCJBQ1wiLFwickJcIixcIkJDXCIsXCJDQ1wiLFwiSVwiLFwic1wiLFwiSlwiLFwiRFwiLFwiRVwiLFwiRlwiLFwiQVwiLFwiQlwiLFwiQ1wiLFwiS1wiLFwiTFwiLFwiR1wiLFwiTVwiLFwiTlwiLFwiT1wiLFwidFwiLFwidVwiLFwidlwiLFwid1wiLFwieFwiLFwieVwiLFwielwiLFwiMFwiLFwiMVwiLFwiMlwiLFwiM1wiLFwiNFwiLFwiNVwiLFwiNlwiLFwiN1wiLFwiOFwiLFwiOVwiLFwiQUJcIixcIkJCXCIsXCJDQlwiLFwiREJcIixcIkVCXCIsXCJGQlwiLFwiR0JcIixcIkhCXCIsXCJJQlwiLFwiSkJcIixcIktCXCIsXCJMQlwiLFwiTUJcIixcIk5CXCIsXCJPQlwiLFwiUEJcIixcIlFCXCIsXCJSQlwiLFwiU0JcIixcIlRCXCIsXCJVQlwiLFwiVkJcIixcIldCXCIsXCJzQlwiLFwiWEJcIixcInRCXCIsXCJZQlwiLFwiWkJcIixcImFCXCIsXCJiQlwiLFwiY0JcIixcImRCXCIsXCJlQlwiLFwiZkJcIixcImdCXCIsXCJoQlwiLFwiZFwiLFwiaUJcIixcImpCXCIsXCJrQlwiLFwibEJcIixcIm1CXCIsXCJuQlwiLFwiUFwiLFwiUVwiLFwiUlwiLFwidUJcIixcIlNcIixcIlRcIixcIlVcIixcIlZcIixcIldcIixcIlhcIixcIllcIixcIlpcIixcImFcIixcImJcIixcImVcIixcImZcIixcImdcIixcImhcIixcImlcIixcImpcIixcImtcIixcImxcIixcIm1cIixcIm5cIixcIm9cIixcInBcIixcInFcIixcInJcIixcImNcIixcIkhcIixcInZCXCIsXCJ3QlwiLFwiXCJdLEU6XCJGaXJlZm94XCIsRjp7XCIwXCI6MTM4NjYzMzYwMCxcIjFcIjoxMzkxNDcyMDAwLFwiMlwiOjEzOTUxMDA4MDAsXCIzXCI6MTM5ODcyOTYwMCxcIjRcIjoxNDAyMzU4NDAwLFwiNVwiOjE0MDU5ODcyMDAsXCI2XCI6MTQwOTYxNjAwMCxcIjdcIjoxNDEzMjQ0ODAwLFwiOFwiOjE0MTczOTIwMDAsXCI5XCI6MTQyMTEwNzIwMCxBQzoxMTYxNjQ4MDAwLHJCOjEyMTM2NjA4MDAsQkM6MTI0NjMyMDAwMCxDQzoxMjY0MDMyMDAwLEk6MTMwMDc1MjAwMCxzOjEzMDg2MTQ0MDAsSjoxMzEzNDUyODAwLEQ6MTMxNzA4MTYwMCxFOjEzMTcwODE2MDAsRjoxMzIwNzEwNDAwLEE6MTMyNDMzOTIwMCxCOjEzMjc5NjgwMDAsQzoxMzMxNTk2ODAwLEs6MTMzNTIyNTYwMCxMOjEzMzg4NTQ0MDAsRzoxMzQyNDgzMjAwLE06MTM0NjExMjAwMCxOOjEzNDk3NDA4MDAsTzoxMzUzNjI4ODAwLHQ6MTM1NzYwMzIwMCx1OjEzNjEyMzIwMDAsdjoxMzY0ODYwODAwLHc6MTM2ODQ4OTYwMCx4OjEzNzIxMTg0MDAseToxMzc1NzQ3MjAwLHo6MTM3OTM3NjAwMCxBQjoxNDI0NzM2MDAwLEJCOjE0MjgyNzg0MDAsQ0I6MTQzMTQ3NTIwMCxEQjoxNDM1ODgxNjAwLEVCOjE0MzkyNTEyMDAsRkI6MTQ0Mjg4MDAwMCxHQjoxNDQ2NTA4ODAwLEhCOjE0NTAxMzc2MDAsSUI6MTQ1Mzg1MjgwMCxKQjoxNDU3Mzk1MjAwLEtCOjE0NjE2Mjg4MDAsTEI6MTQ2NTI1NzYwMCxNQjoxNDcwMDk2MDAwLE5COjE0NzQzMjk2MDAsT0I6MTQ3OTE2ODAwMCxQQjoxNDg1MjE2MDAwLFFCOjE0ODg4NDQ4MDAsUkI6MTQ5MjU2MDAwMCxTQjoxNDk3MzEyMDAwLFRCOjE1MDIxNTA0MDAsVUI6MTUwNjU1NjgwMCxWQjoxNTEwNjE3NjAwLFdCOjE1MTY2NjU2MDAsc0I6MTUyMDk4NTYwMCxYQjoxNTI1ODI0MDAwLHRCOjE1Mjk5NzEyMDAsWUI6MTUzNjEwNTYwMCxaQjoxNTQwMjUyODAwLGFCOjE1NDQ0ODY0MDAsYkI6MTU0ODcyMDAwMCxjQjoxNTUyOTUzNjAwLGRCOjE1NTgzOTY4MDAsZUI6MTU2MjYzMDQwMCxmQjoxNTY3NDY4ODAwLGdCOjE1NzE3ODg4MDAsaEI6MTU3NTMzMTIwMCxkOjE1NzgzNTUyMDAsaUI6MTU4MTM3OTIwMCxqQjoxNTgzNzk4NDAwLGtCOjE1ODYzMDQwMDAsbEI6MTU4ODYzNjgwMCxtQjoxNTkxMDU2MDAwLG5COjE1OTM0NzUyMDAsUDoxNTk1ODk0NDAwLFE6MTU5ODMxMzYwMCxSOjE2MDA3MzI4MDAsdUI6MTYwMzE1MjAwMCxTOjE2MDU1NzEyMDAsVDoxNjA3OTkwNDAwLFU6MTYxMTYxOTIwMCxWOjE2MTQwMzg0MDAsVzoxNjE2NDU3NjAwLFg6MTYxODc5MDQwMCxZOjE2MjI1MDU2MDAsWjoxNjI2MTM0NDAwLGE6MTYyODU1MzYwMCxiOjE2MzA5NzI4MDAsZToxNjMzMzkyMDAwLGY6MTYzNTgxMTIwMCxnOjE2Mzg4MzUyMDAsaDoxNjQxODU5MjAwLGk6MTY0NDM2NDgwMCxqOjE2NDY2OTc2MDAsazoxNjQ5MTE2ODAwLGw6MTY1MTUzNjAwMCxtOjE2NTM5NTUyMDAsbjoxNjU2Mzc0NDAwLG86MTY1ODc5MzYwMCxwOjE2NjEyMTI4MDAscToxNjYzNjMyMDAwLHI6MTY2NjA1MTIwMCxjOjE2Njg0NzA0MDAsSDoxNjcwODg5NjAwLHZCOm51bGwsd0I6bnVsbH19LEQ6e0E6e1wiMFwiOjAuMDA0MTQxLFwiMVwiOjAuMDA0MzI2LFwiMlwiOjAuMDA0NyxcIjNcIjowLjAwNDUzOCxcIjRcIjowLjAwODMyMixcIjVcIjowLjAwODU5NixcIjZcIjowLjAwNDU2NixcIjdcIjowLjAwNDExOCxcIjhcIjowLjAwNzU0NixcIjlcIjowLjAwMzkwMSxJOjAuMDA0NzA2LHM6MC4wMDQ4NzksSjowLjAwNDg3OSxEOjAuMDA1NTkxLEU6MC4wMDU1OTEsRjowLjAwNTU5MSxBOjAuMDA0NTM0LEI6MC4wMDQ0NjQsQzowLjAxMDQyNCxLOjAuMDA4MyxMOjAuMDA0NzA2LEc6MC4wMTUwODcsTTowLjAwNDM5MyxOOjAuMDA0MzkzLE86MC4wMDg2NTIsdDowLjAwODMyMix1OjAuMDA0MzkzLHY6MC4wMDQzMTcsdzowLjAwMzkwMSx4OjAuMDA4Nzg2LHk6MC4wMDM5MzksejowLjAwNDQ2MSxBQjowLjAwNDMzNSxCQjowLjAwNDQ2NCxDQjowLjAxNTA5MixEQjowLjAwMzg2NyxFQjowLjAxNTA5MixGQjowLjAwMzc3MyxHQjowLjAwMzk3NCxIQjowLjAwNzU0NixJQjowLjAwNzk0OCxKQjowLjAwMzk3NCxLQjowLjAwMzg2NyxMQjowLjAwNzU0NixNQjowLjAyMjYzOCxOQjowLjA0OTA0OSxPQjowLjAwMzg2NyxQQjowLjAwMzkyOSxRQjowLjAwNzU0NixSQjowLjAxMTMxOSxTQjowLjAwMzg2NyxUQjowLjAwNzU0NixVQjowLjA0NTI3NixWQjowLjAwMzc3MyxXQjowLjAwMzc3MyxzQjowLjAwMzc3MyxYQjowLjAxMTMxOSx0QjowLjAxMTMxOSxZQjowLjAwMzc3MyxaQjowLjAxNTA5MixhQjowLjAwMzc3MyxiQjowLjAxMTMxOSxjQjowLjAzMDE4NCxkQjowLjAwNzU0NixlQjowLjAwNzU0NixmQjowLjA3OTIzMyxnQjowLjAyNjQxMSxoQjowLjAxMTMxOSxkOjAuMDM3NzMsaUI6MC4wMTEzMTksakI6MC4wNDUyNzYsa0I6MC4wNDE1MDMsbEI6MC4wMjY0MTEsbUI6MC4wMTEzMTksbkI6MC4wMzM5NTcsUDowLjEyMDczNixROjAuMDQxNTAzLFI6MC4wNDE1MDMsUzowLjA3NTQ2LFQ6MC4wNDUyNzYsVTowLjA5NDMyNSxWOjAuMDc1NDYsVzowLjA3OTIzMyxYOjAuMDE4ODY1LFk6MC4wMzM5NTcsWjowLjAyNjQxMSxhOjAuMDU2NTk1LGI6MC4wNDE1MDMsZTowLjA0OTA0OSxmOjAuMDMzOTU3LGc6MC4wMjI2MzgsaDowLjA0MTUwMyxpOjAuMDU2NTk1LGo6MC4wOTgwOTgsazowLjA0OTA0OSxsOjAuMDc5MjMzLG06MC4wNjAzNjgsbjowLjA5ODA5OCxvOjAuMjc5MjAyLHA6MC4xMjQ1MDkscTowLjE5MjQyMyxyOjAuMjg2NzQ4LGM6My42NDg0OSxIOjE2LjgzODksdkI6MC4wMzM5NTcsd0I6MC4wMTg4NjUsREM6MC4wMTEzMTl9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJJXCIsXCJzXCIsXCJKXCIsXCJEXCIsXCJFXCIsXCJGXCIsXCJBXCIsXCJCXCIsXCJDXCIsXCJLXCIsXCJMXCIsXCJHXCIsXCJNXCIsXCJOXCIsXCJPXCIsXCJ0XCIsXCJ1XCIsXCJ2XCIsXCJ3XCIsXCJ4XCIsXCJ5XCIsXCJ6XCIsXCIwXCIsXCIxXCIsXCIyXCIsXCIzXCIsXCI0XCIsXCI1XCIsXCI2XCIsXCI3XCIsXCI4XCIsXCI5XCIsXCJBQlwiLFwiQkJcIixcIkNCXCIsXCJEQlwiLFwiRUJcIixcIkZCXCIsXCJHQlwiLFwiSEJcIixcIklCXCIsXCJKQlwiLFwiS0JcIixcIkxCXCIsXCJNQlwiLFwiTkJcIixcIk9CXCIsXCJQQlwiLFwiUUJcIixcIlJCXCIsXCJTQlwiLFwiVEJcIixcIlVCXCIsXCJWQlwiLFwiV0JcIixcInNCXCIsXCJYQlwiLFwidEJcIixcIllCXCIsXCJaQlwiLFwiYUJcIixcImJCXCIsXCJjQlwiLFwiZEJcIixcImVCXCIsXCJmQlwiLFwiZ0JcIixcImhCXCIsXCJkXCIsXCJpQlwiLFwiakJcIixcImtCXCIsXCJsQlwiLFwibUJcIixcIm5CXCIsXCJQXCIsXCJRXCIsXCJSXCIsXCJTXCIsXCJUXCIsXCJVXCIsXCJWXCIsXCJXXCIsXCJYXCIsXCJZXCIsXCJaXCIsXCJhXCIsXCJiXCIsXCJlXCIsXCJmXCIsXCJnXCIsXCJoXCIsXCJpXCIsXCJqXCIsXCJrXCIsXCJsXCIsXCJtXCIsXCJuXCIsXCJvXCIsXCJwXCIsXCJxXCIsXCJyXCIsXCJjXCIsXCJIXCIsXCJ2QlwiLFwid0JcIixcIkRDXCJdLEU6XCJDaHJvbWVcIixGOntcIjBcIjoxMzYxNDA0ODAwLFwiMVwiOjEzNjQ0Mjg4MDAsXCIyXCI6MTM2OTA5NDQwMCxcIjNcIjoxMzc0MTA1NjAwLFwiNFwiOjEzNzY5NTY4MDAsXCI1XCI6MTM4NDIxNDQwMCxcIjZcIjoxMzg5NjU3NjAwLFwiN1wiOjEzOTI5NDA4MDAsXCI4XCI6MTM5NzAwMTYwMCxcIjlcIjoxNDAwNTQ0MDAwLEk6MTI2NDM3NzYwMCxzOjEyNzQ3NDU2MDAsSjoxMjgzMzg1NjAwLEQ6MTI4NzYxOTIwMCxFOjEyOTEyNDgwMDAsRjoxMjk2Nzc3NjAwLEE6MTI5OTU0MjQwMCxCOjEzMDM4NjI0MDAsQzoxMzA3NDA0ODAwLEs6MTMxMjI0MzIwMCxMOjEzMTYxMzEyMDAsRzoxMzE2MTMxMjAwLE06MTMxOTUwMDgwMCxOOjEzMjM3MzQ0MDAsTzoxMzI4NjU5MjAwLHQ6MTMzMjg5MjgwMCx1OjEzMzcwNDAwMDAsdjoxMzQwNjY4ODAwLHc6MTM0MzY5MjgwMCx4OjEzNDg1MzEyMDAseToxMzUyMjQ2NDAwLHo6MTM1Nzg2MjQwMCxBQjoxNDA1NDY4ODAwLEJCOjE0MDkwMTEyMDAsQ0I6MTQxMjY0MDAwMCxEQjoxNDE2MjY4ODAwLEVCOjE0MjE3OTg0MDAsRkI6MTQyNTUxMzYwMCxHQjoxNDI5NDAxNjAwLEhCOjE0MzIwODAwMDAsSUI6MTQzNzUyMzIwMCxKQjoxNDQxMTUyMDAwLEtCOjE0NDQ3ODA4MDAsTEI6MTQ0OTAxNDQwMCxNQjoxNDUzMjQ4MDAwLE5COjE0NTY5NjMyMDAsT0I6MTQ2MDU5MjAwMCxQQjoxNDY0MTM0NDAwLFFCOjE0NjkwNTkyMDAsUkI6MTQ3MjYwMTYwMCxTQjoxNDc2MjMwNDAwLFRCOjE0ODA1NTA0MDAsVUI6MTQ4NTMwMjQwMCxWQjoxNDg5MDE3NjAwLFdCOjE0OTI1NjAwMDAsc0I6MTQ5NjcwNzIwMCxYQjoxNTAwOTQwODAwLHRCOjE1MDQ1Njk2MDAsWUI6MTUwODE5ODQwMCxaQjoxNTEyNTE4NDAwLGFCOjE1MTY3NTIwMDAsYkI6MTUyMDI5NDQwMCxjQjoxNTIzOTIzMjAwLGRCOjE1Mjc1NTIwMDAsZUI6MTUzMjM5MDQwMCxmQjoxNTM2MDE5MjAwLGdCOjE1Mzk2NDgwMDAsaEI6MTU0Mzk2ODAwMCxkOjE1NDg3MjAwMDAsaUI6MTU1MjM0ODgwMCxqQjoxNTU1OTc3NjAwLGtCOjE1NTk2MDY0MDAsbEI6MTU2NDQ0NDgwMCxtQjoxNTY4MDczNjAwLG5COjE1NzE3MDI0MDAsUDoxNTc1OTM2MDAwLFE6MTU4MDg2MDgwMCxSOjE1ODYzMDQwMDAsUzoxNTg5ODQ2NDAwLFQ6MTU5NDY4NDgwMCxVOjE1OTgzMTM2MDAsVjoxNjAxOTQyNDAwLFc6MTYwNTU3MTIwMCxYOjE2MTEwMTQ0MDAsWToxNjE0NTU2ODAwLFo6MTYxODI3MjAwMCxhOjE2MjE5ODcyMDAsYjoxNjI2NzM5MjAwLGU6MTYzMDM2ODAwMCxmOjE2MzIyNjg4MDAsZzoxNjM0NjAxNjAwLGg6MTYzNzAyMDgwMCxpOjE2NDEzNDA4MDAsajoxNjQzNjczNjAwLGs6MTY0NjA5MjgwMCxsOjE2NDg1MTIwMDAsbToxNjUwOTMxMjAwLG46MTY1MzM1MDQwMCxvOjE2NTU3Njk2MDAscDoxNjU5Mzk4NDAwLHE6MTY2MTgxNzYwMCxyOjE2NjQyMzY4MDAsYzoxNjY2NjU2MDAwLEg6MTY2OTY4MDAwMCx2QjpudWxsLHdCOm51bGwsREM6bnVsbH19LEU6e0E6e0k6MCxzOjAuMDA4MzIyLEo6MC4wMDQ2NTYsRDowLjAwNDQ2NSxFOjAuMDAzOTc0LEY6MC4wMDM5MjksQTowLjAwNDQyNSxCOjAuMDA0MzE4LEM6MC4wMDM4MDEsSzowLjAxODg2NSxMOjAuMDk0MzI1LEc6MC4wMjI2MzgsRUM6MCx4QjowLjAwODY5MixGQzowLjAxMTMxOSxHQzowLjAwNDU2LEhDOjAuMDA0MjgzLElDOjAuMDIyNjM4LHlCOjAuMDA3ODAyLG9COjAuMDA3NTQ2LHBCOjAuMDMzOTU3LHpCOjAuMTg4NjUsSkM6MC4yNTY1NjQsS0M6MC4wNDE1MDMsXCIwQlwiOjAuMDM3NzMsXCIxQlwiOjAuMDk0MzI1LFwiMkJcIjowLjE5MjQyMyxcIjNCXCI6MS4zMTMscUI6MC4xNjIyMzksXCI0QlwiOjAuNjQxNDEsXCI1QlwiOjAuMTQzMzc0LFwiNkJcIjowLExDOjB9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIkVDXCIsXCJ4QlwiLFwiSVwiLFwic1wiLFwiRkNcIixcIkpcIixcIkdDXCIsXCJEXCIsXCJIQ1wiLFwiRVwiLFwiRlwiLFwiSUNcIixcIkFcIixcInlCXCIsXCJCXCIsXCJvQlwiLFwiQ1wiLFwicEJcIixcIktcIixcInpCXCIsXCJMXCIsXCJKQ1wiLFwiR1wiLFwiS0NcIixcIjBCXCIsXCIxQlwiLFwiMkJcIixcIjNCXCIsXCJxQlwiLFwiNEJcIixcIjVCXCIsXCI2QlwiLFwiTENcIixcIlwiXSxFOlwiU2FmYXJpXCIsRjp7RUM6MTIwNTc5ODQwMCx4QjoxMjI2NTM0NDAwLEk6MTI0NDQxOTIwMCxzOjEyNzU4Njg4MDAsRkM6MTMxMTEyMDAwMCxKOjEzNDMxNzQ0MDAsR0M6MTM4MjQwMDAwMCxEOjEzODI0MDAwMDAsSEM6MTQxMDk5ODQwMCxFOjE0MTM0MTc2MDAsRjoxNDQzNjU3NjAwLElDOjE0NTg1MTg0MDAsQToxNDc0MzI5NjAwLHlCOjE0OTA1NzI4MDAsQjoxNTA1Nzc5MjAwLG9COjE1MjIyODE2MDAsQzoxNTM3MTQyNDAwLHBCOjE1NTM0NzIwMDAsSzoxNTY4ODUxMjAwLHpCOjE1ODUwMDgwMDAsTDoxNjAwMjE0NDAwLEpDOjE2MTkzOTUyMDAsRzoxNjMyMDk2MDAwLEtDOjE2MzUyOTI4MDAsXCIwQlwiOjE2MzkzNTM2MDAsXCIxQlwiOjE2NDcyMTYwMDAsXCIyQlwiOjE2NTI3NDU2MDAsXCIzQlwiOjE2NTgyNzUyMDAscUI6MTY2Mjk0MDgwMCxcIjRCXCI6MTY2NjU2OTYwMCxcIjVCXCI6MTY3MDg4OTYwMCxcIjZCXCI6bnVsbCxMQzpudWxsfX0sRjp7QTp7XCIwXCI6MC4wMDU1OTUsXCIxXCI6MC4wMDQzOTMsXCIyXCI6MC4wMDc1NDYsXCIzXCI6MC4wMDQ4NzksXCI0XCI6MC4wMDQ4NzksXCI1XCI6MC4wMDM3NzMsXCI2XCI6MC4wMDUxNTIsXCI3XCI6MC4wMDUwMTQsXCI4XCI6MC4wMDk3NTgsXCI5XCI6MC4wMDQ4NzksRjowLjAwODIsQjowLjAxNjU4MSxDOjAuMDA0MzE3LEc6MC4wMDY4NSxNOjAuMDA2ODUsTjowLjAwNjg1LE86MC4wMDUwMTQsdDowLjAwNjAxNSx1OjAuMDA0ODc5LHY6MC4wMDY1OTcsdzowLjAwNjU5Nyx4OjAuMDEzNDM0LHk6MC4wMDY3MDIsejowLjAwNjAxNSxBQjowLjAwMzc3MyxCQjowLjAwNDI4MyxDQjowLjAwNDM2NyxEQjowLjAwNDUzNCxFQjowLjAwNzU0NixGQjowLjAwNDIyNyxHQjowLjAwNDQxOCxIQjowLjAwNDE2MSxJQjowLjAwNDIyNyxKQjowLjAwNDcyNSxLQjowLjAxNTA5MixMQjowLjAwODk0MixNQjowLjAwNDcwNyxOQjowLjAwNDgyNyxPQjowLjAwNDcwNyxQQjowLjAwNDcwNyxRQjowLjAwNDMyNixSQjowLjAwODkyMixTQjowLjAxNDM0OSxUQjowLjAwNDQyNSxVQjowLjAwNDcyLFZCOjAuMDA0NDI1LFdCOjAuMDA0NDI1LFhCOjAuMDA0NzIsWUI6MC4wMDQ1MzIsWkI6MC4wMDQ1NjYsYUI6MC4wMjI4MyxiQjowLjAwODY3LGNCOjAuMDA0NjU2LGRCOjAuMDA0NjQyLGVCOjAuMDAzOTI5LGZCOjAuMDA5NDQsZ0I6MC4wMDQyOTMsaEI6MC4wMDM5MjksZDowLjAwNDI5OCxpQjowLjA5NjY5MixqQjowLjAwNDIwMSxrQjowLjAwNDE0MSxsQjowLjAwNDI1NyxtQjowLjAwMzkzOSxuQjowLjAwODIzNixQOjAuMDAzODU1LFE6MC4wMDM5MzksUjowLjAwODUxNCx1QjowLjAwMzkzOSxTOjAuMDAzOTM5LFQ6MC4wMDM3MDIsVTowLjAwNzU0NixWOjAuMDAzODU1LFc6MC4wMDM4NTUsWDowLjAwMzkyOSxZOjAuMDA3ODAyLFo6MC4wMTE3MDMsYTowLjAwNzU0NixiOjAuMjA3NTE1LE1DOjAuMDA2ODUsTkM6MCxPQzowLjAwODM5MixQQzowLjAwNDcwNixvQjowLjAwNjIyOSxcIjdCXCI6MC4wMDQ4NzksUUM6MC4wMDg3ODYscEI6MC4wMDQ3Mn0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJGXCIsXCJNQ1wiLFwiTkNcIixcIk9DXCIsXCJQQ1wiLFwiQlwiLFwib0JcIixcIjdCXCIsXCJRQ1wiLFwiQ1wiLFwicEJcIixcIkdcIixcIk1cIixcIk5cIixcIk9cIixcInRcIixcInVcIixcInZcIixcIndcIixcInhcIixcInlcIixcInpcIixcIjBcIixcIjFcIixcIjJcIixcIjNcIixcIjRcIixcIjVcIixcIjZcIixcIjdcIixcIjhcIixcIjlcIixcIkFCXCIsXCJCQlwiLFwiQ0JcIixcIkRCXCIsXCJFQlwiLFwiRkJcIixcIkdCXCIsXCJIQlwiLFwiSUJcIixcIkpCXCIsXCJLQlwiLFwiTEJcIixcIk1CXCIsXCJOQlwiLFwiT0JcIixcIlBCXCIsXCJRQlwiLFwiUkJcIixcIlNCXCIsXCJUQlwiLFwiVUJcIixcIlZCXCIsXCJXQlwiLFwiWEJcIixcIllCXCIsXCJaQlwiLFwiYUJcIixcImJCXCIsXCJjQlwiLFwiZEJcIixcImVCXCIsXCJmQlwiLFwiZ0JcIixcImhCXCIsXCJkXCIsXCJpQlwiLFwiakJcIixcImtCXCIsXCJsQlwiLFwibUJcIixcIm5CXCIsXCJQXCIsXCJRXCIsXCJSXCIsXCJ1QlwiLFwiU1wiLFwiVFwiLFwiVVwiLFwiVlwiLFwiV1wiLFwiWFwiLFwiWVwiLFwiWlwiLFwiYVwiLFwiYlwiLFwiXCIsXCJcIixcIlwiXSxFOlwiT3BlcmFcIixGOntcIjBcIjoxNDE3MTMyODAwLFwiMVwiOjE0MjIzMTY4MDAsXCIyXCI6MTQyNTk0NTYwMCxcIjNcIjoxNDMwMTc5MjAwLFwiNFwiOjE0MzM4MDgwMDAsXCI1XCI6MTQzODY0NjQwMCxcIjZcIjoxNDQyNDQ4MDAwLFwiN1wiOjE0NDU5MDQwMDAsXCI4XCI6MTQ0OTEwMDgwMCxcIjlcIjoxNDU0MzcxMjAwLEY6MTE1MDc2MTYwMCxNQzoxMjIzNDI0MDAwLE5DOjEyNTE3NjMyMDAsT0M6MTI2NzQ4ODAwMCxQQzoxMjc3OTQyNDAwLEI6MTI5MjQ1NzYwMCxvQjoxMzAyNTY2NDAwLFwiN0JcIjoxMzA5MjE5MjAwLFFDOjEzMjMxMjk2MDAsQzoxMzIzMTI5NjAwLHBCOjEzNTIwNzM2MDAsRzoxMzcyNzIzMjAwLE06MTM3NzU2MTYwMCxOOjEzODExMDQwMDAsTzoxMzg2Mjg4MDAwLHQ6MTM5MDg2NzIwMCx1OjEzOTM4OTEyMDAsdjoxMzk5MzM0NDAwLHc6MTQwMTc1MzYwMCx4OjE0MDU5ODcyMDAseToxNDA5NjE2MDAwLHo6MTQxMzMzMTIwMCxBQjoxNDU3MzA4ODAwLEJCOjE0NjIzMjAwMDAsQ0I6MTQ2NTM0NDAwMCxEQjoxNDcwMDk2MDAwLEVCOjE0NzQzMjk2MDAsRkI6MTQ3NzI2NzIwMCxHQjoxNDgxNTg3MjAwLEhCOjE0ODY0MjU2MDAsSUI6MTQ5MDA1NDQwMCxKQjoxNDk0Mzc0NDAwLEtCOjE0OTgwMDMyMDAsTEI6MTUwMjIzNjgwMCxNQjoxNTA2NDcwNDAwLE5COjE1MTAwOTkyMDAsT0I6MTUxNTAyNDAwMCxQQjoxNTE3OTYxNjAwLFFCOjE1MjE2NzY4MDAsUkI6MTUyNTkxMDQwMCxTQjoxNTMwMTQ0MDAwLFRCOjE1MzQ5ODI0MDAsVUI6MTUzNzgzMzYwMCxWQjoxNTQzMzYzMjAwLFdCOjE1NDgyMDE2MDAsWEI6MTU1NDc2ODAwMCxZQjoxNTYxNTkzNjAwLFpCOjE1NjYyNTkyMDAsYUI6MTU3MDQwNjQwMCxiQjoxNTczNjg5NjAwLGNCOjE1Nzg0NDE2MDAsZEI6MTU4Mzk3MTIwMCxlQjoxNTg3NTEzNjAwLGZCOjE1OTI5NTY4MDAsZ0I6MTU5NTg5NDQwMCxoQjoxNjAwMTI4MDAwLGQ6MTYwMzIzODQwMCxpQjoxNjEzNTIwMDAwLGpCOjE2MTIyMjQwMDAsa0I6MTYxNjU0NDAwMCxsQjoxNjE5NTY4MDAwLG1COjE2MjM3MTUyMDAsbkI6MTYyNzk0ODgwMCxQOjE2MzE1Nzc2MDAsUToxNjMzMzkyMDAwLFI6MTYzNTk4NDAwMCx1QjoxNjM4NDAzMjAwLFM6MTY0MjU1MDQwMCxUOjE2NDQ5Njk2MDAsVToxNjQ3OTkzNjAwLFY6MTY1MDQxMjgwMCxXOjE2NTI3NDU2MDAsWDoxNjU0NjQ2NDAwLFk6MTY1NzE1MjAwMCxaOjE2NjA3ODA4MDAsYToxNjYzMTEzNjAwLGI6MTY2ODgxNjAwMH0sRDp7RjpcIm9cIixCOlwib1wiLEM6XCJvXCIsTUM6XCJvXCIsTkM6XCJvXCIsT0M6XCJvXCIsUEM6XCJvXCIsb0I6XCJvXCIsXCI3QlwiOlwib1wiLFFDOlwib1wiLHBCOlwib1wifX0sRzp7QTp7RTowLHhCOjAsUkM6MCxcIjhCXCI6MC4wMDQ3MDE5NSxTQzowLjAwNDcwMTk1LFRDOjAuMDAzMTM0NjMsVUM6MC4wMTQxMDU4LFZDOjAuMDA2MjY5MjYsV0M6MC4wMTg4MDc4LFhDOjAuMDYxMTI1MyxZQzowLjAwNzgzNjU4LFpDOjAuMTA2NTc3LGFDOjAuMDI4MjExNyxiQzowLjAyNjY0NDQsY0M6MC4wMjUwNzcxLGRDOjAuNDA1OTM1LGVDOjAuMDQyMzE3NSxmQzowLjAxMDk3MTIsZ0M6MC4wMzkxODI5LGhDOjAuMTQxMDU4LGlDOjAuMzQwMTA4LGpDOjAuNjQ3MzAxLGtDOjAuMTg2NTExLFwiMEJcIjowLjIzOTc5OSxcIjFCXCI6MC4zMDQwNTksXCIyQlwiOjAuNTQ2OTkzLFwiM0JcIjoyLjMxNDkzLHFCOjIuMDk4NjQsXCI0QlwiOjYuMzMxOTYsXCI1QlwiOjAuNjk0MzIxLFwiNkJcIjowLjAxNTY3MzJ9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwieEJcIixcIlJDXCIsXCI4QlwiLFwiU0NcIixcIlRDXCIsXCJVQ1wiLFwiRVwiLFwiVkNcIixcIldDXCIsXCJYQ1wiLFwiWUNcIixcIlpDXCIsXCJhQ1wiLFwiYkNcIixcImNDXCIsXCJkQ1wiLFwiZUNcIixcImZDXCIsXCJnQ1wiLFwiaENcIixcImlDXCIsXCJqQ1wiLFwia0NcIixcIjBCXCIsXCIxQlwiLFwiMkJcIixcIjNCXCIsXCJxQlwiLFwiNEJcIixcIjVCXCIsXCI2QlwiLFwiXCIsXCJcIl0sRTpcIlNhZmFyaSBvbiBpT1NcIixGOnt4QjoxMjcwMjUyODAwLFJDOjEyODM5MDQwMDAsXCI4QlwiOjEyOTk2Mjg4MDAsU0M6MTMzMTA3ODQwMCxUQzoxMzU5MzMxMjAwLFVDOjEzOTQ0MDk2MDAsRToxNDEwOTEyMDAwLFZDOjE0MTM3NjMyMDAsV0M6MTQ0MjM2MTYwMCxYQzoxNDU4NTE4NDAwLFlDOjE0NzM3MjQ4MDAsWkM6MTQ5MDU3MjgwMCxhQzoxNTA1Nzc5MjAwLGJDOjE1MjIyODE2MDAsY0M6MTUzNzE0MjQwMCxkQzoxNTUzNDcyMDAwLGVDOjE1Njg4NTEyMDAsZkM6MTU3MjIyMDgwMCxnQzoxNTgwMTY5NjAwLGhDOjE1ODUwMDgwMDAsaUM6MTYwMDIxNDQwMCxqQzoxNjE5Mzk1MjAwLGtDOjE2MzIwOTYwMDAsXCIwQlwiOjE2MzkzNTM2MDAsXCIxQlwiOjE2NDcyMTYwMDAsXCIyQlwiOjE2NTI2NTkyMDAsXCIzQlwiOjE2NTgyNzUyMDAscUI6MTY2Mjk0MDgwMCxcIjRCXCI6MTY2NjU2OTYwMCxcIjVCXCI6MTY3MDg4OTYwMCxcIjZCXCI6bnVsbH19LEg6e0E6e2xDOjAuOTY2OTg4fSxCOlwib1wiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwibENcIixcIlwiLFwiXCIsXCJcIl0sRTpcIk9wZXJhIE1pbmlcIixGOntsQzoxNDI2NDY0MDAwfX0sSTp7QTp7ckI6MCxJOjAuMDMwNjk1MSxIOjAsbUM6MCxuQzowLjAyMDQ2MzQsb0M6MCxwQzowLjAyMDQ2MzQsXCI4QlwiOjAuMDgxODUzNyxxQzowLHJDOjAuNDE5NX0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwibUNcIixcIm5DXCIsXCJvQ1wiLFwickJcIixcIklcIixcInBDXCIsXCI4QlwiLFwicUNcIixcInJDXCIsXCJIXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJBbmRyb2lkIEJyb3dzZXJcIixGOnttQzoxMjU2NTE1MjAwLG5DOjEyNzQzMTM2MDAsb0M6MTI5MTU5MzYwMCxyQjoxMjk4MzMyODAwLEk6MTMxODg5NjAwMCxwQzoxMzQxNzkyMDAwLFwiOEJcIjoxMzc0NjI0MDAwLHFDOjEzODY1NDcyMDAsckM6MTQwMTY2NzIwMCxIOjE2Njk5MzkyMDB9fSxKOntBOntEOjAsQTowfSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiRFwiLFwiQVwiLFwiXCIsXCJcIixcIlwiXSxFOlwiQmxhY2tiZXJyeSBCcm93c2VyXCIsRjp7RDoxMzI1Mzc2MDAwLEE6MTM1OTUwNDAwMH19LEs6e0E6e0E6MCxCOjAsQzowLGQ6MC4wMTExMzkxLG9COjAsXCI3QlwiOjAscEI6MH0sQjpcIm9cIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIkFcIixcIkJcIixcIm9CXCIsXCI3QlwiLFwiQ1wiLFwicEJcIixcImRcIixcIlwiLFwiXCIsXCJcIl0sRTpcIk9wZXJhIE1vYmlsZVwiLEY6e0E6MTI4NzEwMDgwMCxCOjEzMDA3NTIwMDAsb0I6MTMxNDgzNTIwMCxcIjdCXCI6MTMxODI5MTIwMCxDOjEzMzAzMDA4MDAscEI6MTM0OTc0MDgwMCxkOjE2NjY4Mjg4MDB9LEQ6e2Q6XCJ3ZWJraXRcIn19LEw6e0E6e0g6NDEuNTQyNn0sQjpcIndlYmtpdFwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiSFwiLFwiXCIsXCJcIixcIlwiXSxFOlwiQ2hyb21lIGZvciBBbmRyb2lkXCIsRjp7SDoxNjY5OTM5MjAwfX0sTTp7QTp7YzowLjI5MjcxNn0sQjpcIm1velwiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiY1wiLFwiXCIsXCJcIixcIlwiXSxFOlwiRmlyZWZveCBmb3IgQW5kcm9pZFwiLEY6e2M6MTY2ODQ3MDQwMH19LE46e0E6e0E6MC4wMTE1OTM0LEI6MC4wMjI2NjR9LEI6XCJtc1wiLEM6W1wiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIkFcIixcIkJcIixcIlwiLFwiXCIsXCJcIl0sRTpcIklFIE1vYmlsZVwiLEY6e0E6MTM0MDE1MDQwMCxCOjEzNTM0NTYwMDB9fSxPOntBOntzQzoxLjc1MDA3fSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJzQ1wiLFwiXCIsXCJcIixcIlwiXSxFOlwiVUMgQnJvd3NlciBmb3IgQW5kcm9pZFwiLEY6e3NDOjE2MzQ2ODgwMDB9LEQ6e3NDOlwid2Via2l0XCJ9fSxQOntBOntJOjAuMTY2NDA5LHRDOjAuMDEwMzU0Myx1QzowLjAxMDMwNCx2QzowLjA1MjAwMjgsd0M6MC4wMTAzNTg0LHhDOjAuMDEwNDQ0Myx5QjowLjAxMDUwNDMseUM6MC4wMzEyMDE3LHpDOjAuMDEwNDAwNixcIjBDXCI6MC4wNTIwMDI4LFwiMUNcIjowLjA2MjQwMzMsXCIyQ1wiOjAuMDMxMjAxNyxxQjowLjExNDQwNixcIjNDXCI6MC4xMjQ4MDcsXCI0Q1wiOjAuMjQ5NjEzLFwiNUNcIjoyLjI1NjkyfSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJJXCIsXCJ0Q1wiLFwidUNcIixcInZDXCIsXCJ3Q1wiLFwieENcIixcInlCXCIsXCJ5Q1wiLFwiekNcIixcIjBDXCIsXCIxQ1wiLFwiMkNcIixcInFCXCIsXCIzQ1wiLFwiNENcIixcIjVDXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJTYW1zdW5nIEludGVybmV0XCIsRjp7SToxNDYxMDI0MDAwLHRDOjE0ODE4NDY0MDAsdUM6MTUwOTQwODAwMCx2QzoxNTI4MzI5NjAwLHdDOjE1NDYxMjgwMDAseEM6MTU1NDE2MzIwMCx5QjoxNTY3OTAwODAwLHlDOjE1ODI1ODg4MDAsekM6MTU5MzQ3NTIwMCxcIjBDXCI6MTYwNTY1NzYwMCxcIjFDXCI6MTYxODUzMTIwMCxcIjJDXCI6MTYyOTA3MjAwMCxxQjoxNjQwNzM2MDAwLFwiM0NcIjoxNjUxNzA4ODAwLFwiNENcIjoxNjU5NjU3NjAwLFwiNUNcIjoxNjY3MjYwODAwfX0sUTp7QTp7ekI6MC4xOTkyOTZ9LEI6XCJ3ZWJraXRcIixDOltcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcInpCXCIsXCJcIixcIlwiLFwiXCJdLEU6XCJRUSBCcm93c2VyXCIsRjp7ekI6MTY2MzcxODQwMH19LFI6e0E6e1wiNkNcIjowfSxCOlwid2Via2l0XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCI2Q1wiLFwiXCIsXCJcIixcIlwiXSxFOlwiQmFpZHUgQnJvd3NlclwiLEY6e1wiNkNcIjoxNjYzMDI3MjAwfX0sUzp7QTp7XCI3Q1wiOjAuMDY4NTA4fSxCOlwibW96XCIsQzpbXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCJcIixcIlwiLFwiXCIsXCI3Q1wiLFwiXCIsXCJcIixcIlwiXSxFOlwiS2FpT1MgQnJvd3NlclwiLEY6e1wiN0NcIjoxNTI3ODExMjAwfX19O1xuIiwibW9kdWxlLmV4cG9ydHM9e1wiMFwiOlwiMjZcIixcIjFcIjpcIjI3XCIsXCIyXCI6XCIyOFwiLFwiM1wiOlwiMjlcIixcIjRcIjpcIjMwXCIsXCI1XCI6XCIzMVwiLFwiNlwiOlwiMzJcIixcIjdcIjpcIjMzXCIsXCI4XCI6XCIzNFwiLFwiOVwiOlwiMzVcIixBOlwiMTBcIixCOlwiMTFcIixDOlwiMTJcIixEOlwiN1wiLEU6XCI4XCIsRjpcIjlcIixHOlwiMTVcIixIOlwiMTA4XCIsSTpcIjRcIixKOlwiNlwiLEs6XCIxM1wiLEw6XCIxNFwiLE06XCIxNlwiLE46XCIxN1wiLE86XCIxOFwiLFA6XCI3OVwiLFE6XCI4MFwiLFI6XCI4MVwiLFM6XCI4M1wiLFQ6XCI4NFwiLFU6XCI4NVwiLFY6XCI4NlwiLFc6XCI4N1wiLFg6XCI4OFwiLFk6XCI4OVwiLFo6XCI5MFwiLGE6XCI5MVwiLGI6XCI5MlwiLGM6XCIxMDdcIixkOlwiNzJcIixlOlwiOTNcIixmOlwiOTRcIixnOlwiOTVcIixoOlwiOTZcIixpOlwiOTdcIixqOlwiOThcIixrOlwiOTlcIixsOlwiMTAwXCIsbTpcIjEwMVwiLG46XCIxMDJcIixvOlwiMTAzXCIscDpcIjEwNFwiLHE6XCIxMDVcIixyOlwiMTA2XCIsczpcIjVcIix0OlwiMTlcIix1OlwiMjBcIix2OlwiMjFcIix3OlwiMjJcIix4OlwiMjNcIix5OlwiMjRcIix6OlwiMjVcIixBQjpcIjM2XCIsQkI6XCIzN1wiLENCOlwiMzhcIixEQjpcIjM5XCIsRUI6XCI0MFwiLEZCOlwiNDFcIixHQjpcIjQyXCIsSEI6XCI0M1wiLElCOlwiNDRcIixKQjpcIjQ1XCIsS0I6XCI0NlwiLExCOlwiNDdcIixNQjpcIjQ4XCIsTkI6XCI0OVwiLE9COlwiNTBcIixQQjpcIjUxXCIsUUI6XCI1MlwiLFJCOlwiNTNcIixTQjpcIjU0XCIsVEI6XCI1NVwiLFVCOlwiNTZcIixWQjpcIjU3XCIsV0I6XCI1OFwiLFhCOlwiNjBcIixZQjpcIjYyXCIsWkI6XCI2M1wiLGFCOlwiNjRcIixiQjpcIjY1XCIsY0I6XCI2NlwiLGRCOlwiNjdcIixlQjpcIjY4XCIsZkI6XCI2OVwiLGdCOlwiNzBcIixoQjpcIjcxXCIsaUI6XCI3M1wiLGpCOlwiNzRcIixrQjpcIjc1XCIsbEI6XCI3NlwiLG1COlwiNzdcIixuQjpcIjc4XCIsb0I6XCIxMS4xXCIscEI6XCIxMi4xXCIscUI6XCIxNi4wXCIsckI6XCIzXCIsc0I6XCI1OVwiLHRCOlwiNjFcIix1QjpcIjgyXCIsdkI6XCIxMDlcIix3QjpcIjExMFwiLHhCOlwiMy4yXCIseUI6XCIxMC4xXCIsekI6XCIxMy4xXCIsXCIwQlwiOlwiMTUuMi0xNS4zXCIsXCIxQlwiOlwiMTUuNFwiLFwiMkJcIjpcIjE1LjVcIixcIjNCXCI6XCIxNS42XCIsXCI0QlwiOlwiMTYuMVwiLFwiNUJcIjpcIjE2LjJcIixcIjZCXCI6XCIxNi4zXCIsXCI3QlwiOlwiMTEuNVwiLFwiOEJcIjpcIjQuMi00LjNcIixcIjlCXCI6XCI1LjVcIixBQzpcIjJcIixCQzpcIjMuNVwiLENDOlwiMy42XCIsREM6XCIxMTFcIixFQzpcIjMuMVwiLEZDOlwiNS4xXCIsR0M6XCI2LjFcIixIQzpcIjcuMVwiLElDOlwiOS4xXCIsSkM6XCIxNC4xXCIsS0M6XCIxNS4xXCIsTEM6XCJUUFwiLE1DOlwiOS41LTkuNlwiLE5DOlwiMTAuMC0xMC4xXCIsT0M6XCIxMC41XCIsUEM6XCIxMC42XCIsUUM6XCIxMS42XCIsUkM6XCI0LjAtNC4xXCIsU0M6XCI1LjAtNS4xXCIsVEM6XCI2LjAtNi4xXCIsVUM6XCI3LjAtNy4xXCIsVkM6XCI4LjEtOC40XCIsV0M6XCI5LjAtOS4yXCIsWEM6XCI5LjNcIixZQzpcIjEwLjAtMTAuMlwiLFpDOlwiMTAuM1wiLGFDOlwiMTEuMC0xMS4yXCIsYkM6XCIxMS4zLTExLjRcIixjQzpcIjEyLjAtMTIuMVwiLGRDOlwiMTIuMi0xMi41XCIsZUM6XCIxMy4wLTEzLjFcIixmQzpcIjEzLjJcIixnQzpcIjEzLjNcIixoQzpcIjEzLjQtMTMuN1wiLGlDOlwiMTQuMC0xNC40XCIsakM6XCIxNC41LTE0LjhcIixrQzpcIjE1LjAtMTUuMVwiLGxDOlwiYWxsXCIsbUM6XCIyLjFcIixuQzpcIjIuMlwiLG9DOlwiMi4zXCIscEM6XCI0LjFcIixxQzpcIjQuNFwiLHJDOlwiNC40LjMtNC40LjRcIixzQzpcIjEzLjRcIix0QzpcIjUuMC01LjRcIix1QzpcIjYuMi02LjRcIix2QzpcIjcuMi03LjRcIix3QzpcIjguMlwiLHhDOlwiOS4yXCIseUM6XCIxMS4xLTExLjJcIix6QzpcIjEyLjBcIixcIjBDXCI6XCIxMy4wXCIsXCIxQ1wiOlwiMTQuMFwiLFwiMkNcIjpcIjE1LjBcIixcIjNDXCI6XCIxNy4wXCIsXCI0Q1wiOlwiMTguMFwiLFwiNUNcIjpcIjE5LjBcIixcIjZDXCI6XCIxMy4xOFwiLFwiN0NcIjpcIjIuNVwifTtcbiIsIm1vZHVsZS5leHBvcnRzPXtBOlwiaWVcIixCOlwiZWRnZVwiLEM6XCJmaXJlZm94XCIsRDpcImNocm9tZVwiLEU6XCJzYWZhcmlcIixGOlwib3BlcmFcIixHOlwiaW9zX3NhZlwiLEg6XCJvcF9taW5pXCIsSTpcImFuZHJvaWRcIixKOlwiYmJcIixLOlwib3BfbW9iXCIsTDpcImFuZF9jaHJcIixNOlwiYW5kX2ZmXCIsTjpcImllX21vYlwiLE86XCJhbmRfdWNcIixQOlwic2Ftc3VuZ1wiLFE6XCJhbmRfcXFcIixSOlwiYmFpZHVcIixTOlwia2Fpb3NcIn07XG4iLCIndXNlIHN0cmljdCdcblxuY29uc3QgYnJvd3NlcnMgPSByZXF1aXJlKCcuL2Jyb3dzZXJzJykuYnJvd3NlcnNcbmNvbnN0IHZlcnNpb25zID0gcmVxdWlyZSgnLi9icm93c2VyVmVyc2lvbnMnKS5icm93c2VyVmVyc2lvbnNcbmNvbnN0IGFnZW50c0RhdGEgPSByZXF1aXJlKCcuLi8uLi9kYXRhL2FnZW50cycpXG5cbmZ1bmN0aW9uIHVucGFja0Jyb3dzZXJWZXJzaW9ucyh2ZXJzaW9uc0RhdGEpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKHZlcnNpb25zRGF0YSkucmVkdWNlKCh1c2FnZSwgdmVyc2lvbikgPT4ge1xuICAgIHVzYWdlW3ZlcnNpb25zW3ZlcnNpb25dXSA9IHZlcnNpb25zRGF0YVt2ZXJzaW9uXVxuICAgIHJldHVybiB1c2FnZVxuICB9LCB7fSlcbn1cblxubW9kdWxlLmV4cG9ydHMuYWdlbnRzID0gT2JqZWN0LmtleXMoYWdlbnRzRGF0YSkucmVkdWNlKChtYXAsIGtleSkgPT4ge1xuICBsZXQgdmVyc2lvbnNEYXRhID0gYWdlbnRzRGF0YVtrZXldXG4gIG1hcFticm93c2Vyc1trZXldXSA9IE9iamVjdC5rZXlzKHZlcnNpb25zRGF0YSkucmVkdWNlKChkYXRhLCBlbnRyeSkgPT4ge1xuICAgIGlmIChlbnRyeSA9PT0gJ0EnKSB7XG4gICAgICBkYXRhLnVzYWdlX2dsb2JhbCA9IHVucGFja0Jyb3dzZXJWZXJzaW9ucyh2ZXJzaW9uc0RhdGFbZW50cnldKVxuICAgIH0gZWxzZSBpZiAoZW50cnkgPT09ICdDJykge1xuICAgICAgZGF0YS52ZXJzaW9ucyA9IHZlcnNpb25zRGF0YVtlbnRyeV0ucmVkdWNlKChsaXN0LCB2ZXJzaW9uKSA9PiB7XG4gICAgICAgIGlmICh2ZXJzaW9uID09PSAnJykge1xuICAgICAgICAgIGxpc3QucHVzaChudWxsKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxpc3QucHVzaCh2ZXJzaW9uc1t2ZXJzaW9uXSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdFxuICAgICAgfSwgW10pXG4gICAgfSBlbHNlIGlmIChlbnRyeSA9PT0gJ0QnKSB7XG4gICAgICBkYXRhLnByZWZpeF9leGNlcHRpb25zID0gdW5wYWNrQnJvd3NlclZlcnNpb25zKHZlcnNpb25zRGF0YVtlbnRyeV0pXG4gICAgfSBlbHNlIGlmIChlbnRyeSA9PT0gJ0UnKSB7XG4gICAgICBkYXRhLmJyb3dzZXIgPSB2ZXJzaW9uc0RhdGFbZW50cnldXG4gICAgfSBlbHNlIGlmIChlbnRyeSA9PT0gJ0YnKSB7XG4gICAgICBkYXRhLnJlbGVhc2VfZGF0ZSA9IE9iamVjdC5rZXlzKHZlcnNpb25zRGF0YVtlbnRyeV0pLnJlZHVjZShcbiAgICAgICAgKG1hcDIsIGtleTIpID0+IHtcbiAgICAgICAgICBtYXAyW3ZlcnNpb25zW2tleTJdXSA9IHZlcnNpb25zRGF0YVtlbnRyeV1ba2V5Ml1cbiAgICAgICAgICByZXR1cm4gbWFwMlxuICAgICAgICB9LFxuICAgICAgICB7fVxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBlbnRyeSBpcyBCXG4gICAgICBkYXRhLnByZWZpeCA9IHZlcnNpb25zRGF0YVtlbnRyeV1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGFcbiAgfSwge30pXG4gIHJldHVybiBtYXBcbn0sIHt9KVxuIiwibW9kdWxlLmV4cG9ydHMuYnJvd3NlclZlcnNpb25zID0gcmVxdWlyZSgnLi4vLi4vZGF0YS9icm93c2VyVmVyc2lvbnMnKVxuIiwibW9kdWxlLmV4cG9ydHMuYnJvd3NlcnMgPSByZXF1aXJlKCcuLi8uLi9kYXRhL2Jyb3dzZXJzJylcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIFwiLmdsb3cge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7XFxuICBib3JkZXItc3R5bGU6IHNvbGlkO1xcbiAgYm9yZGVyLWNvbG9yOiBncmVlbjtcXG4gIGJvcmRlci13aWR0aDogNXB4O1xcbiAgXFxuICBib3gtc2hhZG93OiAwIDAgNDBweCBibGFjaztcXG59XFxuXFxuLm5hdkJ1dHRvbiB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBncmVlbjtcXG4gIGNvbG9yOiBibGFjaztcXG5cXG4gIGJvcmRlci1yYWRpdXM6IDVweDtcXG4gIGJvcmRlci13aWR0aDogMHB4O1xcblxcbiAgZm9udC1zaXplOiB4LWxhcmdlO1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxuICBwYWRkaW5nOiA1cHg7XFxufVxcblxcbi5uYXZCdXR0b246aG92ZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7XFxuICBjb2xvcjogZ3JlZW47XFxuXFxuICBvdXRsaW5lLXN0eWxlOiBzb2xpZDtcXG4gIG91dGxpbmUtd2lkdGg6IDJweDtcXG59XFxuXFxuLmZvb3RlciB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XFxuICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgZ2FwOiAxMHB4O1xcbiAgcGFkZGluZzogMTBweDtcXG4gIHdpZHRoOiA5MDBweDtcXG59XFxuXFxuQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiAxMDAwcHgpIHtcXG4gIC5uYXZCdXR0b257XFxuICAgIGZvbnQtc2l6ZTogbGFyZ2VyO1xcbiAgfVxcbn1cIiwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvZ2xvYmFsLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLHVCQUF1QjtFQUN2QixtQkFBbUI7RUFDbkIsbUJBQW1CO0VBQ25CLGlCQUFpQjs7RUFFakIsMEJBQTBCO0FBQzVCOztBQUVBO0VBQ0UsdUJBQXVCO0VBQ3ZCLFlBQVk7O0VBRVosa0JBQWtCO0VBQ2xCLGlCQUFpQjs7RUFFakIsa0JBQWtCO0VBQ2xCLGlCQUFpQjtFQUNqQixZQUFZO0FBQ2Q7O0FBRUE7RUFDRSx1QkFBdUI7RUFDdkIsWUFBWTs7RUFFWixvQkFBb0I7RUFDcEIsa0JBQWtCO0FBQ3BCOztBQUVBO0VBQ0UsYUFBYTtFQUNiLHVCQUF1QjtFQUN2QixtQkFBbUI7RUFDbkIsU0FBUztFQUNULGFBQWE7RUFDYixZQUFZO0FBQ2Q7O0FBRUE7RUFDRTtJQUNFLGlCQUFpQjtFQUNuQjtBQUNGXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIi5nbG93IHtcXG4gIGJhY2tncm91bmQtY29sb3I6IGJsYWNrO1xcbiAgYm9yZGVyLXN0eWxlOiBzb2xpZDtcXG4gIGJvcmRlci1jb2xvcjogZ3JlZW47XFxuICBib3JkZXItd2lkdGg6IDVweDtcXG4gIFxcbiAgYm94LXNoYWRvdzogMCAwIDQwcHggYmxhY2s7XFxufVxcblxcbi5uYXZCdXR0b24ge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogZ3JlZW47XFxuICBjb2xvcjogYmxhY2s7XFxuXFxuICBib3JkZXItcmFkaXVzOiA1cHg7XFxuICBib3JkZXItd2lkdGg6IDBweDtcXG5cXG4gIGZvbnQtc2l6ZTogeC1sYXJnZTtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgcGFkZGluZzogNXB4O1xcbn1cXG5cXG4ubmF2QnV0dG9uOmhvdmVyIHtcXG4gIGJhY2tncm91bmQtY29sb3I6IGJsYWNrO1xcbiAgY29sb3I6IGdyZWVuO1xcblxcbiAgb3V0bGluZS1zdHlsZTogc29saWQ7XFxuICBvdXRsaW5lLXdpZHRoOiAycHg7XFxufVxcblxcbi5mb290ZXIge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG4gIGdhcDogMTBweDtcXG4gIHBhZGRpbmc6IDEwcHg7XFxuICB3aWR0aDogOTAwcHg7XFxufVxcblxcbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogMTAwMHB4KSB7XFxuICAubmF2QnV0dG9ue1xcbiAgICBmb250LXNpemU6IGxhcmdlcjtcXG4gIH1cXG59XCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfR0VUX1VSTF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9nZXRVcmwuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX1VSTF9JTVBPUlRfMF9fXyA9IG5ldyBVUkwoXCJpbWdzL25vb2RsZXN0di5wbmdcIiwgaW1wb3J0Lm1ldGEudXJsKTtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbnZhciBfX19DU1NfTE9BREVSX1VSTF9SRVBMQUNFTUVOVF8wX19fID0gX19fQ1NTX0xPQURFUl9HRVRfVVJMX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX1VSTF9JTVBPUlRfMF9fXyk7XG4vLyBNb2R1bGVcbl9fX0NTU19MT0FERVJfRVhQT1JUX19fLnB1c2goW21vZHVsZS5pZCwgXCIuaGVhZGVyIHtcXG4gICAgYmFja2dyb3VuZC1pbWFnZTogdXJsKFwiICsgX19fQ1NTX0xPQURFUl9VUkxfUkVQTEFDRU1FTlRfMF9fXyArIFwiKTtcXG4gICAgYmFja2dyb3VuZC1zaXplOiBjb3ZlcjtcXG4gICAgYmFja2dyb3VuZC1yZXBlYXQ6IG5vLXJlcGVhdDtcXG4gICAgYmFja2dyb3VuZC1wb3NpdGlvbjogY2VudGVyO1xcblxcbiAgICB3aWR0aDogOTAwcHg7XFxuICAgIGhlaWdodDogNjAwcHg7XFxuXFxuICAgIGRpc3BsYXk6aW5saW5lLWJsb2NrO1xcbn1cXG5cXG4ub3BhcXVle1xcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuNSk7XFxuICAgIGZvbnQtc2l6ZTogeHgtbGFyZ2U7XFxuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gICAgY29sb3I6IHdoaXRlO1xcbiAgICBtYXJnaW4tdG9wOiAyNTBweDtcXG59XFxuXFxuLm5hdkJhciB7XFxuICAgIGRpc3BsYXk6IGZsZXg7XFxuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG5cXG4gICAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7XFxuICAgIHBhZGRpbmc6IDVweCAxMHB4O1xcbn1cXG5cXG4udGl0bGVJbWd7XFxuICAgIHdpZHRoOiAxNTBweDtcXG4gICAgaGVpZ2h0OiA1MHB4O1xcbn1cXG5cXG4ubWFwIHtcXG4gICAgd2lkdGg6IDkwMHB4O1xcbn1cXG5cXG4uc3RvcmVIb3Vyc3tcXG4gICAgd2lkdGg6IDkwMHB4O1xcbiAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xcbiAgICBwYWRkaW5nOiA1cHggMTBweDtcXG4gICAgZm9udC1zaXplOiB4LWxhcmdlO1xcbn1cXG5cXG4uc3RvcmVIb3VycyB0YWJsZSB7XFxuICAgIGZsZXg6IDE7XFxufVxcblxcbi5zdG9yZUhvdXJzIHRhYmxlIHRyIHtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xcbn1cXG5cXG4uc3RvcmVIb3VycyB0YWJsZSB0aCB7XFxuICAgIHBhZGRpbmc6IDVweDtcXG4gICAgdGV4dC1hbGlnbjogbGVmdDtcXG59XFxuXFxuLmluZm9ybWF0aW9uIHtcXG4gICAgcGFkZGluZzogMjVweDtcXG4gICAgZm9udC1zaXplOiBsYXJnZTtcXG59XFxuXFxuLmNyZWRpdHMge1xcbiAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xcbiAgICB3aWR0aDogMTAwJTtcXG4gICAgZ2FwOiAxMHB4O1xcbiAgICBmb250LXNpemU6IHgtbGFyZ2U7XFxuICAgIHBhZGRpbmc6IDIwcHg7XFxufVxcblxcblxcbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogMTAwMHB4KSB7XFxuICAgICNjb250ZW50ID4gKiB7XFxuICAgICAgICB3aWR0aDogOTV2dztcXG4gICAgICAgIGhlaWdodDogYXV0bztcXG4gICAgfVxcblxcbiAgICAudGl0bGVJbWd7XFxuICAgICAgICB3aWR0aDogMTAwcHg7XFxuICAgICAgICBoZWlnaHQ6IGF1dG87XFxuICAgIH1cXG59XCIsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL2luaXRpYWxQYWdlLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtJQUNJLHlEQUEyQztJQUMzQyxzQkFBc0I7SUFDdEIsNEJBQTRCO0lBQzVCLDJCQUEyQjs7SUFFM0IsWUFBWTtJQUNaLGFBQWE7O0lBRWIsb0JBQW9CO0FBQ3hCOztBQUVBO0lBQ0ksb0NBQW9DO0lBQ3BDLG1CQUFtQjtJQUNuQixrQkFBa0I7SUFDbEIsWUFBWTtJQUNaLGlCQUFpQjtBQUNyQjs7QUFFQTtJQUNJLGFBQWE7SUFDYiw4QkFBOEI7SUFDOUIsbUJBQW1COztJQUVuQix1QkFBdUI7SUFDdkIsaUJBQWlCO0FBQ3JCOztBQUVBO0lBQ0ksWUFBWTtJQUNaLFlBQVk7QUFDaEI7O0FBRUE7SUFDSSxZQUFZO0FBQ2hCOztBQUVBO0lBQ0ksWUFBWTtJQUNaLGFBQWE7SUFDYixtQkFBbUI7SUFDbkIsaUJBQWlCO0lBQ2pCLGtCQUFrQjtBQUN0Qjs7QUFFQTtJQUNJLE9BQU87QUFDWDs7QUFFQTtJQUNJLGFBQWE7SUFDYiw4QkFBOEI7SUFDOUIsbUJBQW1CO0FBQ3ZCOztBQUVBO0lBQ0ksWUFBWTtJQUNaLGdCQUFnQjtBQUNwQjs7QUFFQTtJQUNJLGFBQWE7SUFDYixnQkFBZ0I7QUFDcEI7O0FBRUE7SUFDSSxhQUFhO0lBQ2Isc0JBQXNCO0lBQ3RCLFdBQVc7SUFDWCxTQUFTO0lBQ1Qsa0JBQWtCO0lBQ2xCLGFBQWE7QUFDakI7OztBQUdBO0lBQ0k7UUFDSSxXQUFXO1FBQ1gsWUFBWTtJQUNoQjs7SUFFQTtRQUNJLFlBQVk7UUFDWixZQUFZO0lBQ2hCO0FBQ0pcIixcInNvdXJjZXNDb250ZW50XCI6W1wiLmhlYWRlciB7XFxuICAgIGJhY2tncm91bmQtaW1hZ2U6IHVybCgnaW1ncy9ub29kbGVzdHYucG5nJyk7XFxuICAgIGJhY2tncm91bmQtc2l6ZTogY292ZXI7XFxuICAgIGJhY2tncm91bmQtcmVwZWF0OiBuby1yZXBlYXQ7XFxuICAgIGJhY2tncm91bmQtcG9zaXRpb246IGNlbnRlcjtcXG5cXG4gICAgd2lkdGg6IDkwMHB4O1xcbiAgICBoZWlnaHQ6IDYwMHB4O1xcblxcbiAgICBkaXNwbGF5OmlubGluZS1ibG9jaztcXG59XFxuXFxuLm9wYXF1ZXtcXG4gICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjUpO1xcbiAgICBmb250LXNpemU6IHh4LWxhcmdlO1xcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICAgIGNvbG9yOiB3aGl0ZTtcXG4gICAgbWFyZ2luLXRvcDogMjUwcHg7XFxufVxcblxcbi5uYXZCYXIge1xcbiAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XFxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XFxuXFxuICAgIGJhY2tncm91bmQtY29sb3I6IGJsYWNrO1xcbiAgICBwYWRkaW5nOiA1cHggMTBweDtcXG59XFxuXFxuLnRpdGxlSW1ne1xcbiAgICB3aWR0aDogMTUwcHg7XFxuICAgIGhlaWdodDogNTBweDtcXG59XFxuXFxuLm1hcCB7XFxuICAgIHdpZHRoOiA5MDBweDtcXG59XFxuXFxuLnN0b3JlSG91cnN7XFxuICAgIHdpZHRoOiA5MDBweDtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG4gICAgcGFkZGluZzogNXB4IDEwcHg7XFxuICAgIGZvbnQtc2l6ZTogeC1sYXJnZTtcXG59XFxuXFxuLnN0b3JlSG91cnMgdGFibGUge1xcbiAgICBmbGV4OiAxO1xcbn1cXG5cXG4uc3RvcmVIb3VycyB0YWJsZSB0ciB7XFxuICAgIGRpc3BsYXk6IGZsZXg7XFxuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcXG59XFxuXFxuLnN0b3JlSG91cnMgdGFibGUgdGgge1xcbiAgICBwYWRkaW5nOiA1cHg7XFxuICAgIHRleHQtYWxpZ246IGxlZnQ7XFxufVxcblxcbi5pbmZvcm1hdGlvbiB7XFxuICAgIHBhZGRpbmc6IDI1cHg7XFxuICAgIGZvbnQtc2l6ZTogbGFyZ2U7XFxufVxcblxcbi5jcmVkaXRzIHtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICAgIGdhcDogMTBweDtcXG4gICAgZm9udC1zaXplOiB4LWxhcmdlO1xcbiAgICBwYWRkaW5nOiAyMHB4O1xcbn1cXG5cXG5cXG5AbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDEwMDBweCkge1xcbiAgICAjY29udGVudCA+ICoge1xcbiAgICAgICAgd2lkdGg6IDk1dnc7XFxuICAgICAgICBoZWlnaHQ6IGF1dG87XFxuICAgIH1cXG5cXG4gICAgLnRpdGxlSW1ne1xcbiAgICAgICAgd2lkdGg6IDEwMHB4O1xcbiAgICAgICAgaGVpZ2h0OiBhdXRvO1xcbiAgICB9XFxufVwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCIvLyBJbXBvcnRzXG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanNcIjtcbnZhciBfX19DU1NfTE9BREVSX0VYUE9SVF9fXyA9IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyhfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBcIi5tZW51Q29udGFpbmVyIHtcXG4gIHdpZHRoOiA5MDBweDtcXG59XFxuXFxuLm1lbnUge1xcbiAgd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IDc1MHB4O1xcbiAgZm9udC1zaXplOiB4LWxhcmdlO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbn1cXG5cXG4ubWVudSAgKntcXG4gIG91dGxpbmUtc3R5bGU6IHNvbGlkO1xcbiAgb3V0bGluZS1jb2xvcjogZ3JlZW47XFxufVxcblxcbi5tZW51IGNhcHRpb24ge1xcbiAgZm9udC1zaXplOiB4eC1sYXJnZTtcXG59XFxuXFxuQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiAxMDAwcHgpIHtcXG4gIC5tZW51Q29udGFpbmVye1xcbiAgICB3aWR0aDogOTV2dztcXG4gIH1cXG4gIFxcbiAgLm1lbnU+dHI+dGQ6bnRoLWNoaWxkKDQpLCAubWVudT50cj50aDpudGgtY2hpbGQoNCl7XFxuICAgIGRpc3BsYXk6IG5vbmU7XFxuICB9XFxuXFxuICAubWVudSB7XFxuICAgIGZvbnQtc2l6ZTpsYXJnZXI7XFxuICB9XFxufVwiLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9tZW51LmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLFlBQVk7QUFDZDs7QUFFQTtFQUNFLFdBQVc7RUFDWCxhQUFhO0VBQ2Isa0JBQWtCO0VBQ2xCLGtCQUFrQjtBQUNwQjs7QUFFQTtFQUNFLG9CQUFvQjtFQUNwQixvQkFBb0I7QUFDdEI7O0FBRUE7RUFDRSxtQkFBbUI7QUFDckI7O0FBRUE7RUFDRTtJQUNFLFdBQVc7RUFDYjs7RUFFQTtJQUNFLGFBQWE7RUFDZjs7RUFFQTtJQUNFLGdCQUFnQjtFQUNsQjtBQUNGXCIsXCJzb3VyY2VzQ29udGVudFwiOltcIi5tZW51Q29udGFpbmVyIHtcXG4gIHdpZHRoOiA5MDBweDtcXG59XFxuXFxuLm1lbnUge1xcbiAgd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IDc1MHB4O1xcbiAgZm9udC1zaXplOiB4LWxhcmdlO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbn1cXG5cXG4ubWVudSAgKntcXG4gIG91dGxpbmUtc3R5bGU6IHNvbGlkO1xcbiAgb3V0bGluZS1jb2xvcjogZ3JlZW47XFxufVxcblxcbi5tZW51IGNhcHRpb24ge1xcbiAgZm9udC1zaXplOiB4eC1sYXJnZTtcXG59XFxuXFxuQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiAxMDAwcHgpIHtcXG4gIC5tZW51Q29udGFpbmVye1xcbiAgICB3aWR0aDogOTV2dztcXG4gIH1cXG4gIFxcbiAgLm1lbnU+dHI+dGQ6bnRoLWNoaWxkKDQpLCAubWVudT50cj50aDpudGgtY2hpbGQoNCl7XFxuICAgIGRpc3BsYXk6IG5vbmU7XFxuICB9XFxuXFxuICAubWVudSB7XFxuICAgIGZvbnQtc2l6ZTpsYXJnZXI7XFxuICB9XFxufVwiXSxcInNvdXJjZVJvb3RcIjpcIlwifV0pO1xuLy8gRXhwb3J0c1xuZXhwb3J0IGRlZmF1bHQgX19fQ1NTX0xPQURFUl9FWFBPUlRfX187XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLypcbiAgTUlUIExpY2Vuc2UgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcbiAgQXV0aG9yIFRvYmlhcyBLb3BwZXJzIEBzb2tyYVxuKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcpIHtcbiAgdmFyIGxpc3QgPSBbXTtcblxuICAvLyByZXR1cm4gdGhlIGxpc3Qgb2YgbW9kdWxlcyBhcyBjc3Mgc3RyaW5nXG4gIGxpc3QudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHZhciBjb250ZW50ID0gXCJcIjtcbiAgICAgIHZhciBuZWVkTGF5ZXIgPSB0eXBlb2YgaXRlbVs1XSAhPT0gXCJ1bmRlZmluZWRcIjtcbiAgICAgIGlmIChpdGVtWzRdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChpdGVtWzRdLCBcIikge1wiKTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtWzJdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAbWVkaWEgXCIuY29uY2F0KGl0ZW1bMl0sIFwiIHtcIik7XG4gICAgICB9XG4gICAgICBpZiAobmVlZExheWVyKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAbGF5ZXJcIi5jb25jYXQoaXRlbVs1XS5sZW5ndGggPiAwID8gXCIgXCIuY29uY2F0KGl0ZW1bNV0pIDogXCJcIiwgXCIge1wiKTtcbiAgICAgIH1cbiAgICAgIGNvbnRlbnQgKz0gY3NzV2l0aE1hcHBpbmdUb1N0cmluZyhpdGVtKTtcbiAgICAgIGlmIChuZWVkTGF5ZXIpIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtWzJdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJ9XCI7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbVs0XSkge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfSkuam9pbihcIlwiKTtcbiAgfTtcblxuICAvLyBpbXBvcnQgYSBsaXN0IG9mIG1vZHVsZXMgaW50byB0aGUgbGlzdFxuICBsaXN0LmkgPSBmdW5jdGlvbiBpKG1vZHVsZXMsIG1lZGlhLCBkZWR1cGUsIHN1cHBvcnRzLCBsYXllcikge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlcyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgbW9kdWxlcyA9IFtbbnVsbCwgbW9kdWxlcywgdW5kZWZpbmVkXV07XG4gICAgfVxuICAgIHZhciBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzID0ge307XG4gICAgaWYgKGRlZHVwZSkge1xuICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCB0aGlzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIHZhciBpZCA9IHRoaXNba11bMF07XG4gICAgICAgIGlmIChpZCAhPSBudWxsKSB7XG4gICAgICAgICAgYWxyZWFkeUltcG9ydGVkTW9kdWxlc1tpZF0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIF9rID0gMDsgX2sgPCBtb2R1bGVzLmxlbmd0aDsgX2srKykge1xuICAgICAgdmFyIGl0ZW0gPSBbXS5jb25jYXQobW9kdWxlc1tfa10pO1xuICAgICAgaWYgKGRlZHVwZSAmJiBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2l0ZW1bMF1dKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBsYXllciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBpZiAodHlwZW9mIGl0ZW1bNV0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICBpdGVtWzVdID0gbGF5ZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQGxheWVyXCIuY29uY2F0KGl0ZW1bNV0ubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChpdGVtWzVdKSA6IFwiXCIsIFwiIHtcIikuY29uY2F0KGl0ZW1bMV0sIFwifVwiKTtcbiAgICAgICAgICBpdGVtWzVdID0gbGF5ZXI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChtZWRpYSkge1xuICAgICAgICBpZiAoIWl0ZW1bMl0pIHtcbiAgICAgICAgICBpdGVtWzJdID0gbWVkaWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQG1lZGlhIFwiLmNvbmNhdChpdGVtWzJdLCBcIiB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVsyXSA9IG1lZGlhO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc3VwcG9ydHMpIHtcbiAgICAgICAgaWYgKCFpdGVtWzRdKSB7XG4gICAgICAgICAgaXRlbVs0XSA9IFwiXCIuY29uY2F0KHN1cHBvcnRzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtWzFdID0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChpdGVtWzRdLCBcIikge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bNF0gPSBzdXBwb3J0cztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGlzdC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIGxpc3Q7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIGlmICghdXJsKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICB1cmwgPSBTdHJpbmcodXJsLl9fZXNNb2R1bGUgPyB1cmwuZGVmYXVsdCA6IHVybCk7XG5cbiAgLy8gSWYgdXJsIGlzIGFscmVhZHkgd3JhcHBlZCBpbiBxdW90ZXMsIHJlbW92ZSB0aGVtXG4gIGlmICgvXlsnXCJdLipbJ1wiXSQvLnRlc3QodXJsKSkge1xuICAgIHVybCA9IHVybC5zbGljZSgxLCAtMSk7XG4gIH1cbiAgaWYgKG9wdGlvbnMuaGFzaCkge1xuICAgIHVybCArPSBvcHRpb25zLmhhc2g7XG4gIH1cblxuICAvLyBTaG91bGQgdXJsIGJlIHdyYXBwZWQ/XG4gIC8vIFNlZSBodHRwczovL2RyYWZ0cy5jc3N3Zy5vcmcvY3NzLXZhbHVlcy0zLyN1cmxzXG4gIGlmICgvW1wiJygpIFxcdFxcbl18KCUyMCkvLnRlc3QodXJsKSB8fCBvcHRpb25zLm5lZWRRdW90ZXMpIHtcbiAgICByZXR1cm4gXCJcXFwiXCIuY29uY2F0KHVybC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykucmVwbGFjZSgvXFxuL2csIFwiXFxcXG5cIiksIFwiXFxcIlwiKTtcbiAgfVxuICByZXR1cm4gdXJsO1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaXRlbSkge1xuICB2YXIgY29udGVudCA9IGl0ZW1bMV07XG4gIHZhciBjc3NNYXBwaW5nID0gaXRlbVszXTtcbiAgaWYgKCFjc3NNYXBwaW5nKSB7XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH1cbiAgaWYgKHR5cGVvZiBidG9hID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB2YXIgYmFzZTY0ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoY3NzTWFwcGluZykpKSk7XG4gICAgdmFyIGRhdGEgPSBcInNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LFwiLmNvbmNhdChiYXNlNjQpO1xuICAgIHZhciBzb3VyY2VNYXBwaW5nID0gXCIvKiMgXCIuY29uY2F0KGRhdGEsIFwiICovXCIpO1xuICAgIHJldHVybiBbY29udGVudF0uY29uY2F0KFtzb3VyY2VNYXBwaW5nXSkuam9pbihcIlxcblwiKTtcbiAgfVxuICByZXR1cm4gW2NvbnRlbnRdLmpvaW4oXCJcXG5cIik7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gW1tcIk5hbWVcIixcIkhQIHJlc3RvcmVkXCIsXCJSYWRzXCIsXCJXZWlnaHRcIixcIlZhbHVlXCJdLFtcIkFuZ2xlciBNZWF0XCIsXCIzNVwiLFwiMTBcIixcIjAuNVwiLFwiMjBcIl0sW1wiQmFrZWQgYmxvYXRmbHlcIixcIjQwXCIsXCIwXCIsXCIwLjVcIixcIjE1XCJdLFtcIkRlYXRoY2xhdyBFZ2cgb21lbGV0dGVcIixcIjExNVwiLFwiMFwiLFwiMC4xXCIsXCI4MFwiXSxbXCJEZWF0aGNsYXcgU3RlYWtcIixcIjE4NVwiLFwiMFwiLFwiMVwiLFwiMTMwXCJdLFtcIkdyaWxsZWQgUmFkcm9hY2hcIixcIjMwXCIsXCIwXCIsXCIwLjVcIixcIjdcIl0sW1wiSGFwcHkgQmlydGhkYXkgU3dlZXRyb2xsXCIsXCIyMFwiLFwiNFwiLFwiMFwiLFwiMFwiXSxbXCJJZ3VhbmEgb24gYSBzdGlja1wiLFwiNDBcIixcIjBcIixcIjAuMVwiLFwiMzNcIl0sW1wiTWlyZWx1cmsgY2FrZVwiLFwiMTQwXCIsXCIwXCIsXCIwLjFcIixcIjM1XCJdLFtcIk1vbGUgcmF0IGNodW5rc1wiLFwiNTBcIixcIjBcIixcIjAuNVwiLFwiOFwiXSxbXCJSYWRzY29wcmlhbiBzdGVha1wiLFwiMTUwXCIsXCIwXCIsXCIxXCIsXCI2NVwiXSxbXCJOb29kbGUgY3VwXCIsXCIyMFwiLFwiMFwiLFwiMC41XCIsXCIxMFwiXV0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0XCIwLjIwXCI6IFwiMzlcIixcblx0XCIwLjIxXCI6IFwiNDFcIixcblx0XCIwLjIyXCI6IFwiNDFcIixcblx0XCIwLjIzXCI6IFwiNDFcIixcblx0XCIwLjI0XCI6IFwiNDFcIixcblx0XCIwLjI1XCI6IFwiNDJcIixcblx0XCIwLjI2XCI6IFwiNDJcIixcblx0XCIwLjI3XCI6IFwiNDNcIixcblx0XCIwLjI4XCI6IFwiNDNcIixcblx0XCIwLjI5XCI6IFwiNDNcIixcblx0XCIwLjMwXCI6IFwiNDRcIixcblx0XCIwLjMxXCI6IFwiNDVcIixcblx0XCIwLjMyXCI6IFwiNDVcIixcblx0XCIwLjMzXCI6IFwiNDVcIixcblx0XCIwLjM0XCI6IFwiNDVcIixcblx0XCIwLjM1XCI6IFwiNDVcIixcblx0XCIwLjM2XCI6IFwiNDdcIixcblx0XCIwLjM3XCI6IFwiNDlcIixcblx0XCIxLjBcIjogXCI0OVwiLFxuXHRcIjEuMVwiOiBcIjUwXCIsXG5cdFwiMS4yXCI6IFwiNTFcIixcblx0XCIxLjNcIjogXCI1MlwiLFxuXHRcIjEuNFwiOiBcIjUzXCIsXG5cdFwiMS41XCI6IFwiNTRcIixcblx0XCIxLjZcIjogXCI1NlwiLFxuXHRcIjEuN1wiOiBcIjU4XCIsXG5cdFwiMS44XCI6IFwiNTlcIixcblx0XCIyLjBcIjogXCI2MVwiLFxuXHRcIjIuMVwiOiBcIjYxXCIsXG5cdFwiMy4wXCI6IFwiNjZcIixcblx0XCIzLjFcIjogXCI2NlwiLFxuXHRcIjQuMFwiOiBcIjY5XCIsXG5cdFwiNC4xXCI6IFwiNjlcIixcblx0XCI0LjJcIjogXCI2OVwiLFxuXHRcIjUuMFwiOiBcIjczXCIsXG5cdFwiNi4wXCI6IFwiNzZcIixcblx0XCI2LjFcIjogXCI3NlwiLFxuXHRcIjcuMFwiOiBcIjc4XCIsXG5cdFwiNy4xXCI6IFwiNzhcIixcblx0XCI3LjJcIjogXCI3OFwiLFxuXHRcIjcuM1wiOiBcIjc4XCIsXG5cdFwiOC4wXCI6IFwiODBcIixcblx0XCI4LjFcIjogXCI4MFwiLFxuXHRcIjguMlwiOiBcIjgwXCIsXG5cdFwiOC4zXCI6IFwiODBcIixcblx0XCI4LjRcIjogXCI4MFwiLFxuXHRcIjguNVwiOiBcIjgwXCIsXG5cdFwiOS4wXCI6IFwiODNcIixcblx0XCI5LjFcIjogXCI4M1wiLFxuXHRcIjkuMlwiOiBcIjgzXCIsXG5cdFwiOS4zXCI6IFwiODNcIixcblx0XCI5LjRcIjogXCI4M1wiLFxuXHRcIjEwLjBcIjogXCI4NVwiLFxuXHRcIjEwLjFcIjogXCI4NVwiLFxuXHRcIjEwLjJcIjogXCI4NVwiLFxuXHRcIjEwLjNcIjogXCI4NVwiLFxuXHRcIjEwLjRcIjogXCI4NVwiLFxuXHRcIjExLjBcIjogXCI4N1wiLFxuXHRcIjExLjFcIjogXCI4N1wiLFxuXHRcIjExLjJcIjogXCI4N1wiLFxuXHRcIjExLjNcIjogXCI4N1wiLFxuXHRcIjExLjRcIjogXCI4N1wiLFxuXHRcIjExLjVcIjogXCI4N1wiLFxuXHRcIjEyLjBcIjogXCI4OVwiLFxuXHRcIjEyLjFcIjogXCI4OVwiLFxuXHRcIjEyLjJcIjogXCI4OVwiLFxuXHRcIjEzLjBcIjogXCI5MVwiLFxuXHRcIjEzLjFcIjogXCI5MVwiLFxuXHRcIjEzLjJcIjogXCI5MVwiLFxuXHRcIjEzLjNcIjogXCI5MVwiLFxuXHRcIjEzLjRcIjogXCI5MVwiLFxuXHRcIjEzLjVcIjogXCI5MVwiLFxuXHRcIjEzLjZcIjogXCI5MVwiLFxuXHRcIjE0LjBcIjogXCI5M1wiLFxuXHRcIjE0LjFcIjogXCI5M1wiLFxuXHRcIjE0LjJcIjogXCI5M1wiLFxuXHRcIjE1LjBcIjogXCI5NFwiLFxuXHRcIjE1LjFcIjogXCI5NFwiLFxuXHRcIjE1LjJcIjogXCI5NFwiLFxuXHRcIjE1LjNcIjogXCI5NFwiLFxuXHRcIjE1LjRcIjogXCI5NFwiLFxuXHRcIjE1LjVcIjogXCI5NFwiLFxuXHRcIjE2LjBcIjogXCI5NlwiLFxuXHRcIjE2LjFcIjogXCI5NlwiLFxuXHRcIjE2LjJcIjogXCI5NlwiLFxuXHRcIjE3LjBcIjogXCI5OFwiLFxuXHRcIjE3LjFcIjogXCI5OFwiLFxuXHRcIjE3LjJcIjogXCI5OFwiLFxuXHRcIjE3LjNcIjogXCI5OFwiLFxuXHRcIjE3LjRcIjogXCI5OFwiLFxuXHRcIjE4LjBcIjogXCIxMDBcIixcblx0XCIxOC4xXCI6IFwiMTAwXCIsXG5cdFwiMTguMlwiOiBcIjEwMFwiLFxuXHRcIjE4LjNcIjogXCIxMDBcIixcblx0XCIxOS4wXCI6IFwiMTAyXCIsXG5cdFwiMTkuMVwiOiBcIjEwMlwiLFxuXHRcIjIwLjBcIjogXCIxMDRcIixcblx0XCIyMC4xXCI6IFwiMTA0XCIsXG5cdFwiMjAuMlwiOiBcIjEwNFwiLFxuXHRcIjIwLjNcIjogXCIxMDRcIixcblx0XCIyMS4wXCI6IFwiMTA2XCIsXG5cdFwiMjEuMVwiOiBcIjEwNlwiLFxuXHRcIjIyLjBcIjogXCIxMDhcIlxufTsiLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludCBuby1pbnZhbGlkLXRoaXM6IDEgKi9cblxudmFyIEVSUk9SX01FU1NBR0UgPSAnRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgY2FsbGVkIG9uIGluY29tcGF0aWJsZSAnO1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciBmdW5jVHlwZSA9ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYmluZCh0aGF0KSB7XG4gICAgdmFyIHRhcmdldCA9IHRoaXM7XG4gICAgaWYgKHR5cGVvZiB0YXJnZXQgIT09ICdmdW5jdGlvbicgfHwgdG9TdHIuY2FsbCh0YXJnZXQpICE9PSBmdW5jVHlwZSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEVSUk9SX01FU1NBR0UgKyB0YXJnZXQpO1xuICAgIH1cbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgIHZhciBib3VuZDtcbiAgICB2YXIgYmluZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcyBpbnN0YW5jZW9mIGJvdW5kKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gdGFyZ2V0LmFwcGx5KFxuICAgICAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICAgICAgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmIChPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldC5hcHBseShcbiAgICAgICAgICAgICAgICB0aGF0LFxuICAgICAgICAgICAgICAgIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGJvdW5kTGVuZ3RoID0gTWF0aC5tYXgoMCwgdGFyZ2V0Lmxlbmd0aCAtIGFyZ3MubGVuZ3RoKTtcbiAgICB2YXIgYm91bmRBcmdzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib3VuZExlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJvdW5kQXJncy5wdXNoKCckJyArIGkpO1xuICAgIH1cblxuICAgIGJvdW5kID0gRnVuY3Rpb24oJ2JpbmRlcicsICdyZXR1cm4gZnVuY3Rpb24gKCcgKyBib3VuZEFyZ3Muam9pbignLCcpICsgJyl7IHJldHVybiBiaW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpOyB9JykoYmluZGVyKTtcblxuICAgIGlmICh0YXJnZXQucHJvdG90eXBlKSB7XG4gICAgICAgIHZhciBFbXB0eSA9IGZ1bmN0aW9uIEVtcHR5KCkge307XG4gICAgICAgIEVtcHR5LnByb3RvdHlwZSA9IHRhcmdldC5wcm90b3R5cGU7XG4gICAgICAgIGJvdW5kLnByb3RvdHlwZSA9IG5ldyBFbXB0eSgpO1xuICAgICAgICBFbXB0eS5wcm90b3R5cGUgPSBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBib3VuZDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbXBsZW1lbnRhdGlvbiA9IHJlcXVpcmUoJy4vaW1wbGVtZW50YXRpb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCB8fCBpbXBsZW1lbnRhdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHVuZGVmaW5lZDtcblxudmFyICRTeW50YXhFcnJvciA9IFN5bnRheEVycm9yO1xudmFyICRGdW5jdGlvbiA9IEZ1bmN0aW9uO1xudmFyICRUeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb25zaXN0ZW50LXJldHVyblxudmFyIGdldEV2YWxsZWRDb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIChleHByZXNzaW9uU3ludGF4KSB7XG5cdHRyeSB7XG5cdFx0cmV0dXJuICRGdW5jdGlvbignXCJ1c2Ugc3RyaWN0XCI7IHJldHVybiAoJyArIGV4cHJlc3Npb25TeW50YXggKyAnKS5jb25zdHJ1Y3RvcjsnKSgpO1xuXHR9IGNhdGNoIChlKSB7fVxufTtcblxudmFyICRnT1BEID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbmlmICgkZ09QRCkge1xuXHR0cnkge1xuXHRcdCRnT1BEKHt9LCAnJyk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHQkZ09QRCA9IG51bGw7IC8vIHRoaXMgaXMgSUUgOCwgd2hpY2ggaGFzIGEgYnJva2VuIGdPUERcblx0fVxufVxuXG52YXIgdGhyb3dUeXBlRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdHRocm93IG5ldyAkVHlwZUVycm9yKCk7XG59O1xudmFyIFRocm93VHlwZUVycm9yID0gJGdPUERcblx0PyAoZnVuY3Rpb24gKCkge1xuXHRcdHRyeSB7XG5cdFx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLWV4cHJlc3Npb25zLCBuby1jYWxsZXIsIG5vLXJlc3RyaWN0ZWQtcHJvcGVydGllc1xuXHRcdFx0YXJndW1lbnRzLmNhbGxlZTsgLy8gSUUgOCBkb2VzIG5vdCB0aHJvdyBoZXJlXG5cdFx0XHRyZXR1cm4gdGhyb3dUeXBlRXJyb3I7XG5cdFx0fSBjYXRjaCAoY2FsbGVlVGhyb3dzKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHQvLyBJRSA4IHRocm93cyBvbiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGFyZ3VtZW50cywgJycpXG5cdFx0XHRcdHJldHVybiAkZ09QRChhcmd1bWVudHMsICdjYWxsZWUnKS5nZXQ7XG5cdFx0XHR9IGNhdGNoIChnT1BEdGhyb3dzKSB7XG5cdFx0XHRcdHJldHVybiB0aHJvd1R5cGVFcnJvcjtcblx0XHRcdH1cblx0XHR9XG5cdH0oKSlcblx0OiB0aHJvd1R5cGVFcnJvcjtcblxudmFyIGhhc1N5bWJvbHMgPSByZXF1aXJlKCdoYXMtc3ltYm9scycpKCk7XG5cbnZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiAoeCkgeyByZXR1cm4geC5fX3Byb3RvX187IH07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcHJvdG9cblxudmFyIG5lZWRzRXZhbCA9IHt9O1xuXG52YXIgVHlwZWRBcnJheSA9IHR5cGVvZiBVaW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IGdldFByb3RvKFVpbnQ4QXJyYXkpO1xuXG52YXIgSU5UUklOU0lDUyA9IHtcblx0JyVBZ2dyZWdhdGVFcnJvciUnOiB0eXBlb2YgQWdncmVnYXRlRXJyb3IgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogQWdncmVnYXRlRXJyb3IsXG5cdCclQXJyYXklJzogQXJyYXksXG5cdCclQXJyYXlCdWZmZXIlJzogdHlwZW9mIEFycmF5QnVmZmVyID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEFycmF5QnVmZmVyLFxuXHQnJUFycmF5SXRlcmF0b3JQcm90b3R5cGUlJzogaGFzU3ltYm9scyA/IGdldFByb3RvKFtdW1N5bWJvbC5pdGVyYXRvcl0oKSkgOiB1bmRlZmluZWQsXG5cdCclQXN5bmNGcm9tU3luY0l0ZXJhdG9yUHJvdG90eXBlJSc6IHVuZGVmaW5lZCxcblx0JyVBc3luY0Z1bmN0aW9uJSc6IG5lZWRzRXZhbCxcblx0JyVBc3luY0dlbmVyYXRvciUnOiBuZWVkc0V2YWwsXG5cdCclQXN5bmNHZW5lcmF0b3JGdW5jdGlvbiUnOiBuZWVkc0V2YWwsXG5cdCclQXN5bmNJdGVyYXRvclByb3RvdHlwZSUnOiBuZWVkc0V2YWwsXG5cdCclQXRvbWljcyUnOiB0eXBlb2YgQXRvbWljcyA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBBdG9taWNzLFxuXHQnJUJpZ0ludCUnOiB0eXBlb2YgQmlnSW50ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEJpZ0ludCxcblx0JyVCb29sZWFuJSc6IEJvb2xlYW4sXG5cdCclRGF0YVZpZXclJzogdHlwZW9mIERhdGFWaWV3ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IERhdGFWaWV3LFxuXHQnJURhdGUlJzogRGF0ZSxcblx0JyVkZWNvZGVVUkklJzogZGVjb2RlVVJJLFxuXHQnJWRlY29kZVVSSUNvbXBvbmVudCUnOiBkZWNvZGVVUklDb21wb25lbnQsXG5cdCclZW5jb2RlVVJJJSc6IGVuY29kZVVSSSxcblx0JyVlbmNvZGVVUklDb21wb25lbnQlJzogZW5jb2RlVVJJQ29tcG9uZW50LFxuXHQnJUVycm9yJSc6IEVycm9yLFxuXHQnJWV2YWwlJzogZXZhbCwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1ldmFsXG5cdCclRXZhbEVycm9yJSc6IEV2YWxFcnJvcixcblx0JyVGbG9hdDMyQXJyYXklJzogdHlwZW9mIEZsb2F0MzJBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBGbG9hdDMyQXJyYXksXG5cdCclRmxvYXQ2NEFycmF5JSc6IHR5cGVvZiBGbG9hdDY0QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogRmxvYXQ2NEFycmF5LFxuXHQnJUZpbmFsaXphdGlvblJlZ2lzdHJ5JSc6IHR5cGVvZiBGaW5hbGl6YXRpb25SZWdpc3RyeSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBGaW5hbGl6YXRpb25SZWdpc3RyeSxcblx0JyVGdW5jdGlvbiUnOiAkRnVuY3Rpb24sXG5cdCclR2VuZXJhdG9yRnVuY3Rpb24lJzogbmVlZHNFdmFsLFxuXHQnJUludDhBcnJheSUnOiB0eXBlb2YgSW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEludDhBcnJheSxcblx0JyVJbnQxNkFycmF5JSc6IHR5cGVvZiBJbnQxNkFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEludDE2QXJyYXksXG5cdCclSW50MzJBcnJheSUnOiB0eXBlb2YgSW50MzJBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBJbnQzMkFycmF5LFxuXHQnJWlzRmluaXRlJSc6IGlzRmluaXRlLFxuXHQnJWlzTmFOJSc6IGlzTmFOLFxuXHQnJUl0ZXJhdG9yUHJvdG90eXBlJSc6IGhhc1N5bWJvbHMgPyBnZXRQcm90byhnZXRQcm90byhbXVtTeW1ib2wuaXRlcmF0b3JdKCkpKSA6IHVuZGVmaW5lZCxcblx0JyVKU09OJSc6IHR5cGVvZiBKU09OID09PSAnb2JqZWN0JyA/IEpTT04gOiB1bmRlZmluZWQsXG5cdCclTWFwJSc6IHR5cGVvZiBNYXAgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogTWFwLFxuXHQnJU1hcEl0ZXJhdG9yUHJvdG90eXBlJSc6IHR5cGVvZiBNYXAgPT09ICd1bmRlZmluZWQnIHx8ICFoYXNTeW1ib2xzID8gdW5kZWZpbmVkIDogZ2V0UHJvdG8obmV3IE1hcCgpW1N5bWJvbC5pdGVyYXRvcl0oKSksXG5cdCclTWF0aCUnOiBNYXRoLFxuXHQnJU51bWJlciUnOiBOdW1iZXIsXG5cdCclT2JqZWN0JSc6IE9iamVjdCxcblx0JyVwYXJzZUZsb2F0JSc6IHBhcnNlRmxvYXQsXG5cdCclcGFyc2VJbnQlJzogcGFyc2VJbnQsXG5cdCclUHJvbWlzZSUnOiB0eXBlb2YgUHJvbWlzZSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBQcm9taXNlLFxuXHQnJVByb3h5JSc6IHR5cGVvZiBQcm94eSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBQcm94eSxcblx0JyVSYW5nZUVycm9yJSc6IFJhbmdlRXJyb3IsXG5cdCclUmVmZXJlbmNlRXJyb3IlJzogUmVmZXJlbmNlRXJyb3IsXG5cdCclUmVmbGVjdCUnOiB0eXBlb2YgUmVmbGVjdCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBSZWZsZWN0LFxuXHQnJVJlZ0V4cCUnOiBSZWdFeHAsXG5cdCclU2V0JSc6IHR5cGVvZiBTZXQgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogU2V0LFxuXHQnJVNldEl0ZXJhdG9yUHJvdG90eXBlJSc6IHR5cGVvZiBTZXQgPT09ICd1bmRlZmluZWQnIHx8ICFoYXNTeW1ib2xzID8gdW5kZWZpbmVkIDogZ2V0UHJvdG8obmV3IFNldCgpW1N5bWJvbC5pdGVyYXRvcl0oKSksXG5cdCclU2hhcmVkQXJyYXlCdWZmZXIlJzogdHlwZW9mIFNoYXJlZEFycmF5QnVmZmVyID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFNoYXJlZEFycmF5QnVmZmVyLFxuXHQnJVN0cmluZyUnOiBTdHJpbmcsXG5cdCclU3RyaW5nSXRlcmF0b3JQcm90b3R5cGUlJzogaGFzU3ltYm9scyA/IGdldFByb3RvKCcnW1N5bWJvbC5pdGVyYXRvcl0oKSkgOiB1bmRlZmluZWQsXG5cdCclU3ltYm9sJSc6IGhhc1N5bWJvbHMgPyBTeW1ib2wgOiB1bmRlZmluZWQsXG5cdCclU3ludGF4RXJyb3IlJzogJFN5bnRheEVycm9yLFxuXHQnJVRocm93VHlwZUVycm9yJSc6IFRocm93VHlwZUVycm9yLFxuXHQnJVR5cGVkQXJyYXklJzogVHlwZWRBcnJheSxcblx0JyVUeXBlRXJyb3IlJzogJFR5cGVFcnJvcixcblx0JyVVaW50OEFycmF5JSc6IHR5cGVvZiBVaW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQ4QXJyYXksXG5cdCclVWludDhDbGFtcGVkQXJyYXklJzogdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQ4Q2xhbXBlZEFycmF5LFxuXHQnJVVpbnQxNkFycmF5JSc6IHR5cGVvZiBVaW50MTZBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50MTZBcnJheSxcblx0JyVVaW50MzJBcnJheSUnOiB0eXBlb2YgVWludDMyQXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogVWludDMyQXJyYXksXG5cdCclVVJJRXJyb3IlJzogVVJJRXJyb3IsXG5cdCclV2Vha01hcCUnOiB0eXBlb2YgV2Vha01hcCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBXZWFrTWFwLFxuXHQnJVdlYWtSZWYlJzogdHlwZW9mIFdlYWtSZWYgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogV2Vha1JlZixcblx0JyVXZWFrU2V0JSc6IHR5cGVvZiBXZWFrU2V0ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFdlYWtTZXRcbn07XG5cbnZhciBkb0V2YWwgPSBmdW5jdGlvbiBkb0V2YWwobmFtZSkge1xuXHR2YXIgdmFsdWU7XG5cdGlmIChuYW1lID09PSAnJUFzeW5jRnVuY3Rpb24lJykge1xuXHRcdHZhbHVlID0gZ2V0RXZhbGxlZENvbnN0cnVjdG9yKCdhc3luYyBmdW5jdGlvbiAoKSB7fScpO1xuXHR9IGVsc2UgaWYgKG5hbWUgPT09ICclR2VuZXJhdG9yRnVuY3Rpb24lJykge1xuXHRcdHZhbHVlID0gZ2V0RXZhbGxlZENvbnN0cnVjdG9yKCdmdW5jdGlvbiogKCkge30nKTtcblx0fSBlbHNlIGlmIChuYW1lID09PSAnJUFzeW5jR2VuZXJhdG9yRnVuY3Rpb24lJykge1xuXHRcdHZhbHVlID0gZ2V0RXZhbGxlZENvbnN0cnVjdG9yKCdhc3luYyBmdW5jdGlvbiogKCkge30nKTtcblx0fSBlbHNlIGlmIChuYW1lID09PSAnJUFzeW5jR2VuZXJhdG9yJScpIHtcblx0XHR2YXIgZm4gPSBkb0V2YWwoJyVBc3luY0dlbmVyYXRvckZ1bmN0aW9uJScpO1xuXHRcdGlmIChmbikge1xuXHRcdFx0dmFsdWUgPSBmbi5wcm90b3R5cGU7XG5cdFx0fVxuXHR9IGVsc2UgaWYgKG5hbWUgPT09ICclQXN5bmNJdGVyYXRvclByb3RvdHlwZSUnKSB7XG5cdFx0dmFyIGdlbiA9IGRvRXZhbCgnJUFzeW5jR2VuZXJhdG9yJScpO1xuXHRcdGlmIChnZW4pIHtcblx0XHRcdHZhbHVlID0gZ2V0UHJvdG8oZ2VuLnByb3RvdHlwZSk7XG5cdFx0fVxuXHR9XG5cblx0SU5UUklOU0lDU1tuYW1lXSA9IHZhbHVlO1xuXG5cdHJldHVybiB2YWx1ZTtcbn07XG5cbnZhciBMRUdBQ1lfQUxJQVNFUyA9IHtcblx0JyVBcnJheUJ1ZmZlclByb3RvdHlwZSUnOiBbJ0FycmF5QnVmZmVyJywgJ3Byb3RvdHlwZSddLFxuXHQnJUFycmF5UHJvdG90eXBlJSc6IFsnQXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclQXJyYXlQcm90b19lbnRyaWVzJSc6IFsnQXJyYXknLCAncHJvdG90eXBlJywgJ2VudHJpZXMnXSxcblx0JyVBcnJheVByb3RvX2ZvckVhY2glJzogWydBcnJheScsICdwcm90b3R5cGUnLCAnZm9yRWFjaCddLFxuXHQnJUFycmF5UHJvdG9fa2V5cyUnOiBbJ0FycmF5JywgJ3Byb3RvdHlwZScsICdrZXlzJ10sXG5cdCclQXJyYXlQcm90b192YWx1ZXMlJzogWydBcnJheScsICdwcm90b3R5cGUnLCAndmFsdWVzJ10sXG5cdCclQXN5bmNGdW5jdGlvblByb3RvdHlwZSUnOiBbJ0FzeW5jRnVuY3Rpb24nLCAncHJvdG90eXBlJ10sXG5cdCclQXN5bmNHZW5lcmF0b3IlJzogWydBc3luY0dlbmVyYXRvckZ1bmN0aW9uJywgJ3Byb3RvdHlwZSddLFxuXHQnJUFzeW5jR2VuZXJhdG9yUHJvdG90eXBlJSc6IFsnQXN5bmNHZW5lcmF0b3JGdW5jdGlvbicsICdwcm90b3R5cGUnLCAncHJvdG90eXBlJ10sXG5cdCclQm9vbGVhblByb3RvdHlwZSUnOiBbJ0Jvb2xlYW4nLCAncHJvdG90eXBlJ10sXG5cdCclRGF0YVZpZXdQcm90b3R5cGUlJzogWydEYXRhVmlldycsICdwcm90b3R5cGUnXSxcblx0JyVEYXRlUHJvdG90eXBlJSc6IFsnRGF0ZScsICdwcm90b3R5cGUnXSxcblx0JyVFcnJvclByb3RvdHlwZSUnOiBbJ0Vycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJUV2YWxFcnJvclByb3RvdHlwZSUnOiBbJ0V2YWxFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVGbG9hdDMyQXJyYXlQcm90b3R5cGUlJzogWydGbG9hdDMyQXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclRmxvYXQ2NEFycmF5UHJvdG90eXBlJSc6IFsnRmxvYXQ2NEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJUZ1bmN0aW9uUHJvdG90eXBlJSc6IFsnRnVuY3Rpb24nLCAncHJvdG90eXBlJ10sXG5cdCclR2VuZXJhdG9yJSc6IFsnR2VuZXJhdG9yRnVuY3Rpb24nLCAncHJvdG90eXBlJ10sXG5cdCclR2VuZXJhdG9yUHJvdG90eXBlJSc6IFsnR2VuZXJhdG9yRnVuY3Rpb24nLCAncHJvdG90eXBlJywgJ3Byb3RvdHlwZSddLFxuXHQnJUludDhBcnJheVByb3RvdHlwZSUnOiBbJ0ludDhBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVJbnQxNkFycmF5UHJvdG90eXBlJSc6IFsnSW50MTZBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVJbnQzMkFycmF5UHJvdG90eXBlJSc6IFsnSW50MzJBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVKU09OUGFyc2UlJzogWydKU09OJywgJ3BhcnNlJ10sXG5cdCclSlNPTlN0cmluZ2lmeSUnOiBbJ0pTT04nLCAnc3RyaW5naWZ5J10sXG5cdCclTWFwUHJvdG90eXBlJSc6IFsnTWFwJywgJ3Byb3RvdHlwZSddLFxuXHQnJU51bWJlclByb3RvdHlwZSUnOiBbJ051bWJlcicsICdwcm90b3R5cGUnXSxcblx0JyVPYmplY3RQcm90b3R5cGUlJzogWydPYmplY3QnLCAncHJvdG90eXBlJ10sXG5cdCclT2JqUHJvdG9fdG9TdHJpbmclJzogWydPYmplY3QnLCAncHJvdG90eXBlJywgJ3RvU3RyaW5nJ10sXG5cdCclT2JqUHJvdG9fdmFsdWVPZiUnOiBbJ09iamVjdCcsICdwcm90b3R5cGUnLCAndmFsdWVPZiddLFxuXHQnJVByb21pc2VQcm90b3R5cGUlJzogWydQcm9taXNlJywgJ3Byb3RvdHlwZSddLFxuXHQnJVByb21pc2VQcm90b190aGVuJSc6IFsnUHJvbWlzZScsICdwcm90b3R5cGUnLCAndGhlbiddLFxuXHQnJVByb21pc2VfYWxsJSc6IFsnUHJvbWlzZScsICdhbGwnXSxcblx0JyVQcm9taXNlX3JlamVjdCUnOiBbJ1Byb21pc2UnLCAncmVqZWN0J10sXG5cdCclUHJvbWlzZV9yZXNvbHZlJSc6IFsnUHJvbWlzZScsICdyZXNvbHZlJ10sXG5cdCclUmFuZ2VFcnJvclByb3RvdHlwZSUnOiBbJ1JhbmdlRXJyb3InLCAncHJvdG90eXBlJ10sXG5cdCclUmVmZXJlbmNlRXJyb3JQcm90b3R5cGUlJzogWydSZWZlcmVuY2VFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVSZWdFeHBQcm90b3R5cGUlJzogWydSZWdFeHAnLCAncHJvdG90eXBlJ10sXG5cdCclU2V0UHJvdG90eXBlJSc6IFsnU2V0JywgJ3Byb3RvdHlwZSddLFxuXHQnJVNoYXJlZEFycmF5QnVmZmVyUHJvdG90eXBlJSc6IFsnU2hhcmVkQXJyYXlCdWZmZXInLCAncHJvdG90eXBlJ10sXG5cdCclU3RyaW5nUHJvdG90eXBlJSc6IFsnU3RyaW5nJywgJ3Byb3RvdHlwZSddLFxuXHQnJVN5bWJvbFByb3RvdHlwZSUnOiBbJ1N5bWJvbCcsICdwcm90b3R5cGUnXSxcblx0JyVTeW50YXhFcnJvclByb3RvdHlwZSUnOiBbJ1N5bnRheEVycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJVR5cGVkQXJyYXlQcm90b3R5cGUlJzogWydUeXBlZEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJVR5cGVFcnJvclByb3RvdHlwZSUnOiBbJ1R5cGVFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVVaW50OEFycmF5UHJvdG90eXBlJSc6IFsnVWludDhBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVVaW50OENsYW1wZWRBcnJheVByb3RvdHlwZSUnOiBbJ1VpbnQ4Q2xhbXBlZEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJVVpbnQxNkFycmF5UHJvdG90eXBlJSc6IFsnVWludDE2QXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclVWludDMyQXJyYXlQcm90b3R5cGUlJzogWydVaW50MzJBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVVUklFcnJvclByb3RvdHlwZSUnOiBbJ1VSSUVycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJVdlYWtNYXBQcm90b3R5cGUlJzogWydXZWFrTWFwJywgJ3Byb3RvdHlwZSddLFxuXHQnJVdlYWtTZXRQcm90b3R5cGUlJzogWydXZWFrU2V0JywgJ3Byb3RvdHlwZSddXG59O1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJ2Z1bmN0aW9uLWJpbmQnKTtcbnZhciBoYXNPd24gPSByZXF1aXJlKCdoYXMnKTtcbnZhciAkY29uY2F0ID0gYmluZC5jYWxsKEZ1bmN0aW9uLmNhbGwsIEFycmF5LnByb3RvdHlwZS5jb25jYXQpO1xudmFyICRzcGxpY2VBcHBseSA9IGJpbmQuY2FsbChGdW5jdGlvbi5hcHBseSwgQXJyYXkucHJvdG90eXBlLnNwbGljZSk7XG52YXIgJHJlcGxhY2UgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlKTtcbnZhciAkc3RyU2xpY2UgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgU3RyaW5nLnByb3RvdHlwZS5zbGljZSk7XG52YXIgJGV4ZWMgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgUmVnRXhwLnByb3RvdHlwZS5leGVjKTtcblxuLyogYWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9sb2Rhc2gvbG9kYXNoL2Jsb2IvNC4xNy4xNS9kaXN0L2xvZGFzaC5qcyNMNjczNS1MNjc0NCAqL1xudmFyIHJlUHJvcE5hbWUgPSAvW14lLltcXF1dK3xcXFsoPzooLT9cXGQrKD86XFwuXFxkKyk/KXwoW1wiJ10pKCg/Oig/IVxcMilbXlxcXFxdfFxcXFwuKSo/KVxcMilcXF18KD89KD86XFwufFxcW1xcXSkoPzpcXC58XFxbXFxdfCUkKSkvZztcbnZhciByZUVzY2FwZUNoYXIgPSAvXFxcXChcXFxcKT8vZzsgLyoqIFVzZWQgdG8gbWF0Y2ggYmFja3NsYXNoZXMgaW4gcHJvcGVydHkgcGF0aHMuICovXG52YXIgc3RyaW5nVG9QYXRoID0gZnVuY3Rpb24gc3RyaW5nVG9QYXRoKHN0cmluZykge1xuXHR2YXIgZmlyc3QgPSAkc3RyU2xpY2Uoc3RyaW5nLCAwLCAxKTtcblx0dmFyIGxhc3QgPSAkc3RyU2xpY2Uoc3RyaW5nLCAtMSk7XG5cdGlmIChmaXJzdCA9PT0gJyUnICYmIGxhc3QgIT09ICclJykge1xuXHRcdHRocm93IG5ldyAkU3ludGF4RXJyb3IoJ2ludmFsaWQgaW50cmluc2ljIHN5bnRheCwgZXhwZWN0ZWQgY2xvc2luZyBgJWAnKTtcblx0fSBlbHNlIGlmIChsYXN0ID09PSAnJScgJiYgZmlyc3QgIT09ICclJykge1xuXHRcdHRocm93IG5ldyAkU3ludGF4RXJyb3IoJ2ludmFsaWQgaW50cmluc2ljIHN5bnRheCwgZXhwZWN0ZWQgb3BlbmluZyBgJWAnKTtcblx0fVxuXHR2YXIgcmVzdWx0ID0gW107XG5cdCRyZXBsYWNlKHN0cmluZywgcmVQcm9wTmFtZSwgZnVuY3Rpb24gKG1hdGNoLCBudW1iZXIsIHF1b3RlLCBzdWJTdHJpbmcpIHtcblx0XHRyZXN1bHRbcmVzdWx0Lmxlbmd0aF0gPSBxdW90ZSA/ICRyZXBsYWNlKHN1YlN0cmluZywgcmVFc2NhcGVDaGFyLCAnJDEnKSA6IG51bWJlciB8fCBtYXRjaDtcblx0fSk7XG5cdHJldHVybiByZXN1bHQ7XG59O1xuLyogZW5kIGFkYXB0YXRpb24gKi9cblxudmFyIGdldEJhc2VJbnRyaW5zaWMgPSBmdW5jdGlvbiBnZXRCYXNlSW50cmluc2ljKG5hbWUsIGFsbG93TWlzc2luZykge1xuXHR2YXIgaW50cmluc2ljTmFtZSA9IG5hbWU7XG5cdHZhciBhbGlhcztcblx0aWYgKGhhc093bihMRUdBQ1lfQUxJQVNFUywgaW50cmluc2ljTmFtZSkpIHtcblx0XHRhbGlhcyA9IExFR0FDWV9BTElBU0VTW2ludHJpbnNpY05hbWVdO1xuXHRcdGludHJpbnNpY05hbWUgPSAnJScgKyBhbGlhc1swXSArICclJztcblx0fVxuXG5cdGlmIChoYXNPd24oSU5UUklOU0lDUywgaW50cmluc2ljTmFtZSkpIHtcblx0XHR2YXIgdmFsdWUgPSBJTlRSSU5TSUNTW2ludHJpbnNpY05hbWVdO1xuXHRcdGlmICh2YWx1ZSA9PT0gbmVlZHNFdmFsKSB7XG5cdFx0XHR2YWx1ZSA9IGRvRXZhbChpbnRyaW5zaWNOYW1lKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgJiYgIWFsbG93TWlzc2luZykge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2ludHJpbnNpYyAnICsgbmFtZSArICcgZXhpc3RzLCBidXQgaXMgbm90IGF2YWlsYWJsZS4gUGxlYXNlIGZpbGUgYW4gaXNzdWUhJyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGFsaWFzOiBhbGlhcyxcblx0XHRcdG5hbWU6IGludHJpbnNpY05hbWUsXG5cdFx0XHR2YWx1ZTogdmFsdWVcblx0XHR9O1xuXHR9XG5cblx0dGhyb3cgbmV3ICRTeW50YXhFcnJvcignaW50cmluc2ljICcgKyBuYW1lICsgJyBkb2VzIG5vdCBleGlzdCEnKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gR2V0SW50cmluc2ljKG5hbWUsIGFsbG93TWlzc2luZykge1xuXHRpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnIHx8IG5hbWUubGVuZ3RoID09PSAwKSB7XG5cdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2ludHJpbnNpYyBuYW1lIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nJyk7XG5cdH1cblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIHR5cGVvZiBhbGxvd01pc3NpbmcgIT09ICdib29sZWFuJykge1xuXHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdcImFsbG93TWlzc2luZ1wiIGFyZ3VtZW50IG11c3QgYmUgYSBib29sZWFuJyk7XG5cdH1cblxuXHRpZiAoJGV4ZWMoL14lP1teJV0qJT8kLywgbmFtZSkgPT09IG51bGwpIHtcblx0XHR0aHJvdyBuZXcgJFN5bnRheEVycm9yKCdgJWAgbWF5IG5vdCBiZSBwcmVzZW50IGFueXdoZXJlIGJ1dCBhdCB0aGUgYmVnaW5uaW5nIGFuZCBlbmQgb2YgdGhlIGludHJpbnNpYyBuYW1lJyk7XG5cdH1cblx0dmFyIHBhcnRzID0gc3RyaW5nVG9QYXRoKG5hbWUpO1xuXHR2YXIgaW50cmluc2ljQmFzZU5hbWUgPSBwYXJ0cy5sZW5ndGggPiAwID8gcGFydHNbMF0gOiAnJztcblxuXHR2YXIgaW50cmluc2ljID0gZ2V0QmFzZUludHJpbnNpYygnJScgKyBpbnRyaW5zaWNCYXNlTmFtZSArICclJywgYWxsb3dNaXNzaW5nKTtcblx0dmFyIGludHJpbnNpY1JlYWxOYW1lID0gaW50cmluc2ljLm5hbWU7XG5cdHZhciB2YWx1ZSA9IGludHJpbnNpYy52YWx1ZTtcblx0dmFyIHNraXBGdXJ0aGVyQ2FjaGluZyA9IGZhbHNlO1xuXG5cdHZhciBhbGlhcyA9IGludHJpbnNpYy5hbGlhcztcblx0aWYgKGFsaWFzKSB7XG5cdFx0aW50cmluc2ljQmFzZU5hbWUgPSBhbGlhc1swXTtcblx0XHQkc3BsaWNlQXBwbHkocGFydHMsICRjb25jYXQoWzAsIDFdLCBhbGlhcykpO1xuXHR9XG5cblx0Zm9yICh2YXIgaSA9IDEsIGlzT3duID0gdHJ1ZTsgaSA8IHBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0dmFyIHBhcnQgPSBwYXJ0c1tpXTtcblx0XHR2YXIgZmlyc3QgPSAkc3RyU2xpY2UocGFydCwgMCwgMSk7XG5cdFx0dmFyIGxhc3QgPSAkc3RyU2xpY2UocGFydCwgLTEpO1xuXHRcdGlmIChcblx0XHRcdChcblx0XHRcdFx0KGZpcnN0ID09PSAnXCInIHx8IGZpcnN0ID09PSBcIidcIiB8fCBmaXJzdCA9PT0gJ2AnKVxuXHRcdFx0XHR8fCAobGFzdCA9PT0gJ1wiJyB8fCBsYXN0ID09PSBcIidcIiB8fCBsYXN0ID09PSAnYCcpXG5cdFx0XHQpXG5cdFx0XHQmJiBmaXJzdCAhPT0gbGFzdFxuXHRcdCkge1xuXHRcdFx0dGhyb3cgbmV3ICRTeW50YXhFcnJvcigncHJvcGVydHkgbmFtZXMgd2l0aCBxdW90ZXMgbXVzdCBoYXZlIG1hdGNoaW5nIHF1b3RlcycpO1xuXHRcdH1cblx0XHRpZiAocGFydCA9PT0gJ2NvbnN0cnVjdG9yJyB8fCAhaXNPd24pIHtcblx0XHRcdHNraXBGdXJ0aGVyQ2FjaGluZyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0aW50cmluc2ljQmFzZU5hbWUgKz0gJy4nICsgcGFydDtcblx0XHRpbnRyaW5zaWNSZWFsTmFtZSA9ICclJyArIGludHJpbnNpY0Jhc2VOYW1lICsgJyUnO1xuXG5cdFx0aWYgKGhhc093bihJTlRSSU5TSUNTLCBpbnRyaW5zaWNSZWFsTmFtZSkpIHtcblx0XHRcdHZhbHVlID0gSU5UUklOU0lDU1tpbnRyaW5zaWNSZWFsTmFtZV07XG5cdFx0fSBlbHNlIGlmICh2YWx1ZSAhPSBudWxsKSB7XG5cdFx0XHRpZiAoIShwYXJ0IGluIHZhbHVlKSkge1xuXHRcdFx0XHRpZiAoIWFsbG93TWlzc2luZykge1xuXHRcdFx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdiYXNlIGludHJpbnNpYyBmb3IgJyArIG5hbWUgKyAnIGV4aXN0cywgYnV0IHRoZSBwcm9wZXJ0eSBpcyBub3QgYXZhaWxhYmxlLicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB2b2lkIHVuZGVmaW5lZDtcblx0XHRcdH1cblx0XHRcdGlmICgkZ09QRCAmJiAoaSArIDEpID49IHBhcnRzLmxlbmd0aCkge1xuXHRcdFx0XHR2YXIgZGVzYyA9ICRnT1BEKHZhbHVlLCBwYXJ0KTtcblx0XHRcdFx0aXNPd24gPSAhIWRlc2M7XG5cblx0XHRcdFx0Ly8gQnkgY29udmVudGlvbiwgd2hlbiBhIGRhdGEgcHJvcGVydHkgaXMgY29udmVydGVkIHRvIGFuIGFjY2Vzc29yXG5cdFx0XHRcdC8vIHByb3BlcnR5IHRvIGVtdWxhdGUgYSBkYXRhIHByb3BlcnR5IHRoYXQgZG9lcyBub3Qgc3VmZmVyIGZyb21cblx0XHRcdFx0Ly8gdGhlIG92ZXJyaWRlIG1pc3Rha2UsIHRoYXQgYWNjZXNzb3IncyBnZXR0ZXIgaXMgbWFya2VkIHdpdGhcblx0XHRcdFx0Ly8gYW4gYG9yaWdpbmFsVmFsdWVgIHByb3BlcnR5LiBIZXJlLCB3aGVuIHdlIGRldGVjdCB0aGlzLCB3ZVxuXHRcdFx0XHQvLyB1cGhvbGQgdGhlIGlsbHVzaW9uIGJ5IHByZXRlbmRpbmcgdG8gc2VlIHRoYXQgb3JpZ2luYWwgZGF0YVxuXHRcdFx0XHQvLyBwcm9wZXJ0eSwgaS5lLiwgcmV0dXJuaW5nIHRoZSB2YWx1ZSByYXRoZXIgdGhhbiB0aGUgZ2V0dGVyXG5cdFx0XHRcdC8vIGl0c2VsZi5cblx0XHRcdFx0aWYgKGlzT3duICYmICdnZXQnIGluIGRlc2MgJiYgISgnb3JpZ2luYWxWYWx1ZScgaW4gZGVzYy5nZXQpKSB7XG5cdFx0XHRcdFx0dmFsdWUgPSBkZXNjLmdldDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YWx1ZSA9IHZhbHVlW3BhcnRdO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpc093biA9IGhhc093bih2YWx1ZSwgcGFydCk7XG5cdFx0XHRcdHZhbHVlID0gdmFsdWVbcGFydF07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChpc093biAmJiAhc2tpcEZ1cnRoZXJDYWNoaW5nKSB7XG5cdFx0XHRcdElOVFJJTlNJQ1NbaW50cmluc2ljUmVhbE5hbWVdID0gdmFsdWU7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiB2YWx1ZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvcmlnU3ltYm9sID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sO1xudmFyIGhhc1N5bWJvbFNoYW0gPSByZXF1aXJlKCcuL3NoYW1zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaGFzTmF0aXZlU3ltYm9scygpIHtcblx0aWYgKHR5cGVvZiBvcmlnU3ltYm9sICE9PSAnZnVuY3Rpb24nKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ2Z1bmN0aW9uJykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKHR5cGVvZiBvcmlnU3ltYm9sKCdmb28nKSAhPT0gJ3N5bWJvbCcpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmICh0eXBlb2YgU3ltYm9sKCdiYXInKSAhPT0gJ3N5bWJvbCcpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0cmV0dXJuIGhhc1N5bWJvbFNoYW0oKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludCBjb21wbGV4aXR5OiBbMiwgMThdLCBtYXgtc3RhdGVtZW50czogWzIsIDMzXSAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBoYXNTeW1ib2xzKCkge1xuXHRpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyAhPT0gJ2Z1bmN0aW9uJykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09ICdzeW1ib2wnKSB7IHJldHVybiB0cnVlOyB9XG5cblx0dmFyIG9iaiA9IHt9O1xuXHR2YXIgc3ltID0gU3ltYm9sKCd0ZXN0Jyk7XG5cdHZhciBzeW1PYmogPSBPYmplY3Qoc3ltKTtcblx0aWYgKHR5cGVvZiBzeW0gPT09ICdzdHJpbmcnKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ltKSAhPT0gJ1tvYmplY3QgU3ltYm9sXScpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ltT2JqKSAhPT0gJ1tvYmplY3QgU3ltYm9sXScpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0Ly8gdGVtcCBkaXNhYmxlZCBwZXIgaHR0cHM6Ly9naXRodWIuY29tL2xqaGFyYi9vYmplY3QuYXNzaWduL2lzc3Vlcy8xN1xuXHQvLyBpZiAoc3ltIGluc3RhbmNlb2YgU3ltYm9sKSB7IHJldHVybiBmYWxzZTsgfVxuXHQvLyB0ZW1wIGRpc2FibGVkIHBlciBodHRwczovL2dpdGh1Yi5jb20vV2ViUmVmbGVjdGlvbi9nZXQtb3duLXByb3BlcnR5LXN5bWJvbHMvaXNzdWVzLzRcblx0Ly8gaWYgKCEoc3ltT2JqIGluc3RhbmNlb2YgU3ltYm9sKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHQvLyBpZiAodHlwZW9mIFN5bWJvbC5wcm90b3R5cGUudG9TdHJpbmcgIT09ICdmdW5jdGlvbicpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdC8vIGlmIChTdHJpbmcoc3ltKSAhPT0gU3ltYm9sLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN5bSkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0dmFyIHN5bVZhbCA9IDQyO1xuXHRvYmpbc3ltXSA9IHN5bVZhbDtcblx0Zm9yIChzeW0gaW4gb2JqKSB7IHJldHVybiBmYWxzZTsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXJlc3RyaWN0ZWQtc3ludGF4LCBuby11bnJlYWNoYWJsZS1sb29wXG5cdGlmICh0eXBlb2YgT2JqZWN0LmtleXMgPT09ICdmdW5jdGlvbicgJiYgT2JqZWN0LmtleXMob2JqKS5sZW5ndGggIT09IDApIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0aWYgKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyA9PT0gJ2Z1bmN0aW9uJyAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopLmxlbmd0aCAhPT0gMCkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHR2YXIgc3ltcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMob2JqKTtcblx0aWYgKHN5bXMubGVuZ3RoICE9PSAxIHx8IHN5bXNbMF0gIT09IHN5bSkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRpZiAoIU9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChvYmosIHN5bSkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0aWYgKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgc3ltKTtcblx0XHRpZiAoZGVzY3JpcHRvci52YWx1ZSAhPT0gc3ltVmFsIHx8IGRlc2NyaXB0b3IuZW51bWVyYWJsZSAhPT0gdHJ1ZSkgeyByZXR1cm4gZmFsc2U7IH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGJpbmQgPSByZXF1aXJlKCdmdW5jdGlvbi1iaW5kJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gYmluZC5jYWxsKEZ1bmN0aW9uLmNhbGwsIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgR2V0SW50cmluc2ljID0gcmVxdWlyZSgnZ2V0LWludHJpbnNpYycpO1xudmFyIGhhcyA9IHJlcXVpcmUoJ2hhcycpO1xudmFyIGNoYW5uZWwgPSByZXF1aXJlKCdzaWRlLWNoYW5uZWwnKSgpO1xuXG52YXIgJFR5cGVFcnJvciA9IEdldEludHJpbnNpYygnJVR5cGVFcnJvciUnKTtcblxudmFyIFNMT1QgPSB7XG5cdGFzc2VydDogZnVuY3Rpb24gKE8sIHNsb3QpIHtcblx0XHRpZiAoIU8gfHwgKHR5cGVvZiBPICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgTyAhPT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdgT2AgaXMgbm90IGFuIG9iamVjdCcpO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHNsb3QgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYHNsb3RgIG11c3QgYmUgYSBzdHJpbmcnKTtcblx0XHR9XG5cdFx0Y2hhbm5lbC5hc3NlcnQoTyk7XG5cdFx0aWYgKCFTTE9ULmhhcyhPLCBzbG90KSkge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2BzbG90YCBpcyBub3QgcHJlc2VudCBvbiBgT2AnKTtcblx0XHR9XG5cdH0sXG5cdGdldDogZnVuY3Rpb24gKE8sIHNsb3QpIHtcblx0XHRpZiAoIU8gfHwgKHR5cGVvZiBPICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgTyAhPT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdgT2AgaXMgbm90IGFuIG9iamVjdCcpO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHNsb3QgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYHNsb3RgIG11c3QgYmUgYSBzdHJpbmcnKTtcblx0XHR9XG5cdFx0dmFyIHNsb3RzID0gY2hhbm5lbC5nZXQoTyk7XG5cdFx0cmV0dXJuIHNsb3RzICYmIHNsb3RzWyckJyArIHNsb3RdO1xuXHR9LFxuXHRoYXM6IGZ1bmN0aW9uIChPLCBzbG90KSB7XG5cdFx0aWYgKCFPIHx8ICh0eXBlb2YgTyAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIE8gIT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYE9gIGlzIG5vdCBhbiBvYmplY3QnKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBzbG90ICE9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2BzbG90YCBtdXN0IGJlIGEgc3RyaW5nJyk7XG5cdFx0fVxuXHRcdHZhciBzbG90cyA9IGNoYW5uZWwuZ2V0KE8pO1xuXHRcdHJldHVybiAhIXNsb3RzICYmIGhhcyhzbG90cywgJyQnICsgc2xvdCk7XG5cdH0sXG5cdHNldDogZnVuY3Rpb24gKE8sIHNsb3QsIFYpIHtcblx0XHRpZiAoIU8gfHwgKHR5cGVvZiBPICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgTyAhPT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdgT2AgaXMgbm90IGFuIG9iamVjdCcpO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHNsb3QgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYHNsb3RgIG11c3QgYmUgYSBzdHJpbmcnKTtcblx0XHR9XG5cdFx0dmFyIHNsb3RzID0gY2hhbm5lbC5nZXQoTyk7XG5cdFx0aWYgKCFzbG90cykge1xuXHRcdFx0c2xvdHMgPSB7fTtcblx0XHRcdGNoYW5uZWwuc2V0KE8sIHNsb3RzKTtcblx0XHR9XG5cdFx0c2xvdHNbJyQnICsgc2xvdF0gPSBWO1xuXHR9XG59O1xuXG5pZiAoT2JqZWN0LmZyZWV6ZSkge1xuXHRPYmplY3QuZnJlZXplKFNMT1QpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNMT1Q7XG4iLCJ2YXIgaGFzTWFwID0gdHlwZW9mIE1hcCA9PT0gJ2Z1bmN0aW9uJyAmJiBNYXAucHJvdG90eXBlO1xudmFyIG1hcFNpemVEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciAmJiBoYXNNYXAgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKE1hcC5wcm90b3R5cGUsICdzaXplJykgOiBudWxsO1xudmFyIG1hcFNpemUgPSBoYXNNYXAgJiYgbWFwU2l6ZURlc2NyaXB0b3IgJiYgdHlwZW9mIG1hcFNpemVEZXNjcmlwdG9yLmdldCA9PT0gJ2Z1bmN0aW9uJyA/IG1hcFNpemVEZXNjcmlwdG9yLmdldCA6IG51bGw7XG52YXIgbWFwRm9yRWFjaCA9IGhhc01hcCAmJiBNYXAucHJvdG90eXBlLmZvckVhY2g7XG52YXIgaGFzU2V0ID0gdHlwZW9mIFNldCA9PT0gJ2Z1bmN0aW9uJyAmJiBTZXQucHJvdG90eXBlO1xudmFyIHNldFNpemVEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciAmJiBoYXNTZXQgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKFNldC5wcm90b3R5cGUsICdzaXplJykgOiBudWxsO1xudmFyIHNldFNpemUgPSBoYXNTZXQgJiYgc2V0U2l6ZURlc2NyaXB0b3IgJiYgdHlwZW9mIHNldFNpemVEZXNjcmlwdG9yLmdldCA9PT0gJ2Z1bmN0aW9uJyA/IHNldFNpemVEZXNjcmlwdG9yLmdldCA6IG51bGw7XG52YXIgc2V0Rm9yRWFjaCA9IGhhc1NldCAmJiBTZXQucHJvdG90eXBlLmZvckVhY2g7XG52YXIgaGFzV2Vha01hcCA9IHR5cGVvZiBXZWFrTWFwID09PSAnZnVuY3Rpb24nICYmIFdlYWtNYXAucHJvdG90eXBlO1xudmFyIHdlYWtNYXBIYXMgPSBoYXNXZWFrTWFwID8gV2Vha01hcC5wcm90b3R5cGUuaGFzIDogbnVsbDtcbnZhciBoYXNXZWFrU2V0ID0gdHlwZW9mIFdlYWtTZXQgPT09ICdmdW5jdGlvbicgJiYgV2Vha1NldC5wcm90b3R5cGU7XG52YXIgd2Vha1NldEhhcyA9IGhhc1dlYWtTZXQgPyBXZWFrU2V0LnByb3RvdHlwZS5oYXMgOiBudWxsO1xudmFyIGhhc1dlYWtSZWYgPSB0eXBlb2YgV2Vha1JlZiA9PT0gJ2Z1bmN0aW9uJyAmJiBXZWFrUmVmLnByb3RvdHlwZTtcbnZhciB3ZWFrUmVmRGVyZWYgPSBoYXNXZWFrUmVmID8gV2Vha1JlZi5wcm90b3R5cGUuZGVyZWYgOiBudWxsO1xudmFyIGJvb2xlYW5WYWx1ZU9mID0gQm9vbGVhbi5wcm90b3R5cGUudmFsdWVPZjtcbnZhciBvYmplY3RUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgZnVuY3Rpb25Ub1N0cmluZyA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZztcbnZhciAkbWF0Y2ggPSBTdHJpbmcucHJvdG90eXBlLm1hdGNoO1xudmFyICRzbGljZSA9IFN0cmluZy5wcm90b3R5cGUuc2xpY2U7XG52YXIgJHJlcGxhY2UgPSBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2U7XG52YXIgJHRvVXBwZXJDYXNlID0gU3RyaW5nLnByb3RvdHlwZS50b1VwcGVyQ2FzZTtcbnZhciAkdG9Mb3dlckNhc2UgPSBTdHJpbmcucHJvdG90eXBlLnRvTG93ZXJDYXNlO1xudmFyICR0ZXN0ID0gUmVnRXhwLnByb3RvdHlwZS50ZXN0O1xudmFyICRjb25jYXQgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0O1xudmFyICRqb2luID0gQXJyYXkucHJvdG90eXBlLmpvaW47XG52YXIgJGFyclNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyICRmbG9vciA9IE1hdGguZmxvb3I7XG52YXIgYmlnSW50VmFsdWVPZiA9IHR5cGVvZiBCaWdJbnQgPT09ICdmdW5jdGlvbicgPyBCaWdJbnQucHJvdG90eXBlLnZhbHVlT2YgOiBudWxsO1xudmFyIGdPUFMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIHN5bVRvU3RyaW5nID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSAnc3ltYm9sJyA/IFN5bWJvbC5wcm90b3R5cGUudG9TdHJpbmcgOiBudWxsO1xudmFyIGhhc1NoYW1tZWRTeW1ib2xzID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSAnb2JqZWN0Jztcbi8vIGllLCBgaGFzLXRvc3RyaW5ndGFnL3NoYW1zXG52YXIgdG9TdHJpbmdUYWcgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIFN5bWJvbC50b1N0cmluZ1RhZyAmJiAodHlwZW9mIFN5bWJvbC50b1N0cmluZ1RhZyA9PT0gaGFzU2hhbW1lZFN5bWJvbHMgPyAnb2JqZWN0JyA6ICdzeW1ib2wnKVxuICAgID8gU3ltYm9sLnRvU3RyaW5nVGFnXG4gICAgOiBudWxsO1xudmFyIGlzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbnZhciBnUE8gPSAodHlwZW9mIFJlZmxlY3QgPT09ICdmdW5jdGlvbicgPyBSZWZsZWN0LmdldFByb3RvdHlwZU9mIDogT2JqZWN0LmdldFByb3RvdHlwZU9mKSB8fCAoXG4gICAgW10uX19wcm90b19fID09PSBBcnJheS5wcm90b3R5cGUgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wcm90b1xuICAgICAgICA/IGZ1bmN0aW9uIChPKSB7XG4gICAgICAgICAgICByZXR1cm4gTy5fX3Byb3RvX187IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcHJvdG9cbiAgICAgICAgfVxuICAgICAgICA6IG51bGxcbik7XG5cbmZ1bmN0aW9uIGFkZE51bWVyaWNTZXBhcmF0b3IobnVtLCBzdHIpIHtcbiAgICBpZiAoXG4gICAgICAgIG51bSA9PT0gSW5maW5pdHlcbiAgICAgICAgfHwgbnVtID09PSAtSW5maW5pdHlcbiAgICAgICAgfHwgbnVtICE9PSBudW1cbiAgICAgICAgfHwgKG51bSAmJiBudW0gPiAtMTAwMCAmJiBudW0gPCAxMDAwKVxuICAgICAgICB8fCAkdGVzdC5jYWxsKC9lLywgc3RyKVxuICAgICkge1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICB2YXIgc2VwUmVnZXggPSAvWzAtOV0oPz0oPzpbMC05XXszfSkrKD8hWzAtOV0pKS9nO1xuICAgIGlmICh0eXBlb2YgbnVtID09PSAnbnVtYmVyJykge1xuICAgICAgICB2YXIgaW50ID0gbnVtIDwgMCA/IC0kZmxvb3IoLW51bSkgOiAkZmxvb3IobnVtKTsgLy8gdHJ1bmMobnVtKVxuICAgICAgICBpZiAoaW50ICE9PSBudW0pIHtcbiAgICAgICAgICAgIHZhciBpbnRTdHIgPSBTdHJpbmcoaW50KTtcbiAgICAgICAgICAgIHZhciBkZWMgPSAkc2xpY2UuY2FsbChzdHIsIGludFN0ci5sZW5ndGggKyAxKTtcbiAgICAgICAgICAgIHJldHVybiAkcmVwbGFjZS5jYWxsKGludFN0ciwgc2VwUmVnZXgsICckJl8nKSArICcuJyArICRyZXBsYWNlLmNhbGwoJHJlcGxhY2UuY2FsbChkZWMsIC8oWzAtOV17M30pL2csICckJl8nKSwgL18kLywgJycpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAkcmVwbGFjZS5jYWxsKHN0ciwgc2VwUmVnZXgsICckJl8nKTtcbn1cblxudmFyIHV0aWxJbnNwZWN0ID0gcmVxdWlyZSgnLi91dGlsLmluc3BlY3QnKTtcbnZhciBpbnNwZWN0Q3VzdG9tID0gdXRpbEluc3BlY3QuY3VzdG9tO1xudmFyIGluc3BlY3RTeW1ib2wgPSBpc1N5bWJvbChpbnNwZWN0Q3VzdG9tKSA/IGluc3BlY3RDdXN0b20gOiBudWxsO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluc3BlY3RfKG9iaiwgb3B0aW9ucywgZGVwdGgsIHNlZW4pIHtcbiAgICB2YXIgb3B0cyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBpZiAoaGFzKG9wdHMsICdxdW90ZVN0eWxlJykgJiYgKG9wdHMucXVvdGVTdHlsZSAhPT0gJ3NpbmdsZScgJiYgb3B0cy5xdW90ZVN0eWxlICE9PSAnZG91YmxlJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9uIFwicXVvdGVTdHlsZVwiIG11c3QgYmUgXCJzaW5nbGVcIiBvciBcImRvdWJsZVwiJyk7XG4gICAgfVxuICAgIGlmIChcbiAgICAgICAgaGFzKG9wdHMsICdtYXhTdHJpbmdMZW5ndGgnKSAmJiAodHlwZW9mIG9wdHMubWF4U3RyaW5nTGVuZ3RoID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgPyBvcHRzLm1heFN0cmluZ0xlbmd0aCA8IDAgJiYgb3B0cy5tYXhTdHJpbmdMZW5ndGggIT09IEluZmluaXR5XG4gICAgICAgICAgICA6IG9wdHMubWF4U3RyaW5nTGVuZ3RoICE9PSBudWxsXG4gICAgICAgIClcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9uIFwibWF4U3RyaW5nTGVuZ3RoXCIsIGlmIHByb3ZpZGVkLCBtdXN0IGJlIGEgcG9zaXRpdmUgaW50ZWdlciwgSW5maW5pdHksIG9yIGBudWxsYCcpO1xuICAgIH1cbiAgICB2YXIgY3VzdG9tSW5zcGVjdCA9IGhhcyhvcHRzLCAnY3VzdG9tSW5zcGVjdCcpID8gb3B0cy5jdXN0b21JbnNwZWN0IDogdHJ1ZTtcbiAgICBpZiAodHlwZW9mIGN1c3RvbUluc3BlY3QgIT09ICdib29sZWFuJyAmJiBjdXN0b21JbnNwZWN0ICE9PSAnc3ltYm9sJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb24gXCJjdXN0b21JbnNwZWN0XCIsIGlmIHByb3ZpZGVkLCBtdXN0IGJlIGB0cnVlYCwgYGZhbHNlYCwgb3IgYFxcJ3N5bWJvbFxcJ2AnKTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICAgIGhhcyhvcHRzLCAnaW5kZW50JylcbiAgICAgICAgJiYgb3B0cy5pbmRlbnQgIT09IG51bGxcbiAgICAgICAgJiYgb3B0cy5pbmRlbnQgIT09ICdcXHQnXG4gICAgICAgICYmICEocGFyc2VJbnQob3B0cy5pbmRlbnQsIDEwKSA9PT0gb3B0cy5pbmRlbnQgJiYgb3B0cy5pbmRlbnQgPiAwKVxuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb24gXCJpbmRlbnRcIiBtdXN0IGJlIFwiXFxcXHRcIiwgYW4gaW50ZWdlciA+IDAsIG9yIGBudWxsYCcpO1xuICAgIH1cbiAgICBpZiAoaGFzKG9wdHMsICdudW1lcmljU2VwYXJhdG9yJykgJiYgdHlwZW9mIG9wdHMubnVtZXJpY1NlcGFyYXRvciAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbiBcIm51bWVyaWNTZXBhcmF0b3JcIiwgaWYgcHJvdmlkZWQsIG11c3QgYmUgYHRydWVgIG9yIGBmYWxzZWAnKTtcbiAgICB9XG4gICAgdmFyIG51bWVyaWNTZXBhcmF0b3IgPSBvcHRzLm51bWVyaWNTZXBhcmF0b3I7XG5cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuICd1bmRlZmluZWQnO1xuICAgIH1cbiAgICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgcmV0dXJuIG9iaiA/ICd0cnVlJyA6ICdmYWxzZSc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBpbnNwZWN0U3RyaW5nKG9iaiwgb3B0cyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnbnVtYmVyJykge1xuICAgICAgICBpZiAob2JqID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gSW5maW5pdHkgLyBvYmogPiAwID8gJzAnIDogJy0wJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3RyID0gU3RyaW5nKG9iaik7XG4gICAgICAgIHJldHVybiBudW1lcmljU2VwYXJhdG9yID8gYWRkTnVtZXJpY1NlcGFyYXRvcihvYmosIHN0cikgOiBzdHI7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnYmlnaW50Jykge1xuICAgICAgICB2YXIgYmlnSW50U3RyID0gU3RyaW5nKG9iaikgKyAnbic7XG4gICAgICAgIHJldHVybiBudW1lcmljU2VwYXJhdG9yID8gYWRkTnVtZXJpY1NlcGFyYXRvcihvYmosIGJpZ0ludFN0cikgOiBiaWdJbnRTdHI7XG4gICAgfVxuXG4gICAgdmFyIG1heERlcHRoID0gdHlwZW9mIG9wdHMuZGVwdGggPT09ICd1bmRlZmluZWQnID8gNSA6IG9wdHMuZGVwdGg7XG4gICAgaWYgKHR5cGVvZiBkZXB0aCA9PT0gJ3VuZGVmaW5lZCcpIHsgZGVwdGggPSAwOyB9XG4gICAgaWYgKGRlcHRoID49IG1heERlcHRoICYmIG1heERlcHRoID4gMCAmJiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gaXNBcnJheShvYmopID8gJ1tBcnJheV0nIDogJ1tPYmplY3RdJztcbiAgICB9XG5cbiAgICB2YXIgaW5kZW50ID0gZ2V0SW5kZW50KG9wdHMsIGRlcHRoKTtcblxuICAgIGlmICh0eXBlb2Ygc2VlbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgc2VlbiA9IFtdO1xuICAgIH0gZWxzZSBpZiAoaW5kZXhPZihzZWVuLCBvYmopID49IDApIHtcbiAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNwZWN0KHZhbHVlLCBmcm9tLCBub0luZGVudCkge1xuICAgICAgICBpZiAoZnJvbSkge1xuICAgICAgICAgICAgc2VlbiA9ICRhcnJTbGljZS5jYWxsKHNlZW4pO1xuICAgICAgICAgICAgc2Vlbi5wdXNoKGZyb20pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub0luZGVudCkge1xuICAgICAgICAgICAgdmFyIG5ld09wdHMgPSB7XG4gICAgICAgICAgICAgICAgZGVwdGg6IG9wdHMuZGVwdGhcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoaGFzKG9wdHMsICdxdW90ZVN0eWxlJykpIHtcbiAgICAgICAgICAgICAgICBuZXdPcHRzLnF1b3RlU3R5bGUgPSBvcHRzLnF1b3RlU3R5bGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5zcGVjdF8odmFsdWUsIG5ld09wdHMsIGRlcHRoICsgMSwgc2Vlbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluc3BlY3RfKHZhbHVlLCBvcHRzLCBkZXB0aCArIDEsIHNlZW4pO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nICYmICFpc1JlZ0V4cChvYmopKSB7IC8vIGluIG9sZGVyIGVuZ2luZXMsIHJlZ2V4ZXMgYXJlIGNhbGxhYmxlXG4gICAgICAgIHZhciBuYW1lID0gbmFtZU9mKG9iaik7XG4gICAgICAgIHZhciBrZXlzID0gYXJyT2JqS2V5cyhvYmosIGluc3BlY3QpO1xuICAgICAgICByZXR1cm4gJ1tGdW5jdGlvbicgKyAobmFtZSA/ICc6ICcgKyBuYW1lIDogJyAoYW5vbnltb3VzKScpICsgJ10nICsgKGtleXMubGVuZ3RoID4gMCA/ICcgeyAnICsgJGpvaW4uY2FsbChrZXlzLCAnLCAnKSArICcgfScgOiAnJyk7XG4gICAgfVxuICAgIGlmIChpc1N5bWJvbChvYmopKSB7XG4gICAgICAgIHZhciBzeW1TdHJpbmcgPSBoYXNTaGFtbWVkU3ltYm9scyA/ICRyZXBsYWNlLmNhbGwoU3RyaW5nKG9iaiksIC9eKFN5bWJvbFxcKC4qXFwpKV9bXildKiQvLCAnJDEnKSA6IHN5bVRvU3RyaW5nLmNhbGwob2JqKTtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmICFoYXNTaGFtbWVkU3ltYm9scyA/IG1hcmtCb3hlZChzeW1TdHJpbmcpIDogc3ltU3RyaW5nO1xuICAgIH1cbiAgICBpZiAoaXNFbGVtZW50KG9iaikpIHtcbiAgICAgICAgdmFyIHMgPSAnPCcgKyAkdG9Mb3dlckNhc2UuY2FsbChTdHJpbmcob2JqLm5vZGVOYW1lKSk7XG4gICAgICAgIHZhciBhdHRycyA9IG9iai5hdHRyaWJ1dGVzIHx8IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGF0dHJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBzICs9ICcgJyArIGF0dHJzW2ldLm5hbWUgKyAnPScgKyB3cmFwUXVvdGVzKHF1b3RlKGF0dHJzW2ldLnZhbHVlKSwgJ2RvdWJsZScsIG9wdHMpO1xuICAgICAgICB9XG4gICAgICAgIHMgKz0gJz4nO1xuICAgICAgICBpZiAob2JqLmNoaWxkTm9kZXMgJiYgb2JqLmNoaWxkTm9kZXMubGVuZ3RoKSB7IHMgKz0gJy4uLic7IH1cbiAgICAgICAgcyArPSAnPC8nICsgJHRvTG93ZXJDYXNlLmNhbGwoU3RyaW5nKG9iai5ub2RlTmFtZSkpICsgJz4nO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9XG4gICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICBpZiAob2JqLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gJ1tdJzsgfVxuICAgICAgICB2YXIgeHMgPSBhcnJPYmpLZXlzKG9iaiwgaW5zcGVjdCk7XG4gICAgICAgIGlmIChpbmRlbnQgJiYgIXNpbmdsZUxpbmVWYWx1ZXMoeHMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1snICsgaW5kZW50ZWRKb2luKHhzLCBpbmRlbnQpICsgJ10nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnWyAnICsgJGpvaW4uY2FsbCh4cywgJywgJykgKyAnIF0nO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcihvYmopKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IGFyck9iaktleXMob2JqLCBpbnNwZWN0KTtcbiAgICAgICAgaWYgKCEoJ2NhdXNlJyBpbiBFcnJvci5wcm90b3R5cGUpICYmICdjYXVzZScgaW4gb2JqICYmICFpc0VudW1lcmFibGUuY2FsbChvYmosICdjYXVzZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3sgWycgKyBTdHJpbmcob2JqKSArICddICcgKyAkam9pbi5jYWxsKCRjb25jYXQuY2FsbCgnW2NhdXNlXTogJyArIGluc3BlY3Qob2JqLmNhdXNlKSwgcGFydHMpLCAnLCAnKSArICcgfSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gJ1snICsgU3RyaW5nKG9iaikgKyAnXSc7IH1cbiAgICAgICAgcmV0dXJuICd7IFsnICsgU3RyaW5nKG9iaikgKyAnXSAnICsgJGpvaW4uY2FsbChwYXJ0cywgJywgJykgKyAnIH0nO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgY3VzdG9tSW5zcGVjdCkge1xuICAgICAgICBpZiAoaW5zcGVjdFN5bWJvbCAmJiB0eXBlb2Ygb2JqW2luc3BlY3RTeW1ib2xdID09PSAnZnVuY3Rpb24nICYmIHV0aWxJbnNwZWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gdXRpbEluc3BlY3Qob2JqLCB7IGRlcHRoOiBtYXhEZXB0aCAtIGRlcHRoIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKGN1c3RvbUluc3BlY3QgIT09ICdzeW1ib2wnICYmIHR5cGVvZiBvYmouaW5zcGVjdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIG9iai5pbnNwZWN0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzTWFwKG9iaikpIHtcbiAgICAgICAgdmFyIG1hcFBhcnRzID0gW107XG4gICAgICAgIG1hcEZvckVhY2guY2FsbChvYmosIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICBtYXBQYXJ0cy5wdXNoKGluc3BlY3Qoa2V5LCBvYmosIHRydWUpICsgJyA9PiAnICsgaW5zcGVjdCh2YWx1ZSwgb2JqKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29sbGVjdGlvbk9mKCdNYXAnLCBtYXBTaXplLmNhbGwob2JqKSwgbWFwUGFydHMsIGluZGVudCk7XG4gICAgfVxuICAgIGlmIChpc1NldChvYmopKSB7XG4gICAgICAgIHZhciBzZXRQYXJ0cyA9IFtdO1xuICAgICAgICBzZXRGb3JFYWNoLmNhbGwob2JqLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHNldFBhcnRzLnB1c2goaW5zcGVjdCh2YWx1ZSwgb2JqKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29sbGVjdGlvbk9mKCdTZXQnLCBzZXRTaXplLmNhbGwob2JqKSwgc2V0UGFydHMsIGluZGVudCk7XG4gICAgfVxuICAgIGlmIChpc1dlYWtNYXAob2JqKSkge1xuICAgICAgICByZXR1cm4gd2Vha0NvbGxlY3Rpb25PZignV2Vha01hcCcpO1xuICAgIH1cbiAgICBpZiAoaXNXZWFrU2V0KG9iaikpIHtcbiAgICAgICAgcmV0dXJuIHdlYWtDb2xsZWN0aW9uT2YoJ1dlYWtTZXQnKTtcbiAgICB9XG4gICAgaWYgKGlzV2Vha1JlZihvYmopKSB7XG4gICAgICAgIHJldHVybiB3ZWFrQ29sbGVjdGlvbk9mKCdXZWFrUmVmJyk7XG4gICAgfVxuICAgIGlmIChpc051bWJlcihvYmopKSB7XG4gICAgICAgIHJldHVybiBtYXJrQm94ZWQoaW5zcGVjdChOdW1iZXIob2JqKSkpO1xuICAgIH1cbiAgICBpZiAoaXNCaWdJbnQob2JqKSkge1xuICAgICAgICByZXR1cm4gbWFya0JveGVkKGluc3BlY3QoYmlnSW50VmFsdWVPZi5jYWxsKG9iaikpKTtcbiAgICB9XG4gICAgaWYgKGlzQm9vbGVhbihvYmopKSB7XG4gICAgICAgIHJldHVybiBtYXJrQm94ZWQoYm9vbGVhblZhbHVlT2YuY2FsbChvYmopKTtcbiAgICB9XG4gICAgaWYgKGlzU3RyaW5nKG9iaikpIHtcbiAgICAgICAgcmV0dXJuIG1hcmtCb3hlZChpbnNwZWN0KFN0cmluZyhvYmopKSk7XG4gICAgfVxuICAgIGlmICghaXNEYXRlKG9iaikgJiYgIWlzUmVnRXhwKG9iaikpIHtcbiAgICAgICAgdmFyIHlzID0gYXJyT2JqS2V5cyhvYmosIGluc3BlY3QpO1xuICAgICAgICB2YXIgaXNQbGFpbk9iamVjdCA9IGdQTyA/IGdQTyhvYmopID09PSBPYmplY3QucHJvdG90eXBlIDogb2JqIGluc3RhbmNlb2YgT2JqZWN0IHx8IG9iai5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0O1xuICAgICAgICB2YXIgcHJvdG9UYWcgPSBvYmogaW5zdGFuY2VvZiBPYmplY3QgPyAnJyA6ICdudWxsIHByb3RvdHlwZSc7XG4gICAgICAgIHZhciBzdHJpbmdUYWcgPSAhaXNQbGFpbk9iamVjdCAmJiB0b1N0cmluZ1RhZyAmJiBPYmplY3Qob2JqKSA9PT0gb2JqICYmIHRvU3RyaW5nVGFnIGluIG9iaiA/ICRzbGljZS5jYWxsKHRvU3RyKG9iaiksIDgsIC0xKSA6IHByb3RvVGFnID8gJ09iamVjdCcgOiAnJztcbiAgICAgICAgdmFyIGNvbnN0cnVjdG9yVGFnID0gaXNQbGFpbk9iamVjdCB8fCB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yICE9PSAnZnVuY3Rpb24nID8gJycgOiBvYmouY29uc3RydWN0b3IubmFtZSA/IG9iai5jb25zdHJ1Y3Rvci5uYW1lICsgJyAnIDogJyc7XG4gICAgICAgIHZhciB0YWcgPSBjb25zdHJ1Y3RvclRhZyArIChzdHJpbmdUYWcgfHwgcHJvdG9UYWcgPyAnWycgKyAkam9pbi5jYWxsKCRjb25jYXQuY2FsbChbXSwgc3RyaW5nVGFnIHx8IFtdLCBwcm90b1RhZyB8fCBbXSksICc6ICcpICsgJ10gJyA6ICcnKTtcbiAgICAgICAgaWYgKHlzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gdGFnICsgJ3t9JzsgfVxuICAgICAgICBpZiAoaW5kZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGFnICsgJ3snICsgaW5kZW50ZWRKb2luKHlzLCBpbmRlbnQpICsgJ30nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0YWcgKyAneyAnICsgJGpvaW4uY2FsbCh5cywgJywgJykgKyAnIH0nO1xuICAgIH1cbiAgICByZXR1cm4gU3RyaW5nKG9iaik7XG59O1xuXG5mdW5jdGlvbiB3cmFwUXVvdGVzKHMsIGRlZmF1bHRTdHlsZSwgb3B0cykge1xuICAgIHZhciBxdW90ZUNoYXIgPSAob3B0cy5xdW90ZVN0eWxlIHx8IGRlZmF1bHRTdHlsZSkgPT09ICdkb3VibGUnID8gJ1wiJyA6IFwiJ1wiO1xuICAgIHJldHVybiBxdW90ZUNoYXIgKyBzICsgcXVvdGVDaGFyO1xufVxuXG5mdW5jdGlvbiBxdW90ZShzKSB7XG4gICAgcmV0dXJuICRyZXBsYWNlLmNhbGwoU3RyaW5nKHMpLCAvXCIvZywgJyZxdW90OycpO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJyAmJiAoIXRvU3RyaW5nVGFnIHx8ICEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmdUYWcgaW4gb2JqKSk7IH1cbmZ1bmN0aW9uIGlzRGF0ZShvYmopIHsgcmV0dXJuIHRvU3RyKG9iaikgPT09ICdbb2JqZWN0IERhdGVdJyAmJiAoIXRvU3RyaW5nVGFnIHx8ICEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmdUYWcgaW4gb2JqKSk7IH1cbmZ1bmN0aW9uIGlzUmVnRXhwKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgUmVnRXhwXScgJiYgKCF0b1N0cmluZ1RhZyB8fCAhKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nVGFnIGluIG9iaikpOyB9XG5mdW5jdGlvbiBpc0Vycm9yKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyAmJiAoIXRvU3RyaW5nVGFnIHx8ICEodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmdUYWcgaW4gb2JqKSk7IH1cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgU3RyaW5nXScgJiYgKCF0b1N0cmluZ1RhZyB8fCAhKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nVGFnIGluIG9iaikpOyB9XG5mdW5jdGlvbiBpc051bWJlcihvYmopIHsgcmV0dXJuIHRvU3RyKG9iaikgPT09ICdbb2JqZWN0IE51bWJlcl0nICYmICghdG9TdHJpbmdUYWcgfHwgISh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0b1N0cmluZ1RhZyBpbiBvYmopKTsgfVxuZnVuY3Rpb24gaXNCb29sZWFuKG9iaikgeyByZXR1cm4gdG9TdHIob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nICYmICghdG9TdHJpbmdUYWcgfHwgISh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0b1N0cmluZ1RhZyBpbiBvYmopKTsgfVxuXG4vLyBTeW1ib2wgYW5kIEJpZ0ludCBkbyBoYXZlIFN5bWJvbC50b1N0cmluZ1RhZyBieSBzcGVjLCBzbyB0aGF0IGNhbid0IGJlIHVzZWQgdG8gZWxpbWluYXRlIGZhbHNlIHBvc2l0aXZlc1xuZnVuY3Rpb24gaXNTeW1ib2wob2JqKSB7XG4gICAgaWYgKGhhc1NoYW1tZWRTeW1ib2xzKSB7XG4gICAgICAgIHJldHVybiBvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqIGluc3RhbmNlb2YgU3ltYm9sO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ3N5bWJvbCcpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICghb2JqIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8ICFzeW1Ub1N0cmluZykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHN5bVRvU3RyaW5nLmNhbGwob2JqKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge31cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzQmlnSW50KG9iaikge1xuICAgIGlmICghb2JqIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8ICFiaWdJbnRWYWx1ZU9mKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgYmlnSW50VmFsdWVPZi5jYWxsKG9iaik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSB8fCBmdW5jdGlvbiAoa2V5KSB7IHJldHVybiBrZXkgaW4gdGhpczsgfTtcbmZ1bmN0aW9uIGhhcyhvYmosIGtleSkge1xuICAgIHJldHVybiBoYXNPd24uY2FsbChvYmosIGtleSk7XG59XG5cbmZ1bmN0aW9uIHRvU3RyKG9iaikge1xuICAgIHJldHVybiBvYmplY3RUb1N0cmluZy5jYWxsKG9iaik7XG59XG5cbmZ1bmN0aW9uIG5hbWVPZihmKSB7XG4gICAgaWYgKGYubmFtZSkgeyByZXR1cm4gZi5uYW1lOyB9XG4gICAgdmFyIG0gPSAkbWF0Y2guY2FsbChmdW5jdGlvblRvU3RyaW5nLmNhbGwoZiksIC9eZnVuY3Rpb25cXHMqKFtcXHckXSspLyk7XG4gICAgaWYgKG0pIHsgcmV0dXJuIG1bMV07IH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gaW5kZXhPZih4cywgeCkge1xuICAgIGlmICh4cy5pbmRleE9mKSB7IHJldHVybiB4cy5pbmRleE9mKHgpOyB9XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB4cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYgKHhzW2ldID09PSB4KSB7IHJldHVybiBpOyB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuZnVuY3Rpb24gaXNNYXAoeCkge1xuICAgIGlmICghbWFwU2l6ZSB8fCAheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBtYXBTaXplLmNhbGwoeCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzZXRTaXplLmNhbGwoeCk7XG4gICAgICAgIH0gY2F0Y2ggKHMpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB4IGluc3RhbmNlb2YgTWFwOyAvLyBjb3JlLWpzIHdvcmthcm91bmQsIHByZS12Mi41LjBcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNXZWFrTWFwKHgpIHtcbiAgICBpZiAoIXdlYWtNYXBIYXMgfHwgIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgd2Vha01hcEhhcy5jYWxsKHgsIHdlYWtNYXBIYXMpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgd2Vha1NldEhhcy5jYWxsKHgsIHdlYWtTZXRIYXMpO1xuICAgICAgICB9IGNhdGNoIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCBpbnN0YW5jZW9mIFdlYWtNYXA7IC8vIGNvcmUtanMgd29ya2Fyb3VuZCwgcHJlLXYyLjUuMFxuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1dlYWtSZWYoeCkge1xuICAgIGlmICghd2Vha1JlZkRlcmVmIHx8ICF4IHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIHdlYWtSZWZEZXJlZi5jYWxsKHgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNTZXQoeCkge1xuICAgIGlmICghc2V0U2l6ZSB8fCAheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBzZXRTaXplLmNhbGwoeCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtYXBTaXplLmNhbGwoeCk7XG4gICAgICAgIH0gY2F0Y2ggKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB4IGluc3RhbmNlb2YgU2V0OyAvLyBjb3JlLWpzIHdvcmthcm91bmQsIHByZS12Mi41LjBcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNXZWFrU2V0KHgpIHtcbiAgICBpZiAoIXdlYWtTZXRIYXMgfHwgIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgd2Vha1NldEhhcy5jYWxsKHgsIHdlYWtTZXRIYXMpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgd2Vha01hcEhhcy5jYWxsKHgsIHdlYWtNYXBIYXMpO1xuICAgICAgICB9IGNhdGNoIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCBpbnN0YW5jZW9mIFdlYWtTZXQ7IC8vIGNvcmUtanMgd29ya2Fyb3VuZCwgcHJlLXYyLjUuMFxuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc0VsZW1lbnQoeCkge1xuICAgIGlmICgheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgaWYgKHR5cGVvZiBIVE1MRWxlbWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgeCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZW9mIHgubm9kZU5hbWUgPT09ICdzdHJpbmcnICYmIHR5cGVvZiB4LmdldEF0dHJpYnV0ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaW5zcGVjdFN0cmluZyhzdHIsIG9wdHMpIHtcbiAgICBpZiAoc3RyLmxlbmd0aCA+IG9wdHMubWF4U3RyaW5nTGVuZ3RoKSB7XG4gICAgICAgIHZhciByZW1haW5pbmcgPSBzdHIubGVuZ3RoIC0gb3B0cy5tYXhTdHJpbmdMZW5ndGg7XG4gICAgICAgIHZhciB0cmFpbGVyID0gJy4uLiAnICsgcmVtYWluaW5nICsgJyBtb3JlIGNoYXJhY3RlcicgKyAocmVtYWluaW5nID4gMSA/ICdzJyA6ICcnKTtcbiAgICAgICAgcmV0dXJuIGluc3BlY3RTdHJpbmcoJHNsaWNlLmNhbGwoc3RyLCAwLCBvcHRzLm1heFN0cmluZ0xlbmd0aCksIG9wdHMpICsgdHJhaWxlcjtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnRyb2wtcmVnZXhcbiAgICB2YXIgcyA9ICRyZXBsYWNlLmNhbGwoJHJlcGxhY2UuY2FsbChzdHIsIC8oWydcXFxcXSkvZywgJ1xcXFwkMScpLCAvW1xceDAwLVxceDFmXS9nLCBsb3dieXRlKTtcbiAgICByZXR1cm4gd3JhcFF1b3RlcyhzLCAnc2luZ2xlJywgb3B0cyk7XG59XG5cbmZ1bmN0aW9uIGxvd2J5dGUoYykge1xuICAgIHZhciBuID0gYy5jaGFyQ29kZUF0KDApO1xuICAgIHZhciB4ID0ge1xuICAgICAgICA4OiAnYicsXG4gICAgICAgIDk6ICd0JyxcbiAgICAgICAgMTA6ICduJyxcbiAgICAgICAgMTI6ICdmJyxcbiAgICAgICAgMTM6ICdyJ1xuICAgIH1bbl07XG4gICAgaWYgKHgpIHsgcmV0dXJuICdcXFxcJyArIHg7IH1cbiAgICByZXR1cm4gJ1xcXFx4JyArIChuIDwgMHgxMCA/ICcwJyA6ICcnKSArICR0b1VwcGVyQ2FzZS5jYWxsKG4udG9TdHJpbmcoMTYpKTtcbn1cblxuZnVuY3Rpb24gbWFya0JveGVkKHN0cikge1xuICAgIHJldHVybiAnT2JqZWN0KCcgKyBzdHIgKyAnKSc7XG59XG5cbmZ1bmN0aW9uIHdlYWtDb2xsZWN0aW9uT2YodHlwZSkge1xuICAgIHJldHVybiB0eXBlICsgJyB7ID8gfSc7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3Rpb25PZih0eXBlLCBzaXplLCBlbnRyaWVzLCBpbmRlbnQpIHtcbiAgICB2YXIgam9pbmVkRW50cmllcyA9IGluZGVudCA/IGluZGVudGVkSm9pbihlbnRyaWVzLCBpbmRlbnQpIDogJGpvaW4uY2FsbChlbnRyaWVzLCAnLCAnKTtcbiAgICByZXR1cm4gdHlwZSArICcgKCcgKyBzaXplICsgJykgeycgKyBqb2luZWRFbnRyaWVzICsgJ30nO1xufVxuXG5mdW5jdGlvbiBzaW5nbGVMaW5lVmFsdWVzKHhzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaW5kZXhPZih4c1tpXSwgJ1xcbicpID49IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0SW5kZW50KG9wdHMsIGRlcHRoKSB7XG4gICAgdmFyIGJhc2VJbmRlbnQ7XG4gICAgaWYgKG9wdHMuaW5kZW50ID09PSAnXFx0Jykge1xuICAgICAgICBiYXNlSW5kZW50ID0gJ1xcdCc7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygb3B0cy5pbmRlbnQgPT09ICdudW1iZXInICYmIG9wdHMuaW5kZW50ID4gMCkge1xuICAgICAgICBiYXNlSW5kZW50ID0gJGpvaW4uY2FsbChBcnJheShvcHRzLmluZGVudCArIDEpLCAnICcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBiYXNlOiBiYXNlSW5kZW50LFxuICAgICAgICBwcmV2OiAkam9pbi5jYWxsKEFycmF5KGRlcHRoICsgMSksIGJhc2VJbmRlbnQpXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gaW5kZW50ZWRKb2luKHhzLCBpbmRlbnQpIHtcbiAgICBpZiAoeHMubGVuZ3RoID09PSAwKSB7IHJldHVybiAnJzsgfVxuICAgIHZhciBsaW5lSm9pbmVyID0gJ1xcbicgKyBpbmRlbnQucHJldiArIGluZGVudC5iYXNlO1xuICAgIHJldHVybiBsaW5lSm9pbmVyICsgJGpvaW4uY2FsbCh4cywgJywnICsgbGluZUpvaW5lcikgKyAnXFxuJyArIGluZGVudC5wcmV2O1xufVxuXG5mdW5jdGlvbiBhcnJPYmpLZXlzKG9iaiwgaW5zcGVjdCkge1xuICAgIHZhciBpc0FyciA9IGlzQXJyYXkob2JqKTtcbiAgICB2YXIgeHMgPSBbXTtcbiAgICBpZiAoaXNBcnIpIHtcbiAgICAgICAgeHMubGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHhzW2ldID0gaGFzKG9iaiwgaSkgPyBpbnNwZWN0KG9ialtpXSwgb2JqKSA6ICcnO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciBzeW1zID0gdHlwZW9mIGdPUFMgPT09ICdmdW5jdGlvbicgPyBnT1BTKG9iaikgOiBbXTtcbiAgICB2YXIgc3ltTWFwO1xuICAgIGlmIChoYXNTaGFtbWVkU3ltYm9scykge1xuICAgICAgICBzeW1NYXAgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBzeW1zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICBzeW1NYXBbJyQnICsgc3ltc1trXV0gPSBzeW1zW2tdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXJlc3RyaWN0ZWQtc3ludGF4XG4gICAgICAgIGlmICghaGFzKG9iaiwga2V5KSkgeyBjb250aW51ZTsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXJlc3RyaWN0ZWQtc3ludGF4LCBuby1jb250aW51ZVxuICAgICAgICBpZiAoaXNBcnIgJiYgU3RyaW5nKE51bWJlcihrZXkpKSA9PT0ga2V5ICYmIGtleSA8IG9iai5sZW5ndGgpIHsgY29udGludWU7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1yZXN0cmljdGVkLXN5bnRheCwgbm8tY29udGludWVcbiAgICAgICAgaWYgKGhhc1NoYW1tZWRTeW1ib2xzICYmIHN5bU1hcFsnJCcgKyBrZXldIGluc3RhbmNlb2YgU3ltYm9sKSB7XG4gICAgICAgICAgICAvLyB0aGlzIGlzIHRvIHByZXZlbnQgc2hhbW1lZCBTeW1ib2xzLCB3aGljaCBhcmUgc3RvcmVkIGFzIHN0cmluZ3MsIGZyb20gYmVpbmcgaW5jbHVkZWQgaW4gdGhlIHN0cmluZyBrZXkgc2VjdGlvblxuICAgICAgICAgICAgY29udGludWU7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcmVzdHJpY3RlZC1zeW50YXgsIG5vLWNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoJHRlc3QuY2FsbCgvW15cXHckXS8sIGtleSkpIHtcbiAgICAgICAgICAgIHhzLnB1c2goaW5zcGVjdChrZXksIG9iaikgKyAnOiAnICsgaW5zcGVjdChvYmpba2V5XSwgb2JqKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB4cy5wdXNoKGtleSArICc6ICcgKyBpbnNwZWN0KG9ialtrZXldLCBvYmopKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGdPUFMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBzeW1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAoaXNFbnVtZXJhYmxlLmNhbGwob2JqLCBzeW1zW2pdKSkge1xuICAgICAgICAgICAgICAgIHhzLnB1c2goJ1snICsgaW5zcGVjdChzeW1zW2pdKSArICddOiAnICsgaW5zcGVjdChvYmpbc3ltc1tqXV0sIG9iaikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB4cztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IFwiXFxcIk5vb2RsZXMuIFdlIGFsbCBlYXQgdGhlbS4gV2UgYWxsIGxvdmUgdGhlbS4gQW5kIERpYW1vbmQgQ2l0eSdzIFBvd2VyIE5vb2RsZXMgaGFzIHN1cHBsaWVkIHRoaXMgc3VzdGVuYW5jZSBmb3IgdGhlIHBhc3QgZmlmdGVlbiB5ZWFycy4gRnJvbSB0aGUgc3RpbHRlZCBtZWNoYW5pY2FsIGNhZGVuY2Ugb2YgVGFrYWhhc2hpJ3MgcHJvZ3JhbW1lZCBKYXBhbmVzZSwgdG8gdGhlIGZyYWdyYW50IHN0ZWFtIHRoYXQgd2FmdHMgZnJvbSBlYWNoIGJvd2wsIHRvIHRoZSBzY2FsZGluZyB0YW5nIG9mIGVhY2ggZGVsaWNpb3VzIG1vdXRoZnVsIC0gdGhlIG9yZGVyaW5nIGFuZCBlYXRpbmcgb2Ygbm9vZGxlcyBpcyBidXQgb25lIG9mIG1hbnkgc2hhcmVkIGh1bWFuIGV4cGVyaWVuY2VzLiBPciBpcyBpdD9cXFwiIFxcbi1UaGUgU3ludGhldGljIFRydXRoXFxuXFxuVGhpcyBzdHJ1Y3R1cmUgZGlyZWN0bHkgb3Bwb3NpdGUgdGhlIGNpdHkncyBtYWluIGVudHJhbmNlIGluIHRoZSBjZW50ZXIgb2YgdGhlIG1hcmtldCBpcyBhIHNtYWxsIG91dGRvb3IgcmVzdGF1cmFudC4gQ291bnRlcnMgZW5jaXJjbGUgYSBjZW50cmFsIHBpbGxhciwgd2l0aCBUYWthaGFzaGkgYmVoaW5kIG9uZSBvZiB0aGVtLiBBIGNvb2tpbmcgc3RhdGlvbiBzaXRzIG5lYXJieS4gVGhlIHBpbGxhciBmZWF0dXJlcyBhIGZ1bmN0aW9uYWwgcG93ZXIgcmVhY3Rvciwgc3VwcGx5aW5nIHRoZSBzdXJyb3VuZGluZyBidWlsZGluZ3Mgd2l0aCBlbGVjdHJpY2l0eS5cXG5cXG5BcHByb3hpbWF0ZWx5IDQzIHllYXJzIGJlZm9yZSBQb3dlciBOb29kbGVzIHdhcyBlc3RhYmxpc2hlZCwgYSBiYXIgdGhhdCBvY2N1cGllZCB0aGUgc2FtZSBzcGFjZSBpbiB0aGUgbWFya2V0IHdhcyB0aGUgc2NlbmUgb2YgdGhlIEJyb2tlbiBNYXNrIGluY2lkZW50LiBUaGlzIHZpb2xlbnQgZXZlbnQgcmVzdWx0ZWQgaW4gdGhlIGRlYXRoIG9mIHRlbiBpbmRpdmlkdWFscyBhdCB0aGUgaGFuZCBvZiBhIG1hbGZ1bmN0aW9uaW5nIEluc3RpdHV0ZSBzeW50aCBpbiBNYXkgMjIyOS5cXG5cXG5VcG9uIG1lZXRpbmcgVGFrYWhhc2hpIGZvciB0aGUgZmlyc3QgdGltZSBhbmQgaGVhcmluZyBoaXMgc2lnbmF0dXJlIHF1ZXN0aW9uIChcXFwiTmFuLW5pIHNoaW1hc2tvLWthP1xcXCIpLCBhIG5lYXJieSByZXNpZGVudCB3aWxsIHNheSBcXFwiSnVzdCBzYXkgeWVzLCBpdCdzIGFsbCBoZSB1bmRlcnN0YW5kcy5cXFwiXFxuXFxuQ29tcGFuaW9ucyB3aWxsIHRyeSB0byB0YWxrIHRvIFRha2FoYXNoaSB3aGVuIGFycml2aW5nIGluIHRoZSBEaWFtb25kIENpdHkgbWFya2V0IGZvciB0aGUgZmlyc3QgdGltZS5cXG5cXG5NYWNDcmVhZHkgZW5qb3lzIFRha2FoYXNoaSdzIG5vb2RsZXMgaW1tZW5zZWx5LiBJZiBoZSBpcyB0aGUgU29sZSBTdXJ2aXZvcidzIGN1cnJlbnQgY29tcGFuaW9uLCBoZSBhY2NlcHRzIGEgYm93bCBmcm9tIHRoZSByb2JvdGljIGNoZWYsIGFuZCB3aGVuIGZpbmlzaGVkLCBlbnRodXNpYXN0aWNhbGx5IGFza3MgZm9yIG1vcmUuXFxuXFxuSWYgdmlzaXRpbmcgRGlhbW9uZCBDaXR5IG9uIEhhbGxvd2VlbiwgUG93ZXIgTm9vZGxlcyBpcyBkZWNvcmF0ZWQgd2l0aCByZWQgc2t1bGwgY3V0b3V0cyBvbiB0aGUgY291bnRlciBhbmQgXFxcIkhhcHB5IEhhbGxvd2VlblxcXCIgYmFubmVycyBzdHJldGNoZWQgYWNyb3NzIHRoZSBjYW5vcHkuXFxuXFxuSWYgdmlzaXRpbmcgRGlhbW9uZCBDaXR5IG9uIENocmlzdG1hcywgUG93ZXIgTm9vZGxlcyBpcyBkZWNvcmF0ZWQgd2l0aCBDaHJpc3RtYXMgdHJlZXMgYW5kIGxpZ2h0cyBjb25uZWN0ZWQgdG8gc3Vycm91bmRpbmcgYnVpbGRpbmdzLlxcblxcblRoZSBGYXIgSGFyYm9yIG5vdGUgVGFzdGUgdGVzdCBmb3VuZCBpbiB0aGUgTnVjbGV1cyBtYWtlcyBhIHJlZmVyZW5jZSB0byBQb3dlciBOb29kbGVzLlxcblwiOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIEdldEludHJpbnNpYyA9IHJlcXVpcmUoJ2dldC1pbnRyaW5zaWMnKTtcbnZhciBjYWxsQm91bmQgPSByZXF1aXJlKCdjYWxsLWJpbmQvY2FsbEJvdW5kJyk7XG52YXIgaW5zcGVjdCA9IHJlcXVpcmUoJ29iamVjdC1pbnNwZWN0Jyk7XG5cbnZhciAkVHlwZUVycm9yID0gR2V0SW50cmluc2ljKCclVHlwZUVycm9yJScpO1xudmFyICRXZWFrTWFwID0gR2V0SW50cmluc2ljKCclV2Vha01hcCUnLCB0cnVlKTtcbnZhciAkTWFwID0gR2V0SW50cmluc2ljKCclTWFwJScsIHRydWUpO1xuXG52YXIgJHdlYWtNYXBHZXQgPSBjYWxsQm91bmQoJ1dlYWtNYXAucHJvdG90eXBlLmdldCcsIHRydWUpO1xudmFyICR3ZWFrTWFwU2V0ID0gY2FsbEJvdW5kKCdXZWFrTWFwLnByb3RvdHlwZS5zZXQnLCB0cnVlKTtcbnZhciAkd2Vha01hcEhhcyA9IGNhbGxCb3VuZCgnV2Vha01hcC5wcm90b3R5cGUuaGFzJywgdHJ1ZSk7XG52YXIgJG1hcEdldCA9IGNhbGxCb3VuZCgnTWFwLnByb3RvdHlwZS5nZXQnLCB0cnVlKTtcbnZhciAkbWFwU2V0ID0gY2FsbEJvdW5kKCdNYXAucHJvdG90eXBlLnNldCcsIHRydWUpO1xudmFyICRtYXBIYXMgPSBjYWxsQm91bmQoJ01hcC5wcm90b3R5cGUuaGFzJywgdHJ1ZSk7XG5cbi8qXG4gKiBUaGlzIGZ1bmN0aW9uIHRyYXZlcnNlcyB0aGUgbGlzdCByZXR1cm5pbmcgdGhlIG5vZGUgY29ycmVzcG9uZGluZyB0byB0aGVcbiAqIGdpdmVuIGtleS5cbiAqXG4gKiBUaGF0IG5vZGUgaXMgYWxzbyBtb3ZlZCB0byB0aGUgaGVhZCBvZiB0aGUgbGlzdCwgc28gdGhhdCBpZiBpdCdzIGFjY2Vzc2VkXG4gKiBhZ2FpbiB3ZSBkb24ndCBuZWVkIHRvIHRyYXZlcnNlIHRoZSB3aG9sZSBsaXN0LiBCeSBkb2luZyBzbywgYWxsIHRoZSByZWNlbnRseVxuICogdXNlZCBub2RlcyBjYW4gYmUgYWNjZXNzZWQgcmVsYXRpdmVseSBxdWlja2x5LlxuICovXG52YXIgbGlzdEdldE5vZGUgPSBmdW5jdGlvbiAobGlzdCwga2V5KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY29uc2lzdGVudC1yZXR1cm5cblx0Zm9yICh2YXIgcHJldiA9IGxpc3QsIGN1cnI7IChjdXJyID0gcHJldi5uZXh0KSAhPT0gbnVsbDsgcHJldiA9IGN1cnIpIHtcblx0XHRpZiAoY3Vyci5rZXkgPT09IGtleSkge1xuXHRcdFx0cHJldi5uZXh0ID0gY3Vyci5uZXh0O1xuXHRcdFx0Y3Vyci5uZXh0ID0gbGlzdC5uZXh0O1xuXHRcdFx0bGlzdC5uZXh0ID0gY3VycjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuXHRcdFx0cmV0dXJuIGN1cnI7XG5cdFx0fVxuXHR9XG59O1xuXG52YXIgbGlzdEdldCA9IGZ1bmN0aW9uIChvYmplY3RzLCBrZXkpIHtcblx0dmFyIG5vZGUgPSBsaXN0R2V0Tm9kZShvYmplY3RzLCBrZXkpO1xuXHRyZXR1cm4gbm9kZSAmJiBub2RlLnZhbHVlO1xufTtcbnZhciBsaXN0U2V0ID0gZnVuY3Rpb24gKG9iamVjdHMsIGtleSwgdmFsdWUpIHtcblx0dmFyIG5vZGUgPSBsaXN0R2V0Tm9kZShvYmplY3RzLCBrZXkpO1xuXHRpZiAobm9kZSkge1xuXHRcdG5vZGUudmFsdWUgPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHQvLyBQcmVwZW5kIHRoZSBuZXcgbm9kZSB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaXN0XG5cdFx0b2JqZWN0cy5uZXh0ID0geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG5cdFx0XHRrZXk6IGtleSxcblx0XHRcdG5leHQ6IG9iamVjdHMubmV4dCxcblx0XHRcdHZhbHVlOiB2YWx1ZVxuXHRcdH07XG5cdH1cbn07XG52YXIgbGlzdEhhcyA9IGZ1bmN0aW9uIChvYmplY3RzLCBrZXkpIHtcblx0cmV0dXJuICEhbGlzdEdldE5vZGUob2JqZWN0cywga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2V0U2lkZUNoYW5uZWwoKSB7XG5cdHZhciAkd207XG5cdHZhciAkbTtcblx0dmFyICRvO1xuXHR2YXIgY2hhbm5lbCA9IHtcblx0XHRhc3NlcnQ6IGZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdGlmICghY2hhbm5lbC5oYXMoa2V5KSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignU2lkZSBjaGFubmVsIGRvZXMgbm90IGNvbnRhaW4gJyArIGluc3BlY3Qoa2V5KSk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRnZXQ6IGZ1bmN0aW9uIChrZXkpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb25zaXN0ZW50LXJldHVyblxuXHRcdFx0aWYgKCRXZWFrTWFwICYmIGtleSAmJiAodHlwZW9mIGtleSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIGtleSA9PT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdFx0aWYgKCR3bSkge1xuXHRcdFx0XHRcdHJldHVybiAkd2Vha01hcEdldCgkd20sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoJE1hcCkge1xuXHRcdFx0XHRpZiAoJG0pIHtcblx0XHRcdFx0XHRyZXR1cm4gJG1hcEdldCgkbSwga2V5KTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCRvKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbG9uZWx5LWlmXG5cdFx0XHRcdFx0cmV0dXJuIGxpc3RHZXQoJG8sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdGhhczogZnVuY3Rpb24gKGtleSkge1xuXHRcdFx0aWYgKCRXZWFrTWFwICYmIGtleSAmJiAodHlwZW9mIGtleSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIGtleSA9PT0gJ2Z1bmN0aW9uJykpIHtcblx0XHRcdFx0aWYgKCR3bSkge1xuXHRcdFx0XHRcdHJldHVybiAkd2Vha01hcEhhcygkd20sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoJE1hcCkge1xuXHRcdFx0XHRpZiAoJG0pIHtcblx0XHRcdFx0XHRyZXR1cm4gJG1hcEhhcygkbSwga2V5KTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCRvKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbG9uZWx5LWlmXG5cdFx0XHRcdFx0cmV0dXJuIGxpc3RIYXMoJG8sIGtleSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LFxuXHRcdHNldDogZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcblx0XHRcdGlmICgkV2Vha01hcCAmJiBrZXkgJiYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBrZXkgPT09ICdmdW5jdGlvbicpKSB7XG5cdFx0XHRcdGlmICghJHdtKSB7XG5cdFx0XHRcdFx0JHdtID0gbmV3ICRXZWFrTWFwKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JHdlYWtNYXBTZXQoJHdtLCBrZXksIHZhbHVlKTtcblx0XHRcdH0gZWxzZSBpZiAoJE1hcCkge1xuXHRcdFx0XHRpZiAoISRtKSB7XG5cdFx0XHRcdFx0JG0gPSBuZXcgJE1hcCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCRtYXBTZXQoJG0sIGtleSwgdmFsdWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCEkbykge1xuXHRcdFx0XHRcdC8qXG5cdFx0XHRcdFx0ICogSW5pdGlhbGl6ZSB0aGUgbGlua2VkIGxpc3QgYXMgYW4gZW1wdHkgbm9kZSwgc28gdGhhdCB3ZSBkb24ndCBoYXZlXG5cdFx0XHRcdFx0ICogdG8gc3BlY2lhbC1jYXNlIGhhbmRsaW5nIG9mIHRoZSBmaXJzdCBub2RlOiB3ZSBjYW4gYWx3YXlzIHJlZmVyIHRvXG5cdFx0XHRcdFx0ICogaXQgYXMgKHByZXZpb3VzIG5vZGUpLm5leHQsIGluc3RlYWQgb2Ygc29tZXRoaW5nIGxpa2UgKGxpc3QpLmhlYWRcblx0XHRcdFx0XHQgKi9cblx0XHRcdFx0XHQkbyA9IHsga2V5OiB7fSwgbmV4dDogbnVsbCB9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxpc3RTZXQoJG8sIGtleSwgdmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblx0cmV0dXJuIGNoYW5uZWw7XG59O1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2dsb2JhbC5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2dsb2JhbC5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vaW5pdGlhbFBhZ2UuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi9pbml0aWFsUGFnZS5jc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vbWVudS5jc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL21lbnUuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBzdHlsZXNJbkRPTSA9IFtdO1xuXG5mdW5jdGlvbiBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKSB7XG4gIHZhciByZXN1bHQgPSAtMTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0eWxlc0luRE9NLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHN0eWxlc0luRE9NW2ldLmlkZW50aWZpZXIgPT09IGlkZW50aWZpZXIpIHtcbiAgICAgIHJlc3VsdCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBtb2R1bGVzVG9Eb20obGlzdCwgb3B0aW9ucykge1xuICB2YXIgaWRDb3VudE1hcCA9IHt9O1xuICB2YXIgaWRlbnRpZmllcnMgPSBbXTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV07XG4gICAgdmFyIGlkID0gb3B0aW9ucy5iYXNlID8gaXRlbVswXSArIG9wdGlvbnMuYmFzZSA6IGl0ZW1bMF07XG4gICAgdmFyIGNvdW50ID0gaWRDb3VudE1hcFtpZF0gfHwgMDtcbiAgICB2YXIgaWRlbnRpZmllciA9IFwiXCIuY29uY2F0KGlkLCBcIiBcIikuY29uY2F0KGNvdW50KTtcbiAgICBpZENvdW50TWFwW2lkXSA9IGNvdW50ICsgMTtcbiAgICB2YXIgaW5kZXhCeUlkZW50aWZpZXIgPSBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICB2YXIgb2JqID0ge1xuICAgICAgY3NzOiBpdGVtWzFdLFxuICAgICAgbWVkaWE6IGl0ZW1bMl0sXG4gICAgICBzb3VyY2VNYXA6IGl0ZW1bM10sXG4gICAgICBzdXBwb3J0czogaXRlbVs0XSxcbiAgICAgIGxheWVyOiBpdGVtWzVdXG4gICAgfTtcblxuICAgIGlmIChpbmRleEJ5SWRlbnRpZmllciAhPT0gLTEpIHtcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4QnlJZGVudGlmaWVyXS5yZWZlcmVuY2VzKys7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleEJ5SWRlbnRpZmllcl0udXBkYXRlcihvYmopO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdXBkYXRlciA9IGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpO1xuICAgICAgb3B0aW9ucy5ieUluZGV4ID0gaTtcbiAgICAgIHN0eWxlc0luRE9NLnNwbGljZShpLCAwLCB7XG4gICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXG4gICAgICAgIHVwZGF0ZXI6IHVwZGF0ZXIsXG4gICAgICAgIHJlZmVyZW5jZXM6IDFcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlkZW50aWZpZXJzLnB1c2goaWRlbnRpZmllcik7XG4gIH1cblxuICByZXR1cm4gaWRlbnRpZmllcnM7XG59XG5cbmZ1bmN0aW9uIGFkZEVsZW1lbnRTdHlsZShvYmosIG9wdGlvbnMpIHtcbiAgdmFyIGFwaSA9IG9wdGlvbnMuZG9tQVBJKG9wdGlvbnMpO1xuICBhcGkudXBkYXRlKG9iaik7XG5cbiAgdmFyIHVwZGF0ZXIgPSBmdW5jdGlvbiB1cGRhdGVyKG5ld09iaikge1xuICAgIGlmIChuZXdPYmopIHtcbiAgICAgIGlmIChuZXdPYmouY3NzID09PSBvYmouY3NzICYmIG5ld09iai5tZWRpYSA9PT0gb2JqLm1lZGlhICYmIG5ld09iai5zb3VyY2VNYXAgPT09IG9iai5zb3VyY2VNYXAgJiYgbmV3T2JqLnN1cHBvcnRzID09PSBvYmouc3VwcG9ydHMgJiYgbmV3T2JqLmxheWVyID09PSBvYmoubGF5ZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBhcGkudXBkYXRlKG9iaiA9IG5ld09iaik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFwaS5yZW1vdmUoKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHVwZGF0ZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGxpc3QsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGxpc3QgPSBsaXN0IHx8IFtdO1xuICB2YXIgbGFzdElkZW50aWZpZXJzID0gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpO1xuICByZXR1cm4gZnVuY3Rpb24gdXBkYXRlKG5ld0xpc3QpIHtcbiAgICBuZXdMaXN0ID0gbmV3TGlzdCB8fCBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGFzdElkZW50aWZpZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaWRlbnRpZmllciA9IGxhc3RJZGVudGlmaWVyc1tpXTtcbiAgICAgIHZhciBpbmRleCA9IGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgICAgc3R5bGVzSW5ET01baW5kZXhdLnJlZmVyZW5jZXMtLTtcbiAgICB9XG5cbiAgICB2YXIgbmV3TGFzdElkZW50aWZpZXJzID0gbW9kdWxlc1RvRG9tKG5ld0xpc3QsIG9wdGlvbnMpO1xuXG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGxhc3RJZGVudGlmaWVycy5sZW5ndGg7IF9pKyspIHtcbiAgICAgIHZhciBfaWRlbnRpZmllciA9IGxhc3RJZGVudGlmaWVyc1tfaV07XG5cbiAgICAgIHZhciBfaW5kZXggPSBnZXRJbmRleEJ5SWRlbnRpZmllcihfaWRlbnRpZmllcik7XG5cbiAgICAgIGlmIChzdHlsZXNJbkRPTVtfaW5kZXhdLnJlZmVyZW5jZXMgPT09IDApIHtcbiAgICAgICAgc3R5bGVzSW5ET01bX2luZGV4XS51cGRhdGVyKCk7XG5cbiAgICAgICAgc3R5bGVzSW5ET00uc3BsaWNlKF9pbmRleCwgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGFzdElkZW50aWZpZXJzID0gbmV3TGFzdElkZW50aWZpZXJzO1xuICB9O1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIG1lbW8gPSB7fTtcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuXG5mdW5jdGlvbiBnZXRUYXJnZXQodGFyZ2V0KSB7XG4gIGlmICh0eXBlb2YgbWVtb1t0YXJnZXRdID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdmFyIHN0eWxlVGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXQpOyAvLyBTcGVjaWFsIGNhc2UgdG8gcmV0dXJuIGhlYWQgb2YgaWZyYW1lIGluc3RlYWQgb2YgaWZyYW1lIGl0c2VsZlxuXG4gICAgaWYgKHdpbmRvdy5IVE1MSUZyYW1lRWxlbWVudCAmJiBzdHlsZVRhcmdldCBpbnN0YW5jZW9mIHdpbmRvdy5IVE1MSUZyYW1lRWxlbWVudCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gVGhpcyB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbiBpZiBhY2Nlc3MgdG8gaWZyYW1lIGlzIGJsb2NrZWRcbiAgICAgICAgLy8gZHVlIHRvIGNyb3NzLW9yaWdpbiByZXN0cmljdGlvbnNcbiAgICAgICAgc3R5bGVUYXJnZXQgPSBzdHlsZVRhcmdldC5jb250ZW50RG9jdW1lbnQuaGVhZDtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gaXN0YW5idWwgaWdub3JlIG5leHRcbiAgICAgICAgc3R5bGVUYXJnZXQgPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIG1lbW9bdGFyZ2V0XSA9IHN0eWxlVGFyZ2V0O1xuICB9XG5cbiAgcmV0dXJuIG1lbW9bdGFyZ2V0XTtcbn1cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuXG5cbmZ1bmN0aW9uIGluc2VydEJ5U2VsZWN0b3IoaW5zZXJ0LCBzdHlsZSkge1xuICB2YXIgdGFyZ2V0ID0gZ2V0VGFyZ2V0KGluc2VydCk7XG5cbiAgaWYgKCF0YXJnZXQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZG4ndCBmaW5kIGEgc3R5bGUgdGFyZ2V0LiBUaGlzIHByb2JhYmx5IG1lYW5zIHRoYXQgdGhlIHZhbHVlIGZvciB0aGUgJ2luc2VydCcgcGFyYW1ldGVyIGlzIGludmFsaWQuXCIpO1xuICB9XG5cbiAgdGFyZ2V0LmFwcGVuZENoaWxkKHN0eWxlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRCeVNlbGVjdG9yOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKSB7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuICBvcHRpb25zLnNldEF0dHJpYnV0ZXMoZWxlbWVudCwgb3B0aW9ucy5hdHRyaWJ1dGVzKTtcbiAgb3B0aW9ucy5pbnNlcnQoZWxlbWVudCwgb3B0aW9ucy5vcHRpb25zKTtcbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5zZXJ0U3R5bGVFbGVtZW50OyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcyhzdHlsZUVsZW1lbnQpIHtcbiAgdmFyIG5vbmNlID0gdHlwZW9mIF9fd2VicGFja19ub25jZV9fICE9PSBcInVuZGVmaW5lZFwiID8gX193ZWJwYWNrX25vbmNlX18gOiBudWxsO1xuXG4gIGlmIChub25jZSkge1xuICAgIHN0eWxlRWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJub25jZVwiLCBub25jZSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gYXBwbHkoc3R5bGVFbGVtZW50LCBvcHRpb25zLCBvYmopIHtcbiAgdmFyIGNzcyA9IFwiXCI7XG5cbiAgaWYgKG9iai5zdXBwb3J0cykge1xuICAgIGNzcyArPSBcIkBzdXBwb3J0cyAoXCIuY29uY2F0KG9iai5zdXBwb3J0cywgXCIpIHtcIik7XG4gIH1cblxuICBpZiAob2JqLm1lZGlhKSB7XG4gICAgY3NzICs9IFwiQG1lZGlhIFwiLmNvbmNhdChvYmoubWVkaWEsIFwiIHtcIik7XG4gIH1cblxuICB2YXIgbmVlZExheWVyID0gdHlwZW9mIG9iai5sYXllciAhPT0gXCJ1bmRlZmluZWRcIjtcblxuICBpZiAobmVlZExheWVyKSB7XG4gICAgY3NzICs9IFwiQGxheWVyXCIuY29uY2F0KG9iai5sYXllci5sZW5ndGggPiAwID8gXCIgXCIuY29uY2F0KG9iai5sYXllcikgOiBcIlwiLCBcIiB7XCIpO1xuICB9XG5cbiAgY3NzICs9IG9iai5jc3M7XG5cbiAgaWYgKG5lZWRMYXllcikge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuXG4gIGlmIChvYmoubWVkaWEpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cblxuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG5cbiAgdmFyIHNvdXJjZU1hcCA9IG9iai5zb3VyY2VNYXA7XG5cbiAgaWYgKHNvdXJjZU1hcCAmJiB0eXBlb2YgYnRvYSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIGNzcyArPSBcIlxcbi8qIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsXCIuY29uY2F0KGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHNvdXJjZU1hcCkpKSksIFwiICovXCIpO1xuICB9IC8vIEZvciBvbGQgSUVcblxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgICovXG5cblxuICBvcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtKGNzcywgc3R5bGVFbGVtZW50LCBvcHRpb25zLm9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KSB7XG4gIC8vIGlzdGFuYnVsIGlnbm9yZSBpZlxuICBpZiAoc3R5bGVFbGVtZW50LnBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzdHlsZUVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQpO1xufVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5cblxuZnVuY3Rpb24gZG9tQVBJKG9wdGlvbnMpIHtcbiAgdmFyIHN0eWxlRWxlbWVudCA9IG9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMpO1xuICByZXR1cm4ge1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKG9iaikge1xuICAgICAgYXBwbHkoc3R5bGVFbGVtZW50LCBvcHRpb25zLCBvYmopO1xuICAgIH0sXG4gICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUoKSB7XG4gICAgICByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KTtcbiAgICB9XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZG9tQVBJOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIHN0eWxlVGFnVHJhbnNmb3JtKGNzcywgc3R5bGVFbGVtZW50KSB7XG4gIGlmIChzdHlsZUVsZW1lbnQuc3R5bGVTaGVldCkge1xuICAgIHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG4gIH0gZWxzZSB7XG4gICAgd2hpbGUgKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICBzdHlsZUVsZW1lbnQucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgIH1cblxuICAgIHN0eWxlRWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHN0eWxlVGFnVHJhbnNmb3JtOyIsImltcG9ydCBnaXRIdWJJY29uIGZyb20gJy4vaW1ncy9naXRodWIucG5nJztcbmltcG9ydCAnLi9nbG9iYWwuY3NzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlRm9vdGVyKGVsZW1lbnQpIHtcbiAgY29uc3QgZm9vdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZm9vdGVyJyk7XG4gIGZvb3Rlci5jbGFzc0xpc3QuYWRkKCdmb290ZXInKTtcbiAgZm9vdGVyLmNsYXNzTGlzdC5hZGQoJ2dsb3cnKTtcblxuICBjb25zdCBpY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gIGljb24uc3JjID0gZ2l0SHViSWNvbjtcblxuICBjb25zdCBhdXRob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMicpO1xuICBhdXRob3IuaW5uZXJUZXh0ID0gJ2pvcnRlZ2EyJztcblxuICBmb290ZXIuYXBwZW5kKGljb24pO1xuICBmb290ZXIuYXBwZW5kKGF1dGhvcik7XG5cbiAgZWxlbWVudC5hcHBlbmRDaGlsZChmb290ZXIpO1xufVxuIiwiaW1wb3J0ICcuL2luaXRpYWxQYWdlLmNzcyc7XG5pbXBvcnQgJy4vZ2xvYmFsLmNzcyc7XG5pbXBvcnQgZmFsbG91dExvZ28gZnJvbSAnLi9pbWdzL2ZhbGxvdXQucG5nJztcbmltcG9ydCBsb2NhdGlvbkltZyBmcm9tICcuL2ltZ3MvZGlhbW9uZGNpdHkuanBnJztcbmltcG9ydCBhYm91dCBmcm9tICcuL2Fib3V0LnR4dCc7XG5cbmZ1bmN0aW9uIGNyZWF0ZUhlYWRlcigpIHtcbiAgY29uc3QgaGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGhlYWRlci5jbGFzc0xpc3QuYWRkKCdoZWFkZXInKTtcbiAgaGVhZGVyLmNsYXNzTGlzdC5hZGQoJ2dsb3cnKTtcblxuICBjb25zdCB0aXRsZUJHID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHRpdGxlQkcuY2xhc3NMaXN0LmFkZCgnb3BhcXVlJyk7XG4gIHRpdGxlQkcudGV4dENvbnRlbnQgPSAnUG93ZXIgTm9vZGxlcyc7XG5cbiAgY29uc3QgbmF2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIG5hdi5jbGFzc0xpc3QuYWRkKCduYXZCYXInKTtcblxuICBjb25zdCBmYWxsb3V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gIGZhbGxvdXQuc3JjID0gZmFsbG91dExvZ287XG4gIGZhbGxvdXQuY2xhc3NMaXN0LmFkZCgndGl0bGVJbWcnKTtcblxuICBjb25zdCBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgYnV0dG9uLmNsYXNzTGlzdC5hZGQoJ25hdkJ1dHRvbicpO1xuICBidXR0b24udGV4dENvbnRlbnQgPSAnVmlldyB0aGUgTWVudSc7XG5cbiAgbmF2LmFwcGVuZENoaWxkKGZhbGxvdXQpO1xuICBuYXYuYXBwZW5kQ2hpbGQoYnV0dG9uKTtcblxuICBoZWFkZXIuYXBwZW5kKG5hdik7XG4gIGhlYWRlci5hcHBlbmQodGl0bGVCRyk7XG5cbiAgcmV0dXJuIGhlYWRlcjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWFwKCkge1xuICBjb25zdCBtYXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgbWFwLnNyYyA9IGxvY2F0aW9uSW1nO1xuICBtYXAuY2xhc3NMaXN0LmFkZCgnbWFwJyk7XG4gIG1hcC5jbGFzc0xpc3QuYWRkKCdnbG93Jyk7XG5cbiAgcmV0dXJuIG1hcDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSG91cnNUYWJsZSgpIHtcbiAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJyk7XG5cbiAgY29uc3QgY2FwdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhcHRpb24nKTtcbiAgY2FwdGlvbi50ZXh0Q29udGVudCA9ICdPUEVOSU5HIEhPVVJTJztcbiAgZWxlbWVudC5hcHBlbmRDaGlsZChjYXB0aW9uKTtcbiAgY29uc3QgZGF5cyA9IFsnTU9OJywgJ1RVRScsICdXRUQnLCAnVEhVJywgJ0ZSSScsICdTQVQnLCAnU1VOJ107XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCA3OyBpICs9IDEpIHtcbiAgICBjb25zdCBkYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuXG4gICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0aCcpO1xuICAgIGxhYmVsLmlubmVyVGV4dCA9IGRheXNbaV07XG5cbiAgICBjb25zdCBob3VycyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XG4gICAgaG91cnMuaW5uZXJUZXh0ID0gJzg6MDAgYS5tLiAtIDEwOjAwIHAubS4nO1xuXG4gICAgZGF5LmFwcGVuZChsYWJlbCk7XG4gICAgZGF5LmFwcGVuZChob3Vycyk7XG4gICAgZWxlbWVudC5hcHBlbmQoZGF5KTtcbiAgfVxuICByZXR1cm4gZWxlbWVudDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSG91cnMoKSB7XG4gIGNvbnN0IHN0b3JlSG91cnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgc3RvcmVIb3Vycy5jbGFzc0xpc3QuYWRkKCdzdG9yZUhvdXJzJyk7XG4gIHN0b3JlSG91cnMuY2xhc3NMaXN0LmFkZCgnZ2xvdycpO1xuXG4gIGNvbnN0IGhvdXJzVGFibGUgPSBjcmVhdGVIb3Vyc1RhYmxlKCk7XG5cbiAgc3RvcmVIb3Vycy5hcHBlbmQoaG91cnNUYWJsZSk7XG5cbiAgcmV0dXJuIHN0b3JlSG91cnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUluZm9ybWF0aW9uKCkge1xuICBjb25zdCBpbmZvcm1hdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBpbmZvcm1hdGlvbi5jbGFzc0xpc3QuYWRkKCdpbmZvcm1hdGlvbicpO1xuICBpbmZvcm1hdGlvbi5jbGFzc0xpc3QuYWRkKCdnbG93Jyk7XG5cbiAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMicpO1xuICB0aXRsZS5pbm5lclRleHQgPSAnRnJvbSB0aGUgV2lraSc7XG5cbiAgY29uc3QgaW5mbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgaW5mby5pbm5lclRleHQgPSBhYm91dDtcblxuICBpbmZvcm1hdGlvbi5hcHBlbmQodGl0bGUpO1xuICBpbmZvcm1hdGlvbi5hcHBlbmQoaW5mbyk7XG5cbiAgcmV0dXJuIGluZm9ybWF0aW9uO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVDcmVkaXRzKCkge1xuICBjb25zdCBjcmVkaXRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGNyZWRpdHMuY2xhc3NMaXN0LmFkZCgnZ2xvdycpO1xuICBjcmVkaXRzLmNsYXNzTGlzdC5hZGQoJ2NyZWRpdHMnKTtcblxuICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2gyJyk7XG4gIHRpdGxlLmlubmVyVGV4dCA9ICdDcmVkaXRzJztcblxuICBjb25zdCByZXN0YXVyYW50SW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gIHJlc3RhdXJhbnRJbWFnZS5ocmVmID0gJ2h0dHBzOi8vZmFsbG91dC5mYW5kb20uY29tL3dpa2kvUG93ZXJfTm9vZGxlcz9maWxlPUZPNF9QX05vb2RsZXNfVFYucG5nJztcbiAgcmVzdGF1cmFudEltYWdlLmlubmVyVGV4dCA9ICdLZGFycm93IGZvciB0aGUgbWFpbiBQb3dlciBOb29kbGVzIHNjcmVlbnNob3QuJztcblxuICBjb25zdCBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICBsb2dvLmhyZWYgPSAnaHR0cHM6Ly93d3cucG5nZmluZC5jb20vbXBuZy9vaHhKUmlfYWxsb3V0LWZhbGxvdXQtMi1mYWxsb3V0LXNoZWx0ZXItZmFsbG91dC00LWZhbGxvdXQvJztcbiAgbG9nby5pbm5lclRleHQgPSAncG5nZmluZCBmb3IgdGhlIEZhbGxvdXQgbG9nbyc7XG5cbiAgY29uc3QgbG9jYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gIGxvY2F0aW9uLmhyZWYgPSAnaHR0cHM6Ly9mYWxsb3V0LWFyY2hpdmUuZmFuZG9tLmNvbS93aWtpL0RpYW1vbmRfQ2l0eV9tYXJrZXQnO1xuICBsb2NhdGlvbi5pbm5lclRleHQgPSAnRmFsbG91dCA0IGZhbmRvbSBwYWdlIGZvciB0aGUgbG9jYXRpb24gaW1hZ2UgdXNlZCBvbiB0aGUgaG9tZSBwYWdlJztcblxuICBjb25zdCB3aWtpSW5mbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgd2lraUluZm8uaHJlZiA9ICdodHRwczovL2ZhbGxvdXQuZmFuZG9tLmNvbS93aWtpL1Bvd2VyX05vb2RsZXMnO1xuICB3aWtpSW5mby5pbm5lclRleHQgPSAnRmFsbG91dCA0IGZhbmRvbSBwYWdlIGZvciB0aGVpciBub3RlcyB0aGF0IHdlcmUgdXNlZCBpbiB0aGUgaW5mb3JtYXRpb24gc2VjdGlvbic7XG5cbiAgY29uc3QgY29uc3VtYWJsZXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gIGNvbnN1bWFibGVzLmhyZWYgPSAnaHR0cHM6Ly9mYWxsb3V0LmZhbmRvbS5jb20vd2lraS9GYWxsb3V0XzRfY29uc3VtYWJsZXMnO1xuICBjb25zdW1hYmxlcy5pbm5lclRleHQgPSAnRmFsbG91dCA0IGZhbmRvbSBwYWdlIGZvciB0aGUgZm9vZCBpbmZvcm1hdGlvbiB1c2VkIGluIHRoZSBtZW51IHBhZ2UnO1xuXG4gIGNvbnN0IGJldGhlc2RhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICBiZXRoZXNkYS5ocmVmID0gJ2h0dHBzOi8vZmFsbG91dC5iZXRoZXNkYS5uZXQvZW4vZ2FtZXMvZmFsbG91dC00JztcbiAgYmV0aGVzZGEuaW5uZXJUZXh0ID0gJ0JldGhlc2RhIGZvciBjcmVhdGluZyBGYWxsb3V0IDQnO1xuXG4gIGNyZWRpdHMuYXBwZW5kQ2hpbGQodGl0bGUpO1xuICBjcmVkaXRzLmFwcGVuZENoaWxkKGJldGhlc2RhKTtcbiAgY3JlZGl0cy5hcHBlbmRDaGlsZChyZXN0YXVyYW50SW1hZ2UpO1xuICBjcmVkaXRzLmFwcGVuZENoaWxkKGxvY2F0aW9uKTtcbiAgY3JlZGl0cy5hcHBlbmRDaGlsZCh3aWtpSW5mbyk7XG4gIGNyZWRpdHMuYXBwZW5kQ2hpbGQoY29uc3VtYWJsZXMpO1xuICBjcmVkaXRzLmFwcGVuZENoaWxkKGxvZ28pO1xuXG4gIHJldHVybiBjcmVkaXRzO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0aWFsUGFnZShlbGVtZW50KSB7XG4gIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZUhlYWRlcigpKTtcbiAgZWxlbWVudC5hcHBlbmQoY3JlYXRlTWFwKCkpO1xuICBlbGVtZW50LmFwcGVuZChjcmVhdGVIb3VycygpKTtcbiAgZWxlbWVudC5hcHBlbmQoY3JlYXRlSW5mb3JtYXRpb24oKSk7XG4gIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZUNyZWRpdHMoKSk7XG59XG4iLCJpbXBvcnQgJy4vZ2xvYmFsLmNzcyc7XG5pbXBvcnQgJy4vbWVudS5jc3MnO1xuaW1wb3J0IHsgZGF0YSB9IGZyb20gJ2Jyb3dzZXJzbGlzdCc7XG5pbXBvcnQgbWVudUl0ZW1zIGZyb20gJy4vbWVudS5jc3YnO1xuaW1wb3J0IGZhbGxvdXRMb2dvIGZyb20gJy4vaW1ncy9mYWxsb3V0LnBuZyc7XG5cbmZ1bmN0aW9uIGFkZE1lbnUoZWxlbWVudCkge1xuICAvLyB0YWJsZSBjYXB0aW9uXG4gIGNvbnN0IGNhcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYXB0aW9uJyk7XG4gIGNhcHRpb24uaW5uZXJUZXh0ID0gJ091ciBNZW51JztcblxuICBlbGVtZW50LmFwcGVuZENoaWxkKGNhcHRpb24pO1xuICAvLyBjcmVhdGUgcm93cyBvZiB0YWJsZVxuICBmb3IgKGxldCBpID0gMDsgaSA8IG1lbnVJdGVtcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgZWxlbWVudC5hcHBlbmRDaGlsZChyb3cpO1xuICB9XG5cbiAgY29uc3QgeyBjaGlsZHJlbiB9ID0gZWxlbWVudDtcblxuICAvLyBjcmVhdGUgaGVhZGVyIHJvd1xuICBmb3IgKGxldCBpID0gMDsgaSA8IG1lbnVJdGVtc1swXS5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IHRhYmxlSGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGgnKTtcbiAgICB0YWJsZUhlYWRlci5pbm5lclRleHQgPSBtZW51SXRlbXNbMF1baV07XG5cbiAgICBjaGlsZHJlblsxXS5hcHBlbmQodGFibGVIZWFkZXIpO1xuICB9XG5cbiAgLy8gY3JlYXRlIGRhdGEgY2VsbHNcbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBtZW51SXRlbXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IG1lbnVJdGVtc1tpXS5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgY29uc3QgZGF0YUNlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuICAgICAgZGF0YUNlbGwuaW5uZXJUZXh0ID0gbWVudUl0ZW1zW2ldW2pdO1xuICAgICAgY2hpbGRyZW5baSArIDFdLmFwcGVuZChkYXRhQ2VsbCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJvZHkoKSB7XG4gIGNvbnN0IG1lbnVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgbWVudUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdtZW51Q29udGFpbmVyJyk7XG4gIG1lbnVDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZ2xvdycpO1xuXG4gIGNvbnN0IG5hdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBuYXYuY2xhc3NMaXN0LmFkZCgnbmF2QmFyJyk7XG5cbiAgY29uc3QgZmFsbG91dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICBmYWxsb3V0LnNyYyA9IGZhbGxvdXRMb2dvO1xuICBmYWxsb3V0LmNsYXNzTGlzdC5hZGQoJ3RpdGxlSW1nJyk7XG5cbiAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCduYXZCdXR0b24nKTtcbiAgYnV0dG9uLnRleHRDb250ZW50ID0gJ1JldHVybiB0byBIb21lJztcblxuICBjb25zdCBtZW51ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGFibGUnKTtcbiAgbWVudS5jbGFzc0xpc3QuYWRkKCdtZW51Jyk7XG4gIGFkZE1lbnUobWVudSk7XG5cbiAgbmF2LmFwcGVuZENoaWxkKGZhbGxvdXQpO1xuICBuYXYuYXBwZW5kQ2hpbGQoYnV0dG9uKTtcblxuICBtZW51Q29udGFpbmVyLmFwcGVuZChuYXYpO1xuICBtZW51Q29udGFpbmVyLmFwcGVuZChtZW51KTtcblxuICByZXR1cm4gbWVudUNvbnRhaW5lcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlTWVudVBhZ2UoZWxlbWVudCkge1xuICBlbGVtZW50LmFwcGVuZENoaWxkKGNyZWF0ZUJvZHkoKSk7XG59XG4iLCIvKiAoaWdub3JlZCkgKi8iLCIvKiAoaWdub3JlZCkgKi8iLCIvKiBlcy1tb2R1bGUtbGV4ZXIgMC45LjMgKi9cbmNvbnN0IEE9MT09PW5ldyBVaW50OEFycmF5KG5ldyBVaW50MTZBcnJheShbMV0pLmJ1ZmZlcilbMF07ZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKEUsST1cIkBcIil7aWYoIUIpcmV0dXJuIGluaXQudGhlbigoKT0+cGFyc2UoRSkpO2NvbnN0IGc9RS5sZW5ndGgrMSxEPShCLl9faGVhcF9iYXNlLnZhbHVlfHxCLl9faGVhcF9iYXNlKSs0KmctQi5tZW1vcnkuYnVmZmVyLmJ5dGVMZW5ndGg7RD4wJiZCLm1lbW9yeS5ncm93KE1hdGguY2VpbChELzY1NTM2KSk7Y29uc3Qgdz1CLnNhKGctMSk7aWYoKEE/QzpRKShFLG5ldyBVaW50MTZBcnJheShCLm1lbW9yeS5idWZmZXIsdyxnKSksIUIucGFyc2UoKSl0aHJvdyBPYmplY3QuYXNzaWduKG5ldyBFcnJvcihgUGFyc2UgZXJyb3IgJHtJfToke0Uuc2xpY2UoMCxCLmUoKSkuc3BsaXQoXCJcXG5cIikubGVuZ3RofToke0IuZSgpLUUubGFzdEluZGV4T2YoXCJcXG5cIixCLmUoKS0xKX1gKSx7aWR4OkIuZSgpfSk7Y29uc3QgTD1bXSxrPVtdO2Zvcig7Qi5yaSgpOyl7Y29uc3QgQT1CLmlzKCksUT1CLmllKCksQz1CLmFpKCksST1CLmlkKCksZz1CLnNzKCksRD1CLnNlKCk7bGV0IHc7Qi5pcCgpJiYodz1KKEUuc2xpY2UoLTE9PT1JP0EtMTpBLC0xPT09ST9RKzE6USkpKSxMLnB1c2goe246dyxzOkEsZTpRLHNzOmcsc2U6RCxkOkksYTpDfSl9Zm9yKDtCLnJlKCk7KXtjb25zdCBBPUUuc2xpY2UoQi5lcygpLEIuZWUoKSksUT1BWzBdO2sucHVzaCgnXCInPT09UXx8XCInXCI9PT1RP0ooQSk6QSl9ZnVuY3Rpb24gSihBKXt0cnl7cmV0dXJuKDAsZXZhbCkoQSl9Y2F0Y2goQSl7fX1yZXR1cm5bTCxrLCEhQi5mKCldfWZ1bmN0aW9uIFEoQSxRKXtjb25zdCBDPUEubGVuZ3RoO2xldCBCPTA7Zm9yKDtCPEM7KXtjb25zdCBDPUEuY2hhckNvZGVBdChCKTtRW0IrK109KDI1NSZDKTw8OHxDPj4+OH19ZnVuY3Rpb24gQyhBLFEpe2NvbnN0IEM9QS5sZW5ndGg7bGV0IEI9MDtmb3IoO0I8QzspUVtCXT1BLmNoYXJDb2RlQXQoQisrKX1sZXQgQjtleHBvcnQgY29uc3QgaW5pdD1XZWJBc3NlbWJseS5jb21waWxlKChFPVwiQUdGemJRRUFBQUFCWEExZ0FYOEJmMkFFZjM5L2Z3QmdBbjkvQUdBQUFYOWdCbjkvZjM5L2Z3Ri9ZQUFBWUFGL0FHQUVmMzkvZndGL1lBTi9mMzhCZjJBSGYzOS9mMzkvZndGL1lBVi9mMzkvZndGL1lBSi9md0YvWUFoL2YzOS9mMzkvZndGL0F6RXdBQUVDQXdNREF3TURBd01EQXdNREF3QUFCQVVGQlFZRkJnQUFBQUFGQlFBRUJ3Z0pDZ3NNQUFJQUFBQUxBd2tNQkFVQmNBRUJBUVVEQVFBQkJnOENmd0ZCOFBBQUMzOEFRZkR3QUFzSFpCRUdiV1Z0YjNKNUFnQUNjMkVBQUFGbEFBTUNhWE1BQkFKcFpRQUZBbk56QUFZQ2MyVUFCd0poYVFBSUFtbGtBQWtDYVhBQUNnSmxjd0FMQW1WbEFBd0NjbWtBRFFKeVpRQU9BV1lBRHdWd1lYSnpaUUFRQzE5ZmFHVmhjRjlpWVhObEF3RUs4amt3YUFFQmYwRUFJQUEyQXJnSVFRQW9BcEFJSWdFZ0FFRUJkR29pQUVFQU93RUFRUUFnQUVFQ2FpSUFOZ0s4Q0VFQUlBQTJBc0FJUVFCQkFEWUNsQWhCQUVFQU5nS2tDRUVBUVFBMkFwd0lRUUJCQURZQ21BaEJBRUVBTmdLc0NFRUFRUUEyQXFBSUlBRUxzZ0VCQW45QkFDZ0NwQWdpQkVFY2FrR1VDQ0FFRzBFQUtBTEFDQ0lGTmdJQVFRQWdCVFlDcEFoQkFDQUVOZ0tvQ0VFQUlBVkJJR28yQXNBSUlBVWdBRFlDQ0FKQUFrQkJBQ2dDaUFnZ0EwY05BQ0FGSUFJMkFnd01BUXNDUUVFQUtBS0VDQ0FEUncwQUlBVWdBa0VDYWpZQ0RBd0JDeUFGUVFBb0FwQUlOZ0lNQ3lBRklBRTJBZ0FnQlNBRE5nSVVJQVZCQURZQ0VDQUZJQUkyQWdRZ0JVRUFOZ0ljSUFWQkFDZ0NoQWdnQTBZNkFCZ0xTQUVCZjBFQUtBS3NDQ0lDUVFocVFaZ0lJQUliUVFBb0FzQUlJZ0kyQWdCQkFDQUNOZ0tzQ0VFQUlBSkJER28yQXNBSUlBSkJBRFlDQ0NBQ0lBRTJBZ1FnQWlBQU5nSUFDd2dBUVFBb0FzUUlDeFVBUVFBb0Fwd0lLQUlBUVFBb0FwQUlhMEVCZFFzVkFFRUFLQUtjQ0NnQ0JFRUFLQUtRQ0d0QkFYVUxGUUJCQUNnQ25BZ29BZ2hCQUNnQ2tBaHJRUUYxQ3hVQVFRQW9BcHdJS0FJTVFRQW9BcEFJYTBFQmRRc2VBUUYvUVFBb0Fwd0lLQUlRSWdCQkFDZ0NrQWhyUVFGMVFYOGdBQnNMT3dFQmZ3SkFRUUFvQXB3SUtBSVVJZ0JCQUNnQ2hBaEhEUUJCZnc4TEFrQWdBRUVBS0FLSUNFY05BRUYrRHdzZ0FFRUFLQUtRQ0d0QkFYVUxDd0JCQUNnQ25BZ3RBQmdMRlFCQkFDZ0NvQWdvQWdCQkFDZ0NrQWhyUVFGMUN4VUFRUUFvQXFBSUtBSUVRUUFvQXBBSWEwRUJkUXNsQVFGL1FRQkJBQ2dDbkFnaUFFRWNha0dVQ0NBQUd5Z0NBQ0lBTmdLY0NDQUFRUUJIQ3lVQkFYOUJBRUVBS0FLZ0NDSUFRUWhxUVpnSUlBQWJLQUlBSWdBMkFxQUlJQUJCQUVjTENBQkJBQzBBeUFnTDlnc0JCSDhqQUVHQThBQnJJZ0VrQUVFQVFRRTZBTWdJUVFCQi8vOERPd0hPQ0VFQVFRQW9Bb3dJTmdMUUNFRUFRUUFvQXBBSVFYNXFJZ0kyQXVRSVFRQWdBa0VBS0FLNENFRUJkR29pQXpZQzZBaEJBRUVBT3dIS0NFRUFRUUE3QWN3SVFRQkJBRG9BMUFoQkFFRUFOZ0xFQ0VFQVFRQTZBTFFJUVFBZ0FVR0EwQUJxTmdMWUNFRUFJQUZCZ0JCcU5nTGNDRUVBUVFBNkFPQUlBa0FDUUFKQUFrQURRRUVBSUFKQkFtb2lCRFlDNUFnZ0FpQURUdzBCQWtBZ0JDOEJBQ0lEUVhkcVFRVkpEUUFDUUFKQUFrQUNRQUpBSUFOQm0zOXFEZ1VCQ0FnSUFnQUxJQU5CSUVZTkJDQURRUzlHRFFNZ0EwRTdSZzBDREFjTFFRQXZBY3dJRFFFZ0JCQVJSUTBCSUFKQkJHcEIrQUJCOEFCQjd3QkI4Z0JCOUFBUUVrVU5BUkFUUVFBdEFNZ0lEUUZCQUVFQUtBTGtDQ0lDTmdMUUNBd0hDeUFFRUJGRkRRQWdBa0VFYWtIdEFFSHdBRUh2QUVIeUFFSDBBQkFTUlEwQUVCUUxRUUJCQUNnQzVBZzJBdEFJREFFTEFrQWdBaThCQkNJRVFTcEdEUUFnQkVFdlJ3MEVFQlVNQVF0QkFSQVdDMEVBS0FMb0NDRURRUUFvQXVRSUlRSU1BQXNMUVFBaEF5QUVJUUpCQUMwQXRBZ05BZ3dCQzBFQUlBSTJBdVFJUVFCQkFEb0F5QWdMQTBCQkFDQUNRUUpxSWdRMkF1UUlBa0FDUUFKQUFrQUNRQUpBSUFKQkFDZ0M2QWhQRFFBZ0JDOEJBQ0lEUVhkcVFRVkpEUVVDUUFKQUFrQUNRQUpBQWtBQ1FBSkFBa0FDUUNBRFFXQnFEZ29QRGdnT0RnNE9Cd0VDQUFzQ1FBSkFBa0FDUUNBRFFhQi9hZzRLQ0JFUkF4RUJFUkVSQWdBTElBTkJoWDlxRGdNRkVBWUxDMEVBTHdITUNBMFBJQVFRRVVVTkR5QUNRUVJxUWZnQVFmQUFRZThBUWZJQVFmUUFFQkpGRFE4UUV3d1BDeUFFRUJGRkRRNGdBa0VFYWtIdEFFSHdBRUh2QUVIeUFFSDBBQkFTUlEwT0VCUU1EZ3NnQkJBUlJRME5JQUl2QVFwQjh3QkhEUTBnQWk4QkNFSHpBRWNORFNBQ0x3RUdRZUVBUncwTklBSXZBUVJCN0FCSERRMGdBaThCRENJRVFYZHFJZ0pCRjBzTkMwRUJJQUowUVorQWdBUnhSUTBMREF3TFFRQkJBQzhCekFnaUFrRUJhanNCekFoQkFDZ0MzQWdnQWtFQ2RHcEJBQ2dDMEFnMkFnQU1EQXRCQUM4QnpBZ2lBa1VOQ0VFQUlBSkJmMm9pQXpzQnpBaEJBQ2dDc0FnaUFrVU5DeUFDS0FJVVFRQW9BdHdJSUFOQi8vOERjVUVDZEdvb0FnQkhEUXNDUUNBQ0tBSUVEUUFnQWlBRU5nSUVDeUFDSUFRMkFneEJBRUVBTmdLd0NBd0xDd0pBUVFBb0F0QUlJZ1F2QVFCQktVY05BRUVBS0FLa0NDSUNSUTBBSUFJb0FnUWdCRWNOQUVFQVFRQW9BcWdJSWdJMkFxUUlBa0FnQWtVTkFDQUNRUUEyQWh3TUFRdEJBRUVBTmdLVUNBc2dBVUVBTHdITUNDSUNha0VBTFFEZ0NEb0FBRUVBSUFKQkFXbzdBY3dJUVFBb0F0d0lJQUpCQW5ScUlBUTJBZ0JCQUVFQU9nRGdDQXdLQzBFQUx3SE1DQ0lDUlEwR1FRQWdBa0YvYWlJRE93SE1DQ0FDUVFBdkFjNElJZ1JIRFFGQkFFRUFMd0hLQ0VGL2FpSUNPd0hLQ0VFQVFRQW9BdGdJSUFKQi8vOERjVUVCZEdvdkFRQTdBYzRJQ3hBWERBZ0xJQVJCLy84RFJnMEhJQU5CLy84RGNTQUVTUTBFREFjTFFTY1FHQXdHQzBFaUVCZ01CUXNnQTBFdlJ3MEVBa0FDUUNBQ0x3RUVJZ0pCS2tZTkFDQUNRUzlIRFFFUUZRd0hDMEVCRUJZTUJnc0NRQUpBQWtBQ1FFRUFLQUxRQ0NJRUx3RUFJZ0lRR1VVTkFBSkFBa0FDUUNBQ1FWVnFEZ1FCQlFJQUJRc2dCRUYrYWk4QkFFRlFha0gvL3dOeFFRcEpEUU1NQkFzZ0JFRithaThCQUVFclJnMENEQU1MSUFSQmZtb3ZBUUJCTFVZTkFRd0NDd0pBSUFKQi9RQkdEUUFnQWtFcFJ3MEJRUUFvQXR3SVFRQXZBY3dJUVFKMGFpZ0NBQkFhUlEwQkRBSUxRUUFvQXR3SVFRQXZBY3dJSWdOQkFuUnFLQUlBRUJzTkFTQUJJQU5xTFFBQURRRUxJQVFRSEEwQUlBSkZEUUJCQVNFRUlBSkJMMFpCQUMwQTFBaEJBRWR4UlEwQkN4QWRRUUFoQkF0QkFDQUVPZ0RVQ0F3RUMwRUFMd0hPQ0VILy93TkdRUUF2QWN3SVJYRkJBQzBBdEFoRmNTRUREQVlMRUI1QkFDRUREQVVMSUFSQm9BRkhEUUVMUVFCQkFUb0E0QWdMUVFCQkFDZ0M1QWcyQXRBSUMwRUFLQUxrQ0NFQ0RBQUxDeUFCUVlEd0FHb2tBQ0FEQ3gwQUFrQkJBQ2dDa0FnZ0FFY05BRUVCRHdzZ0FFRithaThCQUJBZkN6OEJBWDlCQUNFR0FrQWdBQzhCQ0NBRlJ3MEFJQUF2QVFZZ0JFY05BQ0FBTHdFRUlBTkhEUUFnQUM4QkFpQUNSdzBBSUFBdkFRQWdBVVloQmdzZ0JndlVCZ0VFZjBFQVFRQW9BdVFJSWdCQkRHb2lBVFlDNUFoQkFSQW5JUUlDUUFKQUFrQUNRQUpBUVFBb0F1UUlJZ01nQVVjTkFDQUNFQ3RGRFFFTEFrQUNRQUpBQWtBQ1FDQUNRWjkvYWc0TUJnRURDQUVIQVFFQkFRRUVBQXNDUUFKQUlBSkJLa1lOQUNBQ1FmWUFSZzBGSUFKQit3QkhEUUpCQUNBRFFRSnFOZ0xrQ0VFQkVDY2hBMEVBS0FMa0NDRUJBMEFDUUFKQUlBTkIvLzhEY1NJQ1FTSkdEUUFnQWtFblJnMEFJQUlRS2hwQkFDZ0M1QWdoQWd3QkN5QUNFQmhCQUVFQUtBTGtDRUVDYWlJQ05nTGtDQXRCQVJBbkdnSkFJQUVnQWhBc0lnTkJMRWNOQUVFQVFRQW9BdVFJUVFKcU5nTGtDRUVCRUNjaEF3dEJBQ2dDNUFnaEFnSkFJQU5CL1FCR0RRQWdBaUFCUmcwRklBSWhBU0FDUVFBb0F1Z0lUUTBCREFVTEMwRUFJQUpCQW1vMkF1UUlEQUVMUVFBZ0EwRUNhallDNUFoQkFSQW5Ha0VBS0FMa0NDSUNJQUlRTEJvTFFRRVFKeUVDQzBFQUtBTGtDQ0VEQWtBZ0FrSG1BRWNOQUNBREx3RUdRZTBBUncwQUlBTXZBUVJCN3dCSERRQWdBeThCQWtIeUFFY05BRUVBSUFOQkNHbzJBdVFJSUFCQkFSQW5FQ2dQQzBFQUlBTkJmbW8yQXVRSURBTUxFQjRQQ3dKQUlBTXZBUWhCOHdCSERRQWdBeThCQmtIekFFY05BQ0FETHdFRVFlRUFSdzBBSUFNdkFRSkI3QUJIRFFBZ0F5OEJDaEFmUlEwQVFRQWdBMEVLYWpZQzVBaEJBUkFuSVFKQkFDZ0M1QWdoQXlBQ0VDb2FJQU5CQUNnQzVBZ1FBa0VBUVFBb0F1UUlRWDVxTmdMa0NBOExRUUFnQTBFRWFpSUROZ0xrQ0F0QkFDQURRUVJxSWdJMkF1UUlRUUJCQURvQXlBZ0RRRUVBSUFKQkFtbzJBdVFJUVFFUUp5RURRUUFvQXVRSUlRSUNRQ0FERUNwQklISkIrd0JIRFFCQkFFRUFLQUxrQ0VGK2FqWUM1QWdQQzBFQUtBTGtDQ0lESUFKR0RRRWdBaUFERUFJQ1FFRUJFQ2NpQWtFc1JnMEFBa0FnQWtFOVJ3MEFRUUJCQUNnQzVBaEJmbW8yQXVRSUR3dEJBRUVBS0FMa0NFRithallDNUFnUEMwRUFLQUxrQ0NFQ0RBQUxDdzhMUVFBZ0EwRUthallDNUFoQkFSQW5Ha0VBS0FMa0NDRURDMEVBSUFOQkVHbzJBdVFJQWtCQkFSQW5JZ0pCS2tjTkFFRUFRUUFvQXVRSVFRSnFOZ0xrQ0VFQkVDY2hBZ3RCQUNnQzVBZ2hBeUFDRUNvYUlBTkJBQ2dDNUFnUUFrRUFRUUFvQXVRSVFYNXFOZ0xrQ0E4TElBTWdBMEVPYWhBQ0M2NEdBUVIvUVFCQkFDZ0M1QWdpQUVFTWFpSUJOZ0xrQ0FKQUFrQUNRQUpBQWtBQ1FBSkFBa0FDUUFKQVFRRVFKeUlDUVZscURnZ0NDQUVDQVFFQkJ3QUxJQUpCSWtZTkFTQUNRZnNBUmcwQ0MwRUFLQUxrQ0NBQlJnMEhDMEVBTHdITUNBMEJRUUFvQXVRSUlRSkJBQ2dDNkFnaEF3TkFJQUlnQTA4TkJBSkFBa0FnQWk4QkFDSUJRU2RHRFFBZ0FVRWlSdzBCQ3lBQUlBRVFLQThMUVFBZ0FrRUNhaUlDTmdMa0NBd0FDd3RCQUNnQzVBZ2hBa0VBTHdITUNBMEJBa0FEUUFKQUFrQUNRQ0FDUVFBb0F1Z0lUdzBBUVFFUUp5SUNRU0pHRFFFZ0FrRW5SZzBCSUFKQi9RQkhEUUpCQUVFQUtBTGtDRUVDYWpZQzVBZ0xRUUVRSnhwQkFDZ0M1QWdpQWk4QkJrSHRBRWNOQmlBQ0x3RUVRZThBUncwR0lBSXZBUUpCOGdCSERRWWdBaThCQUVIbUFFY05Ca0VBSUFKQkNHbzJBdVFJUVFFUUp5SUNRU0pHRFFNZ0FrRW5SZzBEREFZTElBSVFHQXRCQUVFQUtBTGtDRUVDYWlJQ05nTGtDQXdBQ3dzZ0FDQUNFQ2dNQlF0QkFFRUFLQUxrQ0VGK2FqWUM1QWdQQzBFQUlBSkJmbW8yQXVRSUR3c1FIZzhMUVFCQkFDZ0M1QWhCQW1vMkF1UUlRUUVRSjBIdEFFY05BVUVBS0FMa0NDSUNMd0VHUWVFQVJ3MEJJQUl2QVFSQjlBQkhEUUVnQWk4QkFrSGxBRWNOQVVFQUtBTFFDQzhCQUVFdVJnMEJJQUFnQUNBQ1FRaHFRUUFvQW9nSUVBRVBDMEVBS0FMY0NFRUFMd0hNQ0NJQ1FRSjBhaUFBTmdJQVFRQWdBa0VCYWpzQnpBaEJBQ2dDMEFndkFRQkJMa1lOQUNBQVFRQW9BdVFJUVFKcVFRQWdBQkFCUVFCQkFDZ0NwQWcyQXJBSVFRQkJBQ2dDNUFoQkFtbzJBdVFJQWtCQkFSQW5JZ0pCSWtZTkFDQUNRU2RHRFFCQkFFRUFLQUxrQ0VGK2FqWUM1QWdQQ3lBQ0VCaEJBRUVBS0FMa0NFRUNhallDNUFnQ1FBSkFBa0JCQVJBblFWZHFEZ1FCQWdJQUFndEJBQ2dDcEFoQkFDZ0M1QWdpQWpZQ0JFRUFJQUpCQW1vMkF1UUlRUUVRSnhwQkFDZ0NwQWdpQWtFQk9nQVlJQUpCQUNnQzVBZ2lBVFlDRUVFQUlBRkJmbW8yQXVRSUR3dEJBQ2dDcEFnaUFrRUJPZ0FZSUFKQkFDZ0M1QWdpQVRZQ0RDQUNJQUUyQWdSQkFFRUFMd0hNQ0VGL2Fqc0J6QWdQQzBFQVFRQW9BdVFJUVg1cU5nTGtDQThMQzBjQkEzOUJBQ2dDNUFoQkFtb2hBRUVBS0FMb0NDRUJBa0FEUUNBQUlnSkJmbW9nQVU4TkFTQUNRUUpxSVFBZ0FpOEJBRUYyYWc0RUFRQUFBUUFMQzBFQUlBSTJBdVFJQzVnQkFRTi9RUUJCQUNnQzVBZ2lBVUVDYWpZQzVBZ2dBVUVHYWlFQlFRQW9BdWdJSVFJRFFBSkFBa0FDUUNBQlFYeHFJQUpQRFFBZ0FVRithaThCQUNFREFrQUNRQ0FBRFFBZ0EwRXFSZzBCSUFOQmRtb09CQUlFQkFJRUN5QURRU3BIRFFNTElBRXZBUUJCTDBjTkFrRUFJQUZCZm1vMkF1UUlEQUVMSUFGQmZtb2hBUXRCQUNBQk5nTGtDQThMSUFGQkFtb2hBUXdBQ3d1L0FRRUVmMEVBS0FMa0NDRUFRUUFvQXVnSUlRRUNRQUpBQTBBZ0FDSUNRUUpxSVFBZ0FpQUJUdzBCQWtBQ1FDQUFMd0VBSWdOQnBIOXFEZ1VCQWdJQ0JBQUxJQU5CSkVjTkFTQUNMd0VFUWZzQVJ3MEJRUUJCQUM4QnlnZ2lBRUVCYWpzQnlnaEJBQ2dDMkFnZ0FFRUJkR3BCQUM4QnpnZzdBUUJCQUNBQ1FRUnFOZ0xrQ0VFQVFRQXZBY3dJUVFGcUlnQTdBYzRJUVFBZ0FEc0J6QWdQQ3lBQ1FRUnFJUUFNQUFzTFFRQWdBRFlDNUFnUUhnOExRUUFnQURZQzVBZ0xpQUVCQkg5QkFDZ0M1QWdoQVVFQUtBTG9DQ0VDQWtBQ1FBTkFJQUVpQTBFQ2FpRUJJQU1nQWs4TkFTQUJMd0VBSWdRZ0FFWU5BZ0pBSUFSQjNBQkdEUUFnQkVGMmFnNEVBZ0VCQWdFTElBTkJCR29oQVNBREx3RUVRUTFIRFFBZ0EwRUdhaUFCSUFNdkFRWkJDa1liSVFFTUFBc0xRUUFnQVRZQzVBZ1FIZzhMUVFBZ0FUWUM1QWdMYkFFQmZ3SkFBa0FnQUVGZmFpSUJRUVZMRFFCQkFTQUJkRUV4Y1EwQkN5QUFRVVpxUWYvL0EzRkJCa2tOQUNBQVFTbEhJQUJCV0dwQi8vOERjVUVIU1hFTkFBSkFJQUJCcFg5cURnUUJBQUFCQUFzZ0FFSDlBRWNnQUVHRmYycEIvLzhEY1VFRVNYRVBDMEVCQ3owQkFYOUJBU0VCQWtBZ0FFSDNBRUhvQUVIcEFFSHNBRUhsQUJBZ0RRQWdBRUhtQUVIdkFFSHlBQkFoRFFBZ0FFSHBBRUhtQUJBaUlRRUxJQUVMbXdFQkFuOUJBU0VCQWtBQ1FBSkFBa0FDUUFKQUlBQXZBUUFpQWtGRmFnNEVCUVFFQVFBTEFrQWdBa0diZjJvT0JBTUVCQUlBQ3lBQ1FTbEdEUVFnQWtINUFFY05BeUFBUVg1cVFlWUFRZWtBUWU0QVFlRUFRZXdBUWV3QUVDTVBDeUFBUVg1cUx3RUFRVDFHRHdzZ0FFRitha0hqQUVIaEFFSDBBRUhqQUJBa0R3c2dBRUYrYWtIbEFFSHNBRUh6QUJBaER3dEJBQ0VCQ3lBQkM5SURBUUovUVFBaEFRSkFBa0FDUUFKQUFrQUNRQUpBQWtBQ1FDQUFMd0VBUVp4L2FnNFVBQUVDQ0FnSUNBZ0lDQU1FQ0FnRkNBWUlDQWNJQ3dKQUFrQWdBRUYrYWk4QkFFR1hmMm9PQkFBSkNRRUpDeUFBUVh4cVFmWUFRZThBRUNJUEN5QUFRWHhxUWZrQVFla0FRZVVBRUNFUEN3SkFBa0FnQUVGK2FpOEJBRUdOZjJvT0FnQUJDQXNDUUNBQVFYeHFMd0VBSWdKQjRRQkdEUUFnQWtIc0FFY05DQ0FBUVhwcVFlVUFFQ1VQQ3lBQVFYcHFRZU1BRUNVUEN5QUFRWHhxUWVRQVFlVUFRZXdBUWVVQUVDUVBDeUFBUVg1cUx3RUFRZThBUncwRklBQkJmR292QVFCQjVRQkhEUVVDUUNBQVFYcHFMd0VBSWdKQjhBQkdEUUFnQWtIakFFY05CaUFBUVhocVFla0FRZTRBUWZNQVFmUUFRZUVBUWU0QUVDTVBDeUFBUVhocVFmUUFRZmtBRUNJUEMwRUJJUUVnQUVGK2FpSUFRZWtBRUNVTkJDQUFRZklBUWVVQVFmUUFRZlVBUWZJQUVDQVBDeUFBUVg1cVFlUUFFQ1VQQ3lBQVFYNXFRZVFBUWVVQVFlSUFRZlVBUWVjQVFlY0FRZVVBRUNZUEN5QUFRWDVxUWVFQVFmY0FRZUVBUWVrQUVDUVBDd0pBSUFCQmZtb3ZBUUFpQWtIdkFFWU5BQ0FDUWVVQVJ3MEJJQUJCZkdwQjdnQVFKUThMSUFCQmZHcEI5QUJCNkFCQjhnQVFJU0VCQ3lBQkMzQUJBbjhDUUFKQUEwQkJBRUVBS0FMa0NDSUFRUUpxSWdFMkF1UUlJQUJCQUNnQzZBaFBEUUVDUUFKQUFrQWdBUzhCQUNJQlFhVi9hZzRDQVFJQUN3SkFJQUZCZG1vT0JBUURBd1FBQ3lBQlFTOUhEUUlNQkFzUUxSb01BUXRCQUNBQVFRUnFOZ0xrQ0F3QUN3c1FIZ3NMTlFFQmYwRUFRUUU2QUxRSVFRQW9BdVFJSVFCQkFFRUFLQUxvQ0VFQ2FqWUM1QWhCQUNBQVFRQW9BcEFJYTBFQmRUWUN4QWdMTkFFQmYwRUJJUUVDUUNBQVFYZHFRZi8vQTNGQkJVa05BQ0FBUVlBQmNrR2dBVVlOQUNBQVFTNUhJQUFRSzNFaEFRc2dBUXRKQVFOL1FRQWhCZ0pBSUFCQmVHb2lCMEVBS0FLUUNDSUlTUTBBSUFjZ0FTQUNJQU1nQkNBRkVCSkZEUUFDUUNBSElBaEhEUUJCQVE4TElBQkJkbW92QVFBUUh5RUdDeUFHQzFrQkEzOUJBQ0VFQWtBZ0FFRjhhaUlGUVFBb0FwQUlJZ1pKRFFBZ0FDOEJBQ0FEUncwQUlBQkJmbW92QVFBZ0FrY05BQ0FGTHdFQUlBRkhEUUFDUUNBRklBWkhEUUJCQVE4TElBQkJlbW92QVFBUUh5RUVDeUFFQzB3QkEzOUJBQ0VEQWtBZ0FFRithaUlFUVFBb0FwQUlJZ1ZKRFFBZ0FDOEJBQ0FDUncwQUlBUXZBUUFnQVVjTkFBSkFJQVFnQlVjTkFFRUJEd3NnQUVGOGFpOEJBQkFmSVFNTElBTUxTd0VEZjBFQUlRY0NRQ0FBUVhacUlnaEJBQ2dDa0FnaUNVa05BQ0FJSUFFZ0FpQURJQVFnQlNBR0VDNUZEUUFDUUNBSUlBbEhEUUJCQVE4TElBQkJkR292QVFBUUh5RUhDeUFIQzJZQkEzOUJBQ0VGQWtBZ0FFRjZhaUlHUVFBb0FwQUlJZ2RKRFFBZ0FDOEJBQ0FFUncwQUlBQkJmbW92QVFBZ0EwY05BQ0FBUVh4cUx3RUFJQUpIRFFBZ0JpOEJBQ0FCUncwQUFrQWdCaUFIUncwQVFRRVBDeUFBUVhocUx3RUFFQjhoQlFzZ0JRczlBUUovUVFBaEFnSkFRUUFvQXBBSUlnTWdBRXNOQUNBQUx3RUFJQUZIRFFBQ1FDQURJQUJIRFFCQkFROExJQUJCZm1vdkFRQVFIeUVDQ3lBQ0MwMEJBMzlCQUNFSUFrQWdBRUYwYWlJSlFRQW9BcEFJSWdwSkRRQWdDU0FCSUFJZ0F5QUVJQVVnQmlBSEVDOUZEUUFDUUNBSklBcEhEUUJCQVE4TElBQkJjbW92QVFBUUh5RUlDeUFJQzV3QkFRTi9RUUFvQXVRSUlRRUNRQU5BQWtBQ1FDQUJMd0VBSWdKQkwwY05BQUpBSUFFdkFRSWlBVUVxUmcwQUlBRkJMMGNOQkJBVkRBSUxJQUFRRmd3QkN3SkFBa0FnQUVVTkFDQUNRWGRxSWdGQkYwc05BVUVCSUFGMFFaK0FnQVJ4UlEwQkRBSUxJQUlRS1VVTkF3d0JDeUFDUWFBQlJ3MENDMEVBUVFBb0F1UUlJZ05CQW1vaUFUWUM1QWdnQTBFQUtBTG9DRWtOQUFzTElBSUx5d01CQVg4Q1FDQUJRU0pHRFFBZ0FVRW5SZzBBRUI0UEMwRUFLQUxrQ0NFQ0lBRVFHQ0FBSUFKQkFtcEJBQ2dDNUFoQkFDZ0NoQWdRQVVFQVFRQW9BdVFJUVFKcU5nTGtDRUVBRUNjaEFFRUFLQUxrQ0NFQkFrQUNRQ0FBUWVFQVJ3MEFJQUZCQW1wQjh3QkI4d0JCNVFCQjhnQkI5QUFRRWcwQkMwRUFJQUZCZm1vMkF1UUlEd3RCQUNBQlFReHFOZ0xrQ0FKQVFRRVFKMEg3QUVZTkFFRUFJQUUyQXVRSUR3dEJBQ2dDNUFnaUFpRUFBMEJCQUNBQVFRSnFOZ0xrQ0FKQUFrQUNRRUVCRUNjaUFFRWlSZzBBSUFCQkowY05BVUVuRUJoQkFFRUFLQUxrQ0VFQ2FqWUM1QWhCQVJBbklRQU1BZ3RCSWhBWVFRQkJBQ2dDNUFoQkFtbzJBdVFJUVFFUUp5RUFEQUVMSUFBUUtpRUFDd0pBSUFCQk9rWU5BRUVBSUFFMkF1UUlEd3RCQUVFQUtBTGtDRUVDYWpZQzVBZ0NRRUVCRUNjaUFFRWlSZzBBSUFCQkowWU5BRUVBSUFFMkF1UUlEd3NnQUJBWVFRQkJBQ2dDNUFoQkFtbzJBdVFJQWtBQ1FFRUJFQ2NpQUVFc1JnMEFJQUJCL1FCR0RRRkJBQ0FCTmdMa0NBOExRUUJCQUNnQzVBaEJBbW8yQXVRSVFRRVFKMEg5QUVZTkFFRUFLQUxrQ0NFQURBRUxDMEVBS0FLa0NDSUJJQUkyQWhBZ0FVRUFLQUxrQ0VFQ2FqWUNEQXN3QVFGL0FrQUNRQ0FBUVhkcUlnRkJGMHNOQUVFQklBRjBRWTJBZ0FSeERRRUxJQUJCb0FGR0RRQkJBQThMUVFFTGJRRUNmd0pBQWtBRFFBSkFJQUJCLy84RGNTSUJRWGRxSWdKQkYwc05BRUVCSUFKMFFaK0FnQVJ4RFFJTElBRkJvQUZHRFFFZ0FDRUNJQUVRS3cwQ1FRQWhBa0VBUVFBb0F1UUlJZ0JCQW1vMkF1UUlJQUF2QVFJaUFBMEFEQUlMQ3lBQUlRSUxJQUpCLy84RGNRdG9BUUovUVFFaEFRSkFBa0FnQUVGZmFpSUNRUVZMRFFCQkFTQUNkRUV4Y1EwQkN5QUFRZmovQTNGQktFWU5BQ0FBUVVacVFmLy9BM0ZCQmtrTkFBSkFJQUJCcFg5cUlnSkJBMHNOQUNBQ1FRRkhEUUVMSUFCQmhYOXFRZi8vQTNGQkJFa2hBUXNnQVF1TEFRRUNmd0pBUVFBb0F1UUlJZ0l2QVFBaUEwSGhBRWNOQUVFQUlBSkJCR28yQXVRSVFRRVFKeUVDUVFBb0F1UUlJUUFDUUFKQUlBSkJJa1lOQUNBQ1FTZEdEUUFnQWhBcUdrRUFLQUxrQ0NFQkRBRUxJQUlRR0VFQVFRQW9BdVFJUVFKcUlnRTJBdVFJQzBFQkVDY2hBMEVBS0FMa0NDRUNDd0pBSUFJZ0FFWU5BQ0FBSUFFUUFnc2dBd3R5QVFSL1FRQW9BdVFJSVFCQkFDZ0M2QWdoQVFKQUFrQURRQ0FBUVFKcUlRSWdBQ0FCVHcwQkFrQUNRQ0FDTHdFQUlnTkJwSDlxRGdJQkJBQUxJQUloQUNBRFFYWnFEZ1FDQVFFQ0FRc2dBRUVFYWlFQURBQUxDMEVBSUFJMkF1UUlFQjVCQUE4TFFRQWdBallDNUFoQjNRQUxTUUVCZjBFQUlRY0NRQ0FBTHdFS0lBWkhEUUFnQUM4QkNDQUZSdzBBSUFBdkFRWWdCRWNOQUNBQUx3RUVJQU5IRFFBZ0FDOEJBaUFDUncwQUlBQXZBUUFnQVVZaEJ3c2dCd3RUQVFGL1FRQWhDQUpBSUFBdkFRd2dCMGNOQUNBQUx3RUtJQVpIRFFBZ0FDOEJDQ0FGUncwQUlBQXZBUVlnQkVjTkFDQUFMd0VFSUFOSERRQWdBQzhCQWlBQ1J3MEFJQUF2QVFBZ0FVWWhDQXNnQ0FzTEh3SUFRWUFJQ3dJQUFBQkJoQWdMRUFFQUFBQUNBQUFBQUFRQUFIQTRBQUE9XCIsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIEJ1ZmZlcj9CdWZmZXIuZnJvbShFLFwiYmFzZTY0XCIpOlVpbnQ4QXJyYXkuZnJvbShhdG9iKEUpLEE9PkEuY2hhckNvZGVBdCgwKSkpKS50aGVuKFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKS50aGVuKCh7ZXhwb3J0czpBfSk9PntCPUF9KTt2YXIgRTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdGlkOiBtb2R1bGVJZCxcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuLy8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbl9fd2VicGFja19yZXF1aXJlX18ubSA9IF9fd2VicGFja19tb2R1bGVzX187XG5cbiIsIi8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSAobW9kdWxlKSA9PiB7XG5cdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuXHRcdCgpID0+IChtb2R1bGVbJ2RlZmF1bHQnXSkgOlxuXHRcdCgpID0+IChtb2R1bGUpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCB7IGE6IGdldHRlciB9KTtcblx0cmV0dXJuIGdldHRlcjtcbn07IiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5nID0gKGZ1bmN0aW9uKCkge1xuXHRpZiAodHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnKSByZXR1cm4gZ2xvYmFsVGhpcztcblx0dHJ5IHtcblx0XHRyZXR1cm4gdGhpcyB8fCBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JykgcmV0dXJuIHdpbmRvdztcblx0fVxufSkoKTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwidmFyIHNjcmlwdFVybDtcbmlmIChfX3dlYnBhY2tfcmVxdWlyZV9fLmcuaW1wb3J0U2NyaXB0cykgc2NyaXB0VXJsID0gX193ZWJwYWNrX3JlcXVpcmVfXy5nLmxvY2F0aW9uICsgXCJcIjtcbnZhciBkb2N1bWVudCA9IF9fd2VicGFja19yZXF1aXJlX18uZy5kb2N1bWVudDtcbmlmICghc2NyaXB0VXJsICYmIGRvY3VtZW50KSB7XG5cdGlmIChkb2N1bWVudC5jdXJyZW50U2NyaXB0KVxuXHRcdHNjcmlwdFVybCA9IGRvY3VtZW50LmN1cnJlbnRTY3JpcHQuc3JjXG5cdGlmICghc2NyaXB0VXJsKSB7XG5cdFx0dmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNjcmlwdFwiKTtcblx0XHRpZihzY3JpcHRzLmxlbmd0aCkgc2NyaXB0VXJsID0gc2NyaXB0c1tzY3JpcHRzLmxlbmd0aCAtIDFdLnNyY1xuXHR9XG59XG4vLyBXaGVuIHN1cHBvcnRpbmcgYnJvd3NlcnMgd2hlcmUgYW4gYXV0b21hdGljIHB1YmxpY1BhdGggaXMgbm90IHN1cHBvcnRlZCB5b3UgbXVzdCBzcGVjaWZ5IGFuIG91dHB1dC5wdWJsaWNQYXRoIG1hbnVhbGx5IHZpYSBjb25maWd1cmF0aW9uXG4vLyBvciBwYXNzIGFuIGVtcHR5IHN0cmluZyAoXCJcIikgYW5kIHNldCB0aGUgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gdmFyaWFibGUgZnJvbSB5b3VyIGNvZGUgdG8gdXNlIHlvdXIgb3duIGxvZ2ljLlxuaWYgKCFzY3JpcHRVcmwpIHRocm93IG5ldyBFcnJvcihcIkF1dG9tYXRpYyBwdWJsaWNQYXRoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyXCIpO1xuc2NyaXB0VXJsID0gc2NyaXB0VXJsLnJlcGxhY2UoLyMuKiQvLCBcIlwiKS5yZXBsYWNlKC9cXD8uKiQvLCBcIlwiKS5yZXBsYWNlKC9cXC9bXlxcL10rJC8sIFwiL1wiKTtcbl9fd2VicGFja19yZXF1aXJlX18ucCA9IHNjcmlwdFVybDsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLmIgPSBkb2N1bWVudC5iYXNlVVJJIHx8IHNlbGYubG9jYXRpb24uaHJlZjtcblxuLy8gb2JqZWN0IHRvIHN0b3JlIGxvYWRlZCBhbmQgbG9hZGluZyBjaHVua3Ncbi8vIHVuZGVmaW5lZCA9IGNodW5rIG5vdCBsb2FkZWQsIG51bGwgPSBjaHVuayBwcmVsb2FkZWQvcHJlZmV0Y2hlZFxuLy8gW3Jlc29sdmUsIHJlamVjdCwgUHJvbWlzZV0gPSBjaHVuayBsb2FkaW5nLCAwID0gY2h1bmsgbG9hZGVkXG52YXIgaW5zdGFsbGVkQ2h1bmtzID0ge1xuXHRcIm1haW5cIjogMFxufTtcblxuLy8gbm8gY2h1bmsgb24gZGVtYW5kIGxvYWRpbmdcblxuLy8gbm8gcHJlZmV0Y2hpbmdcblxuLy8gbm8gcHJlbG9hZGVkXG5cbi8vIG5vIEhNUlxuXG4vLyBubyBITVIgbWFuaWZlc3RcblxuLy8gbm8gb24gY2h1bmtzIGxvYWRlZFxuXG4vLyBubyBqc29ucCBmdW5jdGlvbiIsIl9fd2VicGFja19yZXF1aXJlX18ubmMgPSB1bmRlZmluZWQ7IiwiaW1wb3J0IHsgaW5pdCB9IGZyb20gJ2VzLW1vZHVsZS1sZXhlcic7XG5pbXBvcnQgeyBzZXQgfSBmcm9tICdpbnRlcm5hbC1zbG90JztcbmltcG9ydCBpbml0aWFsUGFnZSBmcm9tICcuL2luaXRpYWxwYWdlJztcbmltcG9ydCBjcmVhdGVGb290ZXIgZnJvbSAnLi9mb290ZXInO1xuaW1wb3J0IGNyZWF0ZU1lbnUgZnJvbSAnLi9tZW51JztcblxuY29uc3Qgd2ViUGFnZSA9ICgoKSA9PiB7XG4gIGNvbnN0IGNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY29udGVudCcpO1xuICBsZXQgYnV0dG9uO1xuXG4gIGNvbnN0IGNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnRlbnQuaW5uZXJUZXh0ID0gJyc7XG4gIH07XG5cbiAgY29uc3Qgc2V0SG9tZVBhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgY2xlYXIoKTtcbiAgICBpbml0aWFsUGFnZShjb250ZW50KTtcbiAgICBjcmVhdGVGb290ZXIoY29udGVudCk7XG4gICAgYnV0dG9uVG9nZ2xlKHRydWUpO1xuICB9O1xuXG4gIGNvbnN0IHNldE1lbnVQYWdlID0gZnVuY3Rpb24gKCkge1xuICAgIGNsZWFyKCk7XG4gICAgY3JlYXRlTWVudShjb250ZW50KTtcbiAgICBjcmVhdGVGb290ZXIoY29udGVudCk7XG4gICAgYnV0dG9uVG9nZ2xlKGZhbHNlKTtcbiAgfTtcblxuICBjb25zdCBidXR0b25Ub2dnbGUgPSBmdW5jdGlvbiAoZnJvbUhvbWUpIHtcbiAgICBidXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubmF2QnV0dG9uJyk7XG4gICAgaWYgKGZyb21Ib21lKSB7XG4gICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBzZXRNZW51UGFnZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHNldEhvbWVQYWdlKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gZGVmYXVsdFxuICBzZXRIb21lUGFnZSgpO1xuXG4gIGJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5uYXZCdXR0b24nKTtcbiAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgc2V0TWVudVBhZ2UpO1xufSkoKTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==