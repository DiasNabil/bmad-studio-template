const crypto = require('crypto');

/**
 * Cache de configuration intelligent pour les agents BMAD
 * Optimise les performances et réduit les temps de configuration
 */
class AgentConfigCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 128;
    this.ttl = options.ttl || 30 * 60 * 1000; // 30 minutes en millisecondes
    this.cache = new Map();
    this.accessTimes = new Map();
    this.hitRateTracker = new HitRateTracker();
    
    // Configuration des politiques de cache
    this.policies = {
      eviction: 'lru', // least recently used
      compression: false, // À implémenter si nécessaire
      persistence: false // À implémenter si nécessaire
    };
  }

  /**
   * Récupère une configuration depuis le cache
   * @param {Object} projectProfile - Profil du projet
   * @returns {Object|null} Configuration mise en cache ou null
   */
  async getCachedConfiguration(projectProfile) {
    const cacheKey = this.generateCacheKey(projectProfile);
    
    if (this.cache.has(cacheKey)) {
      const cachedItem = this.cache.get(cacheKey);
      
      // Vérifier si l'élément n'a pas expiré
      if (this.isValid(cachedItem)) {
        this.updateAccessTime(cacheKey);
        this.hitRateTracker.recordHit();
        
        console.log(`⚡ Configuration trouvée dans le cache (clé: ${cacheKey.substring(0, 8)}...)`);
        return cachedItem.data;
      } else {
        // Supprimer l'élément expiré
        this.cache.delete(cacheKey);
        this.accessTimes.delete(cacheKey);
        console.log(`🕒 Configuration expirée supprimée du cache`);
      }
    }

    this.hitRateTracker.recordMiss();
    return null;
  }

  /**
   * Met en cache une configuration
   * @param {Object} projectProfile - Profil du projet
   * @param {Object} configuration - Configuration à mettre en cache
   */
  async setCachedConfiguration(projectProfile, configuration) {
    const cacheKey = this.generateCacheKey(projectProfile);
    
    // Vérifier si le cache est plein et appliquer la politique d'éviction
    if (this.cache.size >= this.maxSize && !this.cache.has(cacheKey)) {
      this.evictItems(1);
    }

    const cacheItem = {
      data: configuration,
      timestamp: Date.now(),
      ttl: this.ttl,
      metadata: {
        projectDomain: this.extractProjectDomain(projectProfile),
        complexity: projectProfile.business?.complexity || 'moderate',
        agentCount: configuration.agents ? Object.keys(configuration.agents).length : 0
      }
    };

    this.cache.set(cacheKey, cacheItem);
    this.updateAccessTime(cacheKey);
    
    console.log(`💾 Configuration mise en cache (clé: ${cacheKey.substring(0, 8)}..., ${cacheItem.metadata.agentCount} agents)`);
    
    // Nettoyer les éléments expirés périodiquement
    this.scheduleCleanup();
  }

  /**
   * Génère une clé de cache unique pour un profil de projet
   * @param {Object} projectProfile - Profil du projet
   * @returns {string} Clé de cache
   */
  generateCacheKey(projectProfile) {
    const keyComponents = [
      projectProfile.context?.domain || 'unknown',
      projectProfile.business?.complexity || 'moderate',
      projectProfile.technical?.stack?.join(',') || 'default',
      projectProfile.business?.project_types?.sort().join(',') || 'web_app',
      projectProfile.context?.cultural_requirements ? 'cultural' : '',
      projectProfile.context?.payment_integration ? 'payment' : '',
      projectProfile.technical?.security_requirements ? 'security' : ''
    ];
    
    const keyString = keyComponents.filter(Boolean).join('|');
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Vérifie si un élément du cache est encore valide
   * @param {Object} cacheItem - Élément du cache
   * @returns {boolean} True si valide, false sinon
   */
  isValid(cacheItem) {
    const age = Date.now() - cacheItem.timestamp;
    return age < cacheItem.ttl;
  }

  /**
   * Met à jour le temps d'accès pour un élément
   * @param {string} cacheKey - Clé de cache
   */
  updateAccessTime(cacheKey) {
    this.accessTimes.set(cacheKey, Date.now());
  }

  /**
   * Évince des éléments du cache selon la politique configurée
   * @param {number} count - Nombre d'éléments à évincer
   */
  evictItems(count = 1) {
    if (this.policies.eviction === 'lru') {
      this.evictLRU(count);
    } else if (this.policies.eviction === 'lfu') {
      this.evictLFU(count);
    }
  }

  /**
   * Éviction LRU (Least Recently Used)
   * @param {number} count - Nombre d'éléments à évincer
   */
  evictLRU(count) {
    const sortedByAccess = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, count);

    for (const [key] of sortedByAccess) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      console.log(`🗑️  Éviction LRU: suppression de la clé ${key.substring(0, 8)}...`);
    }
  }

  /**
   * Éviction LFU (Least Frequently Used) - implémentation simplifiée
   * @param {number} count - Nombre d'éléments à évincer
   */
  evictLFU(count) {
    // Pour cette implémentation simplifiée, on utilise LRU
    this.evictLRU(count);
  }

  /**
   * Nettoie les éléments expirés du cache
   */
  cleanupExpired() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, item] of this.cache.entries()) {
      if (!this.isValid(item)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`🧹 Nettoyage: ${expiredKeys.length} éléments expirés supprimés`);
    }
  }

  /**
   * Programme un nettoyage périodique
   */
  scheduleCleanup() {
    // Nettoyer toutes les 5 minutes
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpired();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Extrait le domaine du projet pour les métadonnées
   * @param {Object} projectProfile - Profil du projet
   * @returns {string} Domaine du projet
   */
  extractProjectDomain(projectProfile) {
    return projectProfile.context?.domain || 
           projectProfile.business?.project_types?.[0] || 
           'web_app';
  }

  /**
   * Préchauffe le cache avec des configurations communes
   * @param {Array} commonProfiles - Profils de projet communs
   */
  async warmupCache(commonProfiles = []) {
    console.log('🔥 Préchauffage du cache...');
    
    const defaultProfiles = [
      {
        context: { domain: 'marketplace' },
        business: { complexity: 'moderate' },
        technical: { stack: ['nextjs', 'odoo'] }
      },
      {
        context: { domain: 'web_app' },
        business: { complexity: 'simple' },
        technical: { stack: ['react'] }
      },
      {
        context: { domain: 'saas' },
        business: { complexity: 'complex' },
        technical: { stack: ['nodejs', 'postgresql'] }
      }
    ];

    const profilesToWarmup = [...defaultProfiles, ...commonProfiles];
    
    for (const profile of profilesToWarmup) {
      try {
        // Générer une configuration de base pour ce profil
        const mockConfig = this.generateMockConfiguration(profile);
        await this.setCachedConfiguration(profile, mockConfig);
      } catch (error) {
        console.warn(`⚠️  Échec du préchauffage pour un profil:`, error.message);
      }
    }
    
    console.log(`✅ Cache préchauffé avec ${profilesToWarmup.length} configurations`);
  }

  /**
   * Génère une configuration fictive pour le préchauffage
   * @param {Object} profile - Profil du projet
   * @returns {Object} Configuration fictive
   */
  generateMockConfiguration(profile) {
    const domain = profile.context?.domain || 'web_app';
    const complexity = profile.business?.complexity || 'moderate';

    const baseAgents = {
      'bmad-orchestrator': { enabled: true, priority: 'high' },
      'bmad-analyst': { enabled: true, priority: 'medium' }
    };

    // Ajouter des agents selon le domaine
    if (domain === 'marketplace') {
      baseAgents['bmad-marketplace-architect'] = { enabled: true, priority: 'high' };
      baseAgents['bmad-cultural-expert'] = { enabled: true, priority: 'medium' };
      baseAgents['bmad-payment-specialist'] = { enabled: true, priority: 'high' };
    } else if (domain === 'saas') {
      baseAgents['bmad-saas-architect'] = { enabled: true, priority: 'high' };
      baseAgents['bmad-security-expert'] = { enabled: true, priority: 'high' };
    }

    if (complexity === 'complex') {
      baseAgents['bmad-devops-engineer'] = { enabled: true, priority: 'medium' };
      baseAgents['bmad-performance-expert'] = { enabled: true, priority: 'medium' };
    }

    return {
      agents: baseAgents,
      workflows: {
        [`${domain}-setup`]: { enabled: true }
      },
      metadata: {
        generated: new Date().toISOString(),
        domain: domain,
        complexity: complexity,
        cached: true
      }
    };
  }

  /**
   * Invalide le cache pour un profil spécifique
   * @param {Object} projectProfile - Profil du projet
   */
  invalidateConfiguration(projectProfile) {
    const cacheKey = this.generateCacheKey(projectProfile);
    
    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
      this.accessTimes.delete(cacheKey);
      console.log(`🗑️  Configuration invalidée (clé: ${cacheKey.substring(0, 8)}...)`);
    }
  }

  /**
   * Vide complètement le cache
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessTimes.clear();
    console.log(`🧽 Cache vidé (${size} éléments supprimés)`);
  }

  /**
   * Retourne les statistiques du cache
   * @returns {Object} Statistiques du cache
   */
  getStats() {
    const hitRate = this.hitRateTracker.getHitRate();
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: hitRate,
      totalHits: this.hitRateTracker.hits,
      totalMisses: this.hitRateTracker.misses,
      totalRequests: this.hitRateTracker.hits + this.hitRateTracker.misses,
      oldestItem: this.getOldestItemAge(),
      newestItem: this.getNewestItemAge()
    };
  }

  /**
   * Récupère l'âge du plus ancien élément en cache
   * @returns {number} Âge en millisecondes
   */
  getOldestItemAge() {
    let oldest = Infinity;
    const now = Date.now();
    
    for (const item of this.cache.values()) {
      const age = now - item.timestamp;
      if (age < oldest) {
        oldest = age;
      }
    }
    
    return oldest === Infinity ? 0 : oldest;
  }

  /**
   * Récupère l'âge du plus récent élément en cache
   * @returns {number} Âge en millisecondes
   */
  getNewestItemAge() {
    let newest = 0;
    const now = Date.now();
    
    for (const item of this.cache.values()) {
      const age = now - item.timestamp;
      if (age > newest) {
        newest = age;
      }
    }
    
    return newest;
  }

  /**
   * Exporte les configurations en cache
   * @returns {Array} Configurations exportées
   */
  exportCache() {
    const exported = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (this.isValid(item)) {
        exported.push({
          key: key,
          data: item.data,
          metadata: item.metadata,
          age: Date.now() - item.timestamp
        });
      }
    }
    
    return exported;
  }

  /**
   * Arrête le nettoyage périodique
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearCache();
  }
}

/**
 * Tracker du taux de réussite du cache
 */
