package es.manabe.yomiyasu.core.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import es.manabe.yomiyasu.core.session.SecureTokenStore
import es.manabe.yomiyasu.core.session.TokenStore
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class AppModule {

    @Binds
    @Singleton
    abstract fun bindTokenStore(impl: SecureTokenStore): TokenStore
}
