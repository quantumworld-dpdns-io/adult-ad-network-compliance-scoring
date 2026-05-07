import 'dotenv/config';
import { NotificationService } from './service.js';

async function bootstrap() {
  const service = new NotificationService();
  
  try {
    await service.connect();
    console.log('Notification service connected to Kafka.');
    
    await service.start();
    console.log('Notification service started listening for events.');
    
    process.on('SIGTERM', async () => {
      console.log('Shutting down notification service...');
      await service.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start notification service:', error);
    process.exit(1);
  }
}

bootstrap();