class HitRateTracker {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.history = [];
    this.windowSize = 100; // Garder les 100 derniers accès pour les stats
  }

  /**
   * Enregistre un hit (succès de cache)
   */
  recordHit() {
    this.hits++;
    this.history.push({ type: 'hit', timestamp: Date.now() });
    this.trimHistory();
  }

  /**
   * Enregistre un miss (échec de cache)
   */
  recordMiss() {
    this.misses++;
    this.history.push({ type: 'miss', timestamp: Date.now() });
    this.trimHistory();
  }

  /**
   * Calcule le taux de réussite du cache
   * @returns {number} Taux de réussite entre 0 et 1
   */
  getHitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  /**
   * Calcule le taux de réussite sur une fenêtre récente
   * @returns {number} Taux de réussite récent
   */
  getRecentHitRate() {
    if (this.history.length === 0) {
      return 0;
    }
    
    const recentHits = this.history.filter(entry => entry.type === 'hit').length;
    return recentHits / this.history.length;
  }

  /**
   * Limite la taille de l'historique
   */
  trimHistory() {
    if (this.history.length > this.windowSize) {
      this.history = this.history.slice(-this.windowSize);
    }
  }

  /**
   * Remet à zéro les statistiques
   */
  reset() {
    this.hits = 0;
    this.misses = 0;
    this.history = [];
  }
}

module.exports = { AgentConfigCache };