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
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}