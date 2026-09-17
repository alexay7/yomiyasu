import SwiftUI

struct ReaderSettingsView: View {
    /// Los tomos sin mokuro no tienen texto OCR ni diccionario por toque.
    var showsOCR = true

    @Environment(AppEnvironment.self) private var environment
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        @Bindable var reader = environment.readerSettings
        @Bindable var settings = environment.settings

        NavigationStack {
            Form {
                Section("Navegación") {
                    Toggle("Derecha a izquierda (RTL)", isOn: $reader.r2l)
                    Toggle("Doble página", isOn: $reader.doublePage)
                    Toggle("La primera página es portada", isOn: $reader.hasCover)
                    Toggle("Deslizar para cambiar de página", isOn: $reader.scrollChange)
                }

                Section("Zoom") {
                    Picker("Modo de zoom", selection: $reader.defaultZoomMode) {
                        ForEach(ZoomMode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    Toggle("Pan y zoom", isOn: $reader.panAndZoom)
                }

                if showsOCR {
                    Section {
                        Toggle("Mostrar texto OCR", isOn: $reader.displayOCR)
                        Toggle("Bordes de las cajas", isOn: $reader.textBoxBorders)
                        Toggle("Mantener texto al tocar", isOn: $reader.toggleOCRTextBoxes)

                        Picker("Fuente", selection: $reader.font) {
                            ForEach(ReaderFont.allCases) { font in
                                Text(font.title).tag(font)
                            }
                        }

                        VStack(alignment: .leading) {
                            HStack {
                                Text("Tamaño de fuente")
                                Spacer()
                                Text(reader.fontSize > 0 ? "\(Int(reader.fontSize)) pt" : "Auto")
                                    .foregroundStyle(.secondary)
                            }
                            Slider(value: $reader.fontSize, in: 0...60, step: 1)
                        }
                    } header: {
                        Text("Texto OCR")
                    } footer: {
                        Text("El tamaño «Auto» usa el de cada caja de texto.")
                    }

                    Section("Diccionario") {
                        Toggle("Diccionario nativo", isOn: $reader.nativeDictionary)

                        Picker("Búsqueda", selection: $reader.dictionaryVersion) {
                            ForEach(DictionaryLookupMode.allCases) { mode in
                                Text(mode.title).tag(mode)
                            }
                        }
                        .pickerStyle(.segmented)
                        .disabled(!reader.nativeDictionary)
                    }
                }

                Section {
                    Picker("Escritura", selection: $reader.novelWritingMode) {
                        ForEach(NovelWritingMode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }

                    Toggle("Desplazamiento continuo", isOn: $reader.novelScroll)

                    Picker("Tema", selection: $reader.novelTheme) {
                        ForEach(NovelTheme.allCases) { theme in
                            Text(theme.title).tag(theme)
                        }
                    }

                    Picker("Fuente", selection: $reader.novelFont) {
                        ForEach(NovelFont.allCases) { font in
                            Text(font.title).tag(font)
                        }
                    }

                    VStack(alignment: .leading) {
                        HStack {
                            Text("Tamaño de fuente")
                            Spacer()
                            Text("\(Int(reader.novelFontSize)) %")
                                .foregroundStyle(.secondary)
                        }
                        Slider(value: $reader.novelFontSize, in: 60...200, step: 5)
                    }
                } header: {
                    Text("Novelas")
                } footer: {
                    Text("«Automático» usa la escritura del propio libro (vertical u horizontal).")
                }

                Section("Cronómetro") {
                    Toggle("Iniciar automáticamente al abrir", isOn: $settings.autoCrono)
                }            }
            .navigationTitle("Ajustes del lector")
            .navigationBarTitleDisplayMode(.inline)
            .accessibilityIdentifier("readerSettings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Hecho") {
                        dismiss()
                    }
                }
            }
        }
    }
}
