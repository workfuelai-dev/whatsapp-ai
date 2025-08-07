-- Esquema inicial para la aplicación WhatsApp AI

-- Tabla para almacenar mensajes de chat
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    whatsapp_id VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    message_text TEXT NOT NULL,
    message_id VARCHAR(255) UNIQUE,
    timestamp VARCHAR(50),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    phone_number_id VARCHAR(50),
    is_ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Tabla para configuración de chats
CREATE TABLE IF NOT EXISTS chat_configurations (
    id BIGSERIAL PRIMARY KEY,
    whatsapp_id VARCHAR(50) UNIQUE NOT NULL,
    contact_name VARCHAR(255),
    ai_enabled BOOLEAN DEFAULT true,
    ai_prompt TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_chat_messages_whatsapp_id ON chat_messages(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_direction ON chat_messages(direction);
CREATE INDEX IF NOT EXISTS idx_chat_configurations_whatsapp_id ON chat_configurations(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_chat_configurations_last_activity ON chat_configurations(last_activity);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_configurations_updated_at ON chat_configurations;
CREATE TRIGGER update_chat_configurations_updated_at 
    BEFORE UPDATE ON chat_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar contador de mensajes no leídos
CREATE OR REPLACE FUNCTION update_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.direction = 'incoming' THEN
        INSERT INTO chat_configurations (whatsapp_id, contact_name, unread_count, last_activity)
        VALUES (NEW.whatsapp_id, NEW.contact_name, 1, NEW.created_at)
        ON CONFLICT (whatsapp_id) 
        DO UPDATE SET 
            unread_count = chat_configurations.unread_count + 1,
            last_activity = NEW.created_at,
            contact_name = COALESCE(NEW.contact_name, chat_configurations.contact_name);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar contador automáticamente
DROP TRIGGER IF EXISTS update_unread_count_trigger ON chat_messages;
CREATE TRIGGER update_unread_count_trigger
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_unread_count();

-- Configuración de Row Level Security (RLS) - Opcional para mayor seguridad
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_configurations ENABLE ROW LEVEL SECURITY;

-- Política que permite todo el acceso (ya que usamos autenticación personalizada)
DROP POLICY IF EXISTS "Allow all access to chat_messages" ON chat_messages;
CREATE POLICY "Allow all access to chat_messages" ON chat_messages FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to chat_configurations" ON chat_configurations;
CREATE POLICY "Allow all access to chat_configurations" ON chat_configurations FOR ALL USING (true);

-- Insertar configuración inicial de ejemplo
INSERT INTO chat_configurations (whatsapp_id, contact_name, ai_enabled, ai_prompt) 
VALUES ('example_user', 'Usuario de Ejemplo', true, 'Eres un asistente de atención al cliente amigable y profesional.')
ON CONFLICT (whatsapp_id) DO NOTHING;