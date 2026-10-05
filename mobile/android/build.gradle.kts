allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory = rootProject.layout.buildDirectory.dir("../../build").get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    project.evaluationDependsOn(":app")
}

// ---------------------------------------------------------------------------
// Force every Android subproject (including plugin subprojects like :jni
// from mobile_scanner) to compile against SDK 36, which is installed on this
// machine. Avoids requiring Android SDK Platform 35.
//
// Uses plugins.withId(...) instead of afterEvaluate(...) because the
// evaluationDependsOn block above causes projects to be evaluated before
// afterEvaluate can be attached.
// ---------------------------------------------------------------------------
subprojects {
    listOf("com.android.application", "com.android.library").forEach { pluginId ->
        plugins.withId(pluginId) {
            extensions.findByName("android")?.let { ext ->
                ext.javaClass.methods
                    .filter { m ->
                        m.parameterCount == 1 &&
                        (m.name == "setCompileSdkVersion" ||
                         m.name == "setCompileSdk")
                    }
                    .forEach { m ->
                        try { m.invoke(ext, 36) } catch (_: Throwable) { }
                    }
            }
        }
    }
    plugins.withId("com.android.library") {
        if (!plugins.hasPlugin("org.jetbrains.kotlin.android")) {
            try {
                plugins.apply("org.jetbrains.kotlin.android")
            } catch (_: Throwable) { }
        }
    }
    tasks.matching { it.name.contains("Kotlin") }.configureEach {
        try {
            val compilerOptions = this.javaClass.getMethod("getCompilerOptions").invoke(this)
            val jvmTarget = compilerOptions.javaClass.getMethod("getJvmTarget").invoke(compilerOptions)
            val jvmTargetEnum = Class.forName("org.jetbrains.kotlin.gradle.dsl.JvmTarget").getField("JVM_17").get(null)
            jvmTarget.javaClass.getMethod("set", Object::class.java).invoke(jvmTarget, jvmTargetEnum)
        } catch (_: Throwable) {
            try {
                val kotlinOptions = this.javaClass.getMethod("getKotlinOptions").invoke(this)
                kotlinOptions.javaClass.getMethod("setJvmTarget", String::class.java).invoke(kotlinOptions, "17")
            } catch (_: Throwable) { }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}