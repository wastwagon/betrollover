-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: smartpickspro_local
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accumulator_picks`
--

DROP TABLE IF EXISTS `accumulator_picks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accumulator_picks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `accumulator_id` int(11) NOT NULL,
  `match_type` enum('league','international') DEFAULT 'league',
  `home_team_type` enum('club','national') DEFAULT 'club',
  `away_team_type` enum('club','national') DEFAULT 'club',
  `match_description` varchar(255) NOT NULL,
  `prediction` varchar(100) NOT NULL,
  `odds` decimal(10,3) NOT NULL,
  `result` enum('pending','won','lost','void') DEFAULT 'pending',
  `match_date` datetime DEFAULT NULL,
  `match_time` time DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `accumulator_id` (`accumulator_id`),
  CONSTRAINT `accumulator_picks_ibfk_1` FOREIGN KEY (`accumulator_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accumulator_picks`
--

LOCK TABLES `accumulator_picks` WRITE;
/*!40000 ALTER TABLE `accumulator_picks` DISABLE KEYS */;
INSERT INTO `accumulator_picks` VALUES (1,6,'league','club','club','Emelec vs Delfín','BTTS Yes',2.100,'pending','2025-10-27 15:30:00','15:30:00','2025-10-26 22:00:12','2025-10-28 11:37:28'),(2,7,'league','club','club','Ararat-Armenia vs FC Noah','Over 2.5',1.360,'won','2025-10-27 15:00:00','15:00:00','2025-10-27 14:44:52','2025-10-28 11:41:39'),(3,7,'league','club','club','Moreirense vs FC Porto','Over 2.5',1.700,'won','2025-10-27 20:15:00','20:15:00','2025-10-27 14:44:52','2025-10-28 11:41:39'),(4,9,'league','club','club','Borussia Mönchengladbach vs Karlsruher SC','Over 2.5',1.610,'won','2025-10-28 19:45:00','19:45:00','2025-10-27 22:23:39','2025-10-28 21:56:55'),(5,10,'league','club','club','Borussia Mönchengladbach vs Karlsruher SC','Over 2.5',1.600,'won','2025-10-28 19:45:00','19:45:00','2025-10-27 22:48:52','2025-10-28 21:57:21'),(7,17,'league','club','club','Thun vs Winterthur','1',1.350,'won','2025-10-28 19:30:00','19:30:00','2025-10-28 20:42:14','2025-10-28 21:58:45'),(8,17,'league','club','club','Al Qadsiah vs Al Hazem','1',1.270,'won','2025-10-28 16:00:00','16:00:00','2025-10-28 20:42:14','2025-10-28 21:58:46'),(9,18,'league','club','club','OGC Nice vs Lille OSC','Over 2.5',1.770,'lost','2025-10-29 18:34:00','18:34:00','2025-10-29 00:34:39','2025-10-30 12:54:34'),(10,19,'league','club','club','Le Havre AC vs Stade Brestois 29','Over 1.5',1.330,'lost','2025-10-29 18:00:00','18:00:00','2025-10-29 12:31:10','2025-10-30 14:28:13'),(11,19,'league','club','club','Venezia vs Südtirol','Over 1.5',1.340,'won','2025-10-29 19:30:00','19:30:00','2025-10-29 12:31:10','2025-10-30 14:28:13'),(12,20,'league','club','club','Portimonense vs Torreense','Over 1.5',1.270,'pending','2025-10-30 18:00:00','18:00:00','2025-10-30 14:25:32','2025-10-30 14:25:32'),(13,20,'league','club','club','Benfica B vs Paços de Ferreira','Over 1.5',1.310,'pending','2025-10-30 18:00:00','18:00:00','2025-10-30 14:25:32','2025-10-30 14:25:32'),(14,21,'league','club','club','Pisa vs Lazio','X2',1.290,'pending','2025-10-30 19:45:00','19:45:00','2025-10-30 14:47:52','2025-10-30 14:47:52'),(15,21,'league','club','club','Sparta Rotterdam vs FC Groningen','1X',1.510,'pending','2025-10-30 19:00:00','19:00:00','2025-10-30 14:47:52','2025-10-30 14:47:52'),(16,22,'league','club','club','Roda JC vs FC Twente','Over 2.5',1.500,'won','2025-10-30 20:00:00','20:00:00','2025-10-30 15:14:11','2025-10-30 21:18:36'),(17,23,'league','club','club','Celta Vigo vs Barcelona','Over 2.5',1.500,'won','2025-11-14 18:00:00','18:00:00','2025-11-14 17:33:34','2025-11-14 18:19:45'),(18,24,'league','club','club','Mallorca vs Getafe','Over 2.5',1.600,'lost','2025-11-14 22:00:00','22:00:00','2025-11-14 21:54:33','2025-11-14 22:07:06'),(19,25,'international','national','national','Poland vs Netherlands','2',1.660,'pending','2025-11-14 23:55:00','23:55:00','2025-11-14 23:51:22','2025-11-14 23:51:22');
/*!40000 ALTER TABLE `accumulator_picks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accumulator_tickets`
--

DROP TABLE IF EXISTS `accumulator_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accumulator_tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `buyer_id` int(11) DEFAULT NULL,
  `purchase_price` decimal(10,2) DEFAULT NULL,
  `purchased_at` datetime DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `sport` varchar(100) DEFAULT 'Football',
  `home_country_id` int(11) DEFAULT NULL,
  `home_team_id` int(11) DEFAULT NULL,
  `away_country_id` int(11) DEFAULT NULL,
  `away_team_id` int(11) DEFAULT NULL,
  `total_picks` int(11) NOT NULL DEFAULT 1,
  `total_odds` decimal(10,3) NOT NULL DEFAULT 1.000,
  `price` decimal(8,2) DEFAULT 0.00,
  `status` enum('active','won','lost','void','pending','cancelled','pending_approval') DEFAULT 'pending_approval',
  `result` enum('pending','won','lost','void') DEFAULT 'pending',
  `is_marketplace` tinyint(1) DEFAULT 0,
  `confidence_level` int(3) DEFAULT 75,
  `views` int(11) DEFAULT 0,
  `purchases` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `like_count` int(11) DEFAULT 0,
  `share_count` int(11) DEFAULT 0,
  `comment_count` int(11) DEFAULT 0,
  `view_count` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_marketplace` (`is_marketplace`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_like_count` (`like_count`),
  KEY `idx_share_count` (`share_count`),
  KEY `fk_acc_home_country` (`home_country_id`),
  KEY `fk_acc_home_team` (`home_team_id`),
  KEY `fk_acc_away_country` (`away_country_id`),
  KEY `fk_acc_away_team` (`away_team_id`),
  CONSTRAINT `accumulator_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_acc_away_country` FOREIGN KEY (`away_country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_acc_away_team` FOREIGN KEY (`away_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_acc_home_country` FOREIGN KEY (`home_country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_acc_home_team` FOREIGN KEY (`home_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accumulator_tickets`
--

LOCK TABLES `accumulator_tickets` WRITE;
/*!40000 ALTER TABLE `accumulator_tickets` DISABLE KEYS */;
INSERT INTO `accumulator_tickets` VALUES (6,4,NULL,NULL,NULL,'2025-10-27 01:43:06','BET 1','N/A','Football',NULL,NULL,NULL,NULL,1,2.100,10.00,'lost','lost',0,75,0,0,'2025-10-26 22:00:12','2025-10-27 01:43:06',0,0,0,0),(7,4,NULL,NULL,NULL,'2025-10-28 11:41:39','ACCA01','N/A','Football',NULL,NULL,NULL,NULL,1,2.312,0.00,'won','won',0,75,0,0,'2025-10-27 14:44:52','2025-10-28 11:41:39',0,0,0,0),(9,7,NULL,NULL,NULL,'2025-10-28 21:56:55','Single Pick','N/A','Football',NULL,NULL,NULL,NULL,1,1.610,0.00,'won','won',0,75,0,0,'2025-10-27 22:23:39','2025-10-28 22:33:05',0,0,0,0),(10,7,NULL,NULL,NULL,'2025-10-28 21:57:21','Banker','Banker','Football',NULL,NULL,NULL,NULL,1,1.600,0.00,'won','won',0,75,0,0,'2025-10-27 22:48:52','2025-10-28 21:57:21',0,0,0,0),(17,7,NULL,NULL,NULL,'2025-10-28 21:58:46','Banker Game','Banker Game','Football',NULL,NULL,NULL,NULL,1,1.715,0.00,'won','won',1,75,0,0,'2025-10-28 20:42:14','2025-10-28 22:33:05',0,0,0,0),(18,7,NULL,NULL,NULL,'2025-10-30 12:54:34','DAY 1','RollOver Day 1','Football',NULL,NULL,NULL,NULL,1,1.770,0.00,'lost','lost',0,75,0,0,'2025-10-29 00:34:39','2025-10-30 12:54:34',0,0,0,0),(19,8,NULL,NULL,NULL,'2025-10-30 14:28:13','BET29/10/25','Try Something','Football',NULL,NULL,NULL,NULL,1,1.000,0.00,'lost','lost',0,75,0,0,'2025-10-29 12:31:10','2025-10-30 14:28:13',0,0,0,0),(20,8,NULL,NULL,NULL,NULL,'BET/30/10/25','Try Something','Football',11,768,11,773,2,1.664,0.00,'active','pending',1,75,0,0,'2025-10-30 14:25:32','2025-11-14 17:40:02',0,0,0,0),(21,7,NULL,NULL,NULL,NULL,'Sure Win','We\'re Winning','Football',4,286,4,266,2,1.948,10.00,'active','pending',1,90,0,0,'2025-10-30 14:47:52','2025-11-14 17:40:02',0,0,0,0),(22,7,NULL,NULL,NULL,'2025-10-30 21:18:36','Single Sure Win','Single Sure Win','Football',12,823,12,805,1,1.500,20.00,'won','won',0,90,0,0,'2025-10-30 15:14:11','2025-10-30 21:18:36',0,0,0,0),(23,7,NULL,NULL,NULL,'2025-11-14 18:19:45','Sure +2.5','Banker','Football',2,120,2,107,1,1.500,50.00,'won','won',1,75,0,0,'2025-11-14 17:33:34','2025-11-14 18:19:45',0,0,0,0),(24,4,NULL,NULL,NULL,'2025-11-14 22:07:06','Over 2.5','Try Something','Football',2,141,2,132,1,1.600,50.00,'lost','lost',1,80,0,0,'2025-11-14 21:54:33','2025-11-14 22:07:06',0,0,0,0),(25,4,NULL,NULL,NULL,NULL,'DAILY 2 ODDS','Try Something','Football',NULL,NULL,NULL,NULL,1,1.660,50.00,'active','pending',1,80,0,0,'2025-11-14 23:51:22','2025-11-14 23:53:07',0,0,0,0);
/*!40000 ALTER TABLE `accumulator_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_logs`
--

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `badges`
--

DROP TABLE IF EXISTS `badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `badges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `color` varchar(20) DEFAULT '#DC2626',
  `criteria` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`criteria`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `badges`
--

LOCK TABLES `badges` WRITE;
/*!40000 ALTER TABLE `badges` DISABLE KEYS */;
INSERT INTO `badges` VALUES (1,'First Pick','Created your first pick','fas fa-star','#DC2626','{\"picks_created\": 1}',1,'2025-10-26 01:10:30'),(2,'Rising Star','Created 10 picks','fas fa-rocket','#059669','{\"picks_created\": 10}',1,'2025-10-26 01:10:30'),(3,'Expert Tipster','Created 50 picks','fas fa-crown','#F59E0B','{\"picks_created\": 50}',1,'2025-10-26 01:10:30'),(4,'Social Butterfly','Followed 10 users','fas fa-users','#3B82F6','{\"follows_count\": 10}',1,'2025-10-26 01:10:30'),(5,'Popular','Received 100 likes','fas fa-heart','#EF4444','{\"likes_received\": 100}',1,'2025-10-26 01:10:30'),(6,'Analyst','Achieved 80% success rate','fas fa-chart-line','#8B5CF6','{\"success_rate\": 80}',1,'2025-10-26 01:10:30'),(7,'Champion','Won a contest','fas fa-trophy','#F59E0B','{\"contests_won\": 1}',1,'2025-10-26 01:10:30'),(8,'Mentor','Became a mentor','fas fa-graduation-cap','#10B981','{\"is_mentor\": true}',1,'2025-10-26 01:10:30'),(9,'5 Win Streak','Won 5 picks in a row','fas fa-fire','#dc3545',NULL,1,'2025-10-26 02:55:53'),(10,'Top Tipster','Ranked in top 10 tipsters','fas fa-trophy','#ffc107',NULL,1,'2025-10-26 02:55:53'),(11,'Verified Tipster','Successfully verified tipster','fas fa-check-circle','#17a2b8',NULL,1,'2025-10-26 02:55:53');
/*!40000 ALTER TABLE `badges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_flagged` tinyint(1) DEFAULT 0,
  `is_deleted` tinyint(1) DEFAULT 0,
  `type` enum('text','image','emoji') DEFAULT 'text',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `is_public` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `message_type` enum('text','image','emoji') DEFAULT 'text',
  `image_url` varchar(255) DEFAULT NULL,
  `is_edited` tinyint(1) DEFAULT 0,
  `edited_at` datetime DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `reaction_count` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_public` (`is_public`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_message_type` (`message_type`),
  KEY `idx_parent_id` (`parent_id`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,1,'Welcome to SmartPicks Pro!',0,0,'text',NULL,1,'2025-10-26 11:37:58','text',NULL,0,NULL,NULL,0),(2,1,'Welcome to SmartPicks Pro!',0,0,'text',NULL,1,'2025-10-26 11:38:34','text',NULL,0,NULL,NULL,0),(3,1,'Test message from admin',0,0,'text',NULL,1,'2025-10-27 01:08:40','text',NULL,0,NULL,NULL,0),(4,1,'Test message from admin',0,0,'text',NULL,1,'2025-10-27 01:08:41','text',NULL,0,NULL,NULL,0),(5,7,'hello',0,0,'text',NULL,1,'2025-10-27 01:12:27','text',NULL,0,NULL,NULL,0),(6,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:12:46','text',NULL,0,NULL,NULL,0),(7,7,'hello',0,0,'text',NULL,1,'2025-10-27 01:13:10','text',NULL,0,NULL,NULL,0),(8,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:13:16','text',NULL,0,NULL,NULL,0),(9,7,'hello',0,0,'text',NULL,1,'2025-10-27 01:13:44','text',NULL,0,NULL,NULL,0),(10,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:13:47','text',NULL,0,NULL,NULL,0),(11,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:14:18','text',NULL,0,NULL,NULL,0),(12,7,'hello',0,0,'text',NULL,1,'2025-10-27 01:14:49','text',NULL,0,NULL,NULL,0),(13,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:14:49','text',NULL,0,NULL,NULL,0),(14,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:15:20','text',NULL,0,NULL,NULL,0),(15,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:15:51','text',NULL,0,NULL,NULL,0),(16,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:16:22','text',NULL,0,NULL,NULL,0),(17,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:16:53','text',NULL,0,NULL,NULL,0),(18,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:17:24','text',NULL,0,NULL,NULL,0),(19,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:17:55','text',NULL,0,NULL,NULL,0),(20,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:18:26','text',NULL,0,NULL,NULL,0),(21,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:18:57','text',NULL,0,NULL,NULL,0),(22,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:19:28','text',NULL,0,NULL,NULL,0),(23,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:19:59','text',NULL,0,NULL,NULL,0),(24,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:20:30','text',NULL,0,NULL,NULL,0),(25,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:21:01','text',NULL,0,NULL,NULL,0),(26,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:21:32','text',NULL,0,NULL,NULL,0),(27,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:22:03','text',NULL,0,NULL,NULL,0),(28,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:22:34','text',NULL,0,NULL,NULL,0),(29,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:23:05','text',NULL,0,NULL,NULL,0),(30,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:23:36','text',NULL,0,NULL,NULL,0),(31,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:24:07','text',NULL,0,NULL,NULL,0),(32,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:24:38','text',NULL,0,NULL,NULL,0),(33,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:25:09','text',NULL,0,NULL,NULL,0),(34,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:25:40','text',NULL,0,NULL,NULL,0),(35,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:26:11','text',NULL,0,NULL,NULL,0),(36,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:26:42','text',NULL,0,NULL,NULL,0),(37,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:27:13','text',NULL,0,NULL,NULL,0),(38,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:27:44','text',NULL,0,NULL,NULL,0),(39,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:28:16','text',NULL,0,NULL,NULL,0),(40,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:28:46','text',NULL,0,NULL,NULL,0),(41,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:29:17','text',NULL,0,NULL,NULL,0),(42,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:29:48','text',NULL,0,NULL,NULL,0),(43,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:30:19','text',NULL,0,NULL,NULL,0),(44,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:30:50','text',NULL,0,NULL,NULL,0),(45,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:31:21','text',NULL,0,NULL,NULL,0),(46,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:31:52','text',NULL,0,NULL,NULL,0),(47,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:32:23','text',NULL,0,NULL,NULL,0),(48,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:32:54','text',NULL,0,NULL,NULL,0),(49,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:33:25','text',NULL,0,NULL,NULL,0),(50,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:33:56','text',NULL,0,NULL,NULL,0),(51,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:34:27','text',NULL,0,NULL,NULL,0),(52,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:34:58','text',NULL,0,NULL,NULL,0),(53,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:35:29','text',NULL,0,NULL,NULL,0),(54,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:36:00','text',NULL,0,NULL,NULL,0),(55,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:36:31','text',NULL,0,NULL,NULL,0),(56,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:37:02','text',NULL,0,NULL,NULL,0),(57,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:37:33','text',NULL,0,NULL,NULL,0),(58,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:38:04','text',NULL,0,NULL,NULL,0),(59,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:38:35','text',NULL,0,NULL,NULL,0),(60,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:39:06','text',NULL,0,NULL,NULL,0),(61,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:39:37','text',NULL,0,NULL,NULL,0),(62,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:40:08','text',NULL,0,NULL,NULL,0),(63,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:40:39','text',NULL,0,NULL,NULL,0),(64,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:41:10','text',NULL,0,NULL,NULL,0),(65,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:41:41','text',NULL,0,NULL,NULL,0),(66,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:42:12','text',NULL,0,NULL,NULL,0),(67,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:42:43','text',NULL,0,NULL,NULL,0),(68,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:43:14','text',NULL,0,NULL,NULL,0),(69,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:43:45','text',NULL,0,NULL,NULL,0),(70,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:44:16','text',NULL,0,NULL,NULL,0),(71,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:44:47','text',NULL,0,NULL,NULL,0),(72,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:45:18','text',NULL,0,NULL,NULL,0),(73,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:45:49','text',NULL,0,NULL,NULL,0),(74,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:46:20','text',NULL,0,NULL,NULL,0),(75,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:46:51','text',NULL,0,NULL,NULL,0),(76,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:47:22','text',NULL,0,NULL,NULL,0),(77,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:47:53','text',NULL,0,NULL,NULL,0),(78,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:48:24','text',NULL,0,NULL,NULL,0),(79,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:48:55','text',NULL,0,NULL,NULL,0),(80,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:49:26','text',NULL,0,NULL,NULL,0),(81,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:49:57','text',NULL,0,NULL,NULL,0),(82,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:50:28','text',NULL,0,NULL,NULL,0),(83,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:50:59','text',NULL,0,NULL,NULL,0),(84,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:51:30','text',NULL,0,NULL,NULL,0),(85,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:52:01','text',NULL,0,NULL,NULL,0),(86,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:52:32','text',NULL,0,NULL,NULL,0),(87,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:53:03','text',NULL,0,NULL,NULL,0),(88,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:53:34','text',NULL,0,NULL,NULL,0),(89,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:54:05','text',NULL,0,NULL,NULL,0),(90,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:54:36','text',NULL,0,NULL,NULL,0),(91,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:55:07','text',NULL,0,NULL,NULL,0),(92,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:55:38','text',NULL,0,NULL,NULL,0),(93,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:56:09','text',NULL,0,NULL,NULL,0),(94,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:56:40','text',NULL,0,NULL,NULL,0),(95,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:57:11','text',NULL,0,NULL,NULL,0),(96,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:57:42','text',NULL,0,NULL,NULL,0),(97,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:58:13','text',NULL,0,NULL,NULL,0),(98,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:58:44','text',NULL,0,NULL,NULL,0),(99,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:59:15','text',NULL,0,NULL,NULL,0),(100,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 01:59:46','text',NULL,0,NULL,NULL,0),(101,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:00:17','text',NULL,0,NULL,NULL,0),(102,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:00:48','text',NULL,0,NULL,NULL,0),(103,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:01:19','text',NULL,0,NULL,NULL,0),(104,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:01:50','text',NULL,0,NULL,NULL,0),(105,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:02:21','text',NULL,0,NULL,NULL,0),(106,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:02:52','text',NULL,0,NULL,NULL,0),(107,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:03:23','text',NULL,0,NULL,NULL,0),(108,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:03:54','text',NULL,0,NULL,NULL,0),(109,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:04:25','text',NULL,0,NULL,NULL,0),(110,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:04:56','text',NULL,0,NULL,NULL,0),(111,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:05:27','text',NULL,0,NULL,NULL,0),(112,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:05:58','text',NULL,0,NULL,NULL,0),(113,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:06:29','text',NULL,0,NULL,NULL,0),(114,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:07:00','text',NULL,0,NULL,NULL,0),(115,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:07:31','text',NULL,0,NULL,NULL,0),(116,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:08:02','text',NULL,0,NULL,NULL,0),(117,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:08:33','text',NULL,0,NULL,NULL,0),(118,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:09:04','text',NULL,0,NULL,NULL,0),(119,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:09:35','text',NULL,0,NULL,NULL,0),(120,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:10:06','text',NULL,0,NULL,NULL,0),(121,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:10:37','text',NULL,0,NULL,NULL,0),(122,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:11:08','text',NULL,0,NULL,NULL,0),(123,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:11:39','text',NULL,0,NULL,NULL,0),(124,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:12:10','text',NULL,0,NULL,NULL,0),(125,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:12:41','text',NULL,0,NULL,NULL,0),(126,4,'hi flygonpiorest',0,0,'text',NULL,1,'2025-10-27 02:13:12','text',NULL,0,NULL,NULL,0),(127,7,'Welcome to SmartPicks Pro Chat! 🎉',0,0,'text',NULL,1,'2025-10-28 23:54:52','text',NULL,0,NULL,NULL,0),(128,7,'This is a real-time community chat for all users.',0,0,'text',NULL,1,'2025-10-28 23:54:52','text',NULL,0,NULL,NULL,0),(129,7,'Share your thoughts, tips, and experiences here!',0,0,'text',NULL,1,'2025-10-28 23:54:52','text',NULL,0,NULL,NULL,0),(130,8,'hello',0,0,'text',NULL,1,'2025-10-31 00:55:03','text',NULL,0,NULL,NULL,0),(131,7,'hello dosty',0,0,'text',NULL,1,'2025-10-31 00:55:21','text',NULL,0,NULL,NULL,0),(132,8,'hello',0,0,'text',NULL,1,'2025-10-31 10:54:54','text',NULL,0,NULL,NULL,0);
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_reactions`
--

DROP TABLE IF EXISTS `chat_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_reactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reaction` varchar(10) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_message_user_reaction` (`message_id`,`user_id`,`reaction`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `chat_reactions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_reactions`
--

LOCK TABLES `chat_reactions` WRITE;
/*!40000 ALTER TABLE `chat_reactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_reactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contest_entries`
--

DROP TABLE IF EXISTS `contest_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contest_entries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contest_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `pick_id` int(11) NOT NULL,
  `score` decimal(10,2) DEFAULT 0.00,
  `rank` int(11) DEFAULT NULL,
  `submitted_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_contest_id` (`contest_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_pick_id` (`pick_id`),
  CONSTRAINT `contest_entries_ibfk_1` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contest_entries_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contest_entries_ibfk_3` FOREIGN KEY (`pick_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contest_entries`
--

LOCK TABLES `contest_entries` WRITE;
/*!40000 ALTER TABLE `contest_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `contest_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contest_participants`
--

DROP TABLE IF EXISTS `contest_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contest_participants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contest_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `entry_fee_paid` decimal(8,2) DEFAULT 0.00,
  `joined_at` datetime DEFAULT current_timestamp(),
  `status` enum('active','disqualified','withdrawn') DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_contest_user` (`contest_id`,`user_id`),
  KEY `idx_contest_id` (`contest_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `contest_participants_ibfk_1` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contest_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contest_participants`
--

LOCK TABLES `contest_participants` WRITE;
/*!40000 ALTER TABLE `contest_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `contest_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contests`
--

DROP TABLE IF EXISTS `contests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('daily','weekly','monthly','special') DEFAULT 'daily',
  `entry_fee` decimal(8,2) DEFAULT 0.00,
  `prize_pool` decimal(10,2) DEFAULT 0.00,
  `max_participants` int(11) DEFAULT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `status` enum('upcoming','active','completed','cancelled') DEFAULT 'upcoming',
  `participants` int(11) DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_start_date` (`start_date`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `contests_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contests`
--

LOCK TABLES `contests` WRITE;
/*!40000 ALTER TABLE `contests` DISABLE KEYS */;
INSERT INTO `contests` VALUES (1,'Daily Pick Challenge','Submit your best pick for today and compete with other tipsters!','daily',0.00,100.00,NULL,'2025-10-26 01:10:30','2025-10-27 01:10:30','active',0,1,'2025-10-26 01:10:30','2025-10-26 01:10:30'),(5,'Weekly Prediction Challenge','Predict the outcomes of this week\'s top matches','daily',0.00,500.00,NULL,'2025-10-27 00:00:00','2025-11-02 23:59:59','upcoming',0,1,'2025-10-26 03:29:20','2025-10-26 03:29:20'),(6,'Monthly Master Tipster','Compete for the title of Master Tipster this month','daily',0.00,2000.00,NULL,'2025-11-01 00:00:00','2025-11-30 23:59:59','upcoming',0,1,'2025-10-26 03:29:20','2025-10-26 03:29:20'),(7,'Champions League Special','Special contest for Champions League matches','daily',0.00,1000.00,NULL,'2025-11-05 00:00:00','2025-11-12 23:59:59','upcoming',0,1,'2025-10-26 03:29:20','2025-10-26 03:29:20');
/*!40000 ALTER TABLE `contests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `countries`
--

DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `countries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(3) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `countries`
--

LOCK TABLES `countries` WRITE;
/*!40000 ALTER TABLE `countries` DISABLE KEYS */;
INSERT INTO `countries` VALUES (1,'England','ENG','2025-10-26 20:31:37'),(2,'Spain','ESP','2025-10-26 20:31:37'),(3,'Germany','GER','2025-10-26 20:31:37'),(4,'Italy','ITA','2025-10-26 20:31:37'),(5,'France','FRA','2025-10-26 20:31:37'),(11,'Portugal','POR','2025-10-26 21:28:27'),(12,'Netherlands','NED','2025-10-26 21:28:27'),(13,'Belgium','BEL','2025-10-26 21:29:06'),(14,'Turkey','TUR','2025-10-26 21:29:06'),(15,'Scotland','SCO','2025-10-26 21:29:06'),(16,'Russia','RUS','2025-10-26 21:29:31'),(17,'Greece','GRE','2025-10-26 21:29:31'),(18,'Switzerland','SUI','2025-10-26 21:29:44'),(19,'Austria','AUT','2025-10-26 21:29:44'),(20,'Denmark','DEN','2025-10-26 21:29:44'),(24,'Norway','NOR','2025-10-26 21:31:14'),(25,'Sweden','SWE','2025-10-26 21:31:14'),(26,'Czech Republic','CZE','2025-10-26 21:31:14'),(27,'Poland','POL','2025-10-26 21:31:45'),(28,'Ukraine','UKR','2025-10-26 21:31:45'),(29,'Croatia','CRO','2025-10-26 21:31:45'),(30,'Serbia','SRB','2025-10-26 21:31:45'),(31,'Romania','ROU','2025-10-26 21:32:17'),(32,'Hungary','HUN','2025-10-26 21:32:17'),(33,'Slovakia','SVK','2025-10-26 21:32:17'),(34,'Bulgaria','BUL','2025-10-26 21:32:17'),(35,'Slovenia','SLO','2025-10-26 21:32:48'),(36,'Cyprus','CYP','2025-10-26 21:32:48'),(37,'Ireland','IRL','2025-10-26 21:32:48'),(38,'Israel','ISR','2025-10-26 21:32:48'),(39,'Egypt','EGY','2025-10-26 21:33:21'),(40,'South Africa','RSA','2025-10-26 21:33:21'),(41,'Morocco','MAR','2025-10-26 21:33:21'),(42,'Algeria','ALG','2025-10-26 21:33:51'),(43,'Tunisia','TUN','2025-10-26 21:33:51'),(44,'Nigeria','NGA','2025-10-26 21:33:51'),(45,'Ghana','GHA','2025-10-26 21:33:51'),(46,'Ivory Coast','CIV','2025-10-26 21:34:44'),(47,'Brazil','BRA','2025-10-26 21:34:44'),(48,'Argentina','ARG','2025-10-26 21:35:07'),(49,'Colombia','COL','2025-10-26 21:35:07'),(50,'Chile','CHI','2025-10-26 21:35:07'),(51,'Uruguay','URU','2025-10-26 21:36:17'),(52,'Ecuador','ECU','2025-10-26 21:36:17'),(53,'Japan','JPN','2025-10-26 21:36:17'),(54,'South Korea','KOR','2025-10-26 21:36:17'),(55,'Saudi Arabia','KSA','2025-10-26 21:36:39'),(56,'China','CHN','2025-10-26 21:36:39'),(57,'USA','USA','2025-10-26 21:36:39'),(58,'Mexico','MEX','2025-10-26 21:36:39'),(59,'Armenia','ARM','2025-10-27 14:35:52');
/*!40000 ALTER TABLE `countries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `escrow_funds`
--

DROP TABLE IF EXISTS `escrow_funds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `escrow_funds` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `pick_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reference` varchar(100) NOT NULL,
  `status` enum('held','released','refunded') DEFAULT 'held',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_pick_id` (`pick_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `escrow_funds_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `escrow_funds_ibfk_2` FOREIGN KEY (`pick_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `escrow_funds`
--

LOCK TABLES `escrow_funds` WRITE;
/*!40000 ALTER TABLE `escrow_funds` DISABLE KEYS */;
INSERT INTO `escrow_funds` VALUES (1,8,21,10.00,'PURCHASE_10_1761857089','held','2025-10-30 20:44:49','2025-10-30 20:44:49'),(2,8,21,10.00,'PURCHASE_10_1761857770','held','2025-10-30 20:56:10','2025-10-30 20:56:10'),(3,8,21,10.00,'PURCHASE_10_1761857791','held','2025-10-30 20:56:31','2025-10-30 20:56:31'),(4,8,21,10.00,'PURCHASE_10_1761858053','held','2025-10-30 21:00:53','2025-10-30 21:00:53'),(5,8,21,10.00,'PURCHASE_10_1761858082','held','2025-10-30 21:01:22','2025-10-30 21:01:22'),(6,8,21,10.00,'PURCHASE_10_1761858268','held','2025-10-30 21:04:28','2025-10-30 21:04:28'),(7,8,21,10.00,'PURCHASE_10_1761858273','held','2025-10-30 21:04:33','2025-10-30 21:04:33'),(8,8,21,10.00,'PURCHASE_10_1761858284','held','2025-10-30 21:04:44','2025-10-30 21:04:44'),(9,8,21,10.00,'PURCHASE_10_1761858478','held','2025-10-30 21:07:58','2025-10-30 21:07:58'),(10,8,22,20.00,'PURCHASE_11_1761858504','released','2025-10-30 21:08:24','2025-10-30 23:24:35'),(11,9,23,50.00,'PURCHASE_12_1763142163','released','2025-11-14 17:42:43','2025-11-14 18:19:45'),(12,9,24,50.00,'PURCHASE_13_1763157528','refunded','2025-11-14 21:58:48','2025-11-14 22:07:06');
/*!40000 ALTER TABLE `escrow_funds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `escrow_transactions`
--

DROP TABLE IF EXISTS `escrow_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `escrow_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `accumulator_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','settled','refunded') DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  `settled_at` datetime DEFAULT NULL,
  `refunded_at` datetime DEFAULT NULL,
  `settlement_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_accumulator_id` (`accumulator_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `escrow_transactions`
--

LOCK TABLES `escrow_transactions` WRITE;
/*!40000 ALTER TABLE `escrow_transactions` DISABLE KEYS */;
INSERT INTO `escrow_transactions` VALUES (1,1,1,50.00,'pending','2025-10-26 11:34:47',NULL,NULL,NULL),(2,1,1,50.00,'pending','2025-10-26 11:37:58',NULL,NULL,NULL);
/*!40000 ALTER TABLE `escrow_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fixtures`
--

DROP TABLE IF EXISTS `fixtures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fixtures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `home_team` varchar(100) NOT NULL,
  `away_team` varchar(100) NOT NULL,
  `league` varchar(100) NOT NULL,
  `country` varchar(50) DEFAULT NULL,
  `match_date` datetime NOT NULL,
  `status` enum('scheduled','live','finished','postponed','cancelled') DEFAULT 'scheduled',
  `home_score` int(11) DEFAULT NULL,
  `away_score` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_match_date` (`match_date`),
  KEY `idx_status` (`status`),
  KEY `idx_league` (`league`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fixtures`
--

LOCK TABLES `fixtures` WRITE;
/*!40000 ALTER TABLE `fixtures` DISABLE KEYS */;
INSERT INTO `fixtures` VALUES (1,'Manchester United','Liverpool','Premier League','England','2025-11-01 15:00:00','scheduled',NULL,NULL,'2025-10-26 03:23:19','2025-10-26 03:23:19'),(2,'Barcelona','Real Madrid','La Liga','Spain','2025-11-02 20:00:00','scheduled',NULL,NULL,'2025-10-26 03:23:19','2025-10-26 03:23:19'),(3,'Bayern Munich','Borussia Dortmund','Bundesliga','Germany','2025-11-03 17:30:00','scheduled',NULL,NULL,'2025-10-26 03:23:19','2025-10-26 03:23:19'),(4,'PSG','Marseille','Ligue 1','France','2025-11-04 21:00:00','scheduled',NULL,NULL,'2025-10-26 03:23:19','2025-10-26 03:23:19'),(5,'Juventus','AC Milan','Serie A','Italy','2025-11-05 18:00:00','scheduled',NULL,NULL,'2025-10-26 03:23:19','2025-10-26 03:23:19');
/*!40000 ALTER TABLE `fixtures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `growth_settings`
--

DROP TABLE IF EXISTS `growth_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `growth_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) DEFAULT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_type` enum('text','number','boolean','json') DEFAULT 'text',
  `description` text DEFAULT NULL,
  `category` enum('referral','gamification','commission','tipster_qualification') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=302 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `growth_settings`
--

LOCK TABLES `growth_settings` WRITE;
/*!40000 ALTER TABLE `growth_settings` DISABLE KEYS */;
INSERT INTO `growth_settings` VALUES (1,'referral_bonus_amount','20.00','number','Amount referrer gets when referee makes first purchase','referral',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(2,'referral_discount_percentage','20','number','Percentage discount referee gets on first purchase','referral',1,1,'2025-10-27 13:57:49','2025-10-30 14:31:41'),(3,'referral_max_uses_per_code','10','number','Maximum uses per referral code','referral',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(4,'referral_bonus_expiry_days','30','number','Days until referral bonus expires','referral',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(5,'referral_enabled','1','boolean','Enable/disable referral system','referral',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(6,'gamification_enabled','1','boolean','Enable/disable gamification rewards','gamification',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(7,'achievement_first_purchase_bonus','10.00','number','Wallet bonus for first purchase achievement','gamification',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(8,'achievement_loyal_customer_bonus','25.00','number','Wallet bonus for loyal customer achievement','gamification',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(9,'achievement_social_butterfly_bonus','30.00','number','Wallet bonus for social butterfly achievement','gamification',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(10,'achievement_referral_champion_bonus','40.00','number','Wallet bonus for referral champion achievement','gamification',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(11,'level_bronze_bonus','15.00','number','Wallet bonus for reaching Bronze level','gamification',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(12,'level_silver_bonus','30.00','number','Wallet bonus for reaching Silver level','gamification',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(13,'level_gold_bonus','50.00','number','Wallet bonus for reaching Gold level','gamification',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(14,'level_platinum_bonus','100.00','number','Wallet bonus for reaching Platinum level','gamification',1,1,'2025-10-27 13:57:49','2025-11-14 16:10:25'),(15,'challenge_daily_bonus','5.00','number','Daily challenge completion bonus','gamification',1,1,'2025-10-27 13:57:49','2025-10-27 14:26:36'),(16,'challenge_weekly_bonus','20.00','number','Weekly challenge completion bonus','gamification',1,1,'2025-10-27 13:57:49','2025-10-27 14:26:36'),(17,'challenge_monthly_bonus','50.00','number','Monthly challenge completion bonus','gamification',1,1,'2025-10-27 13:57:49','2025-10-27 14:26:36'),(18,'commission_rate','0.10','text','Platform commission rate for tipster earnings (decimal)','commission',1,1,'2025-10-27 15:13:25','2025-10-27 15:13:25'),(19,'commission_minimum','1.00','text','Minimum commission amount','commission',1,1,'2025-10-27 15:13:25','2025-10-27 15:13:25'),(20,'commission_maximum','50.00','text','Maximum commission amount','commission',1,1,'2025-10-27 15:13:25','2025-10-27 15:13:25'),(21,'tipster_qualification_enabled','0','text','Enable tipster qualification requirements for marketplace','tipster_qualification',1,1,'2025-10-27 15:19:13','2025-11-14 16:10:25'),(22,'tipster_min_free_picks','2','text','Minimum number of free picks required before marketplace access','tipster_qualification',1,1,'2025-10-27 15:19:13','2025-11-14 16:10:25'),(23,'tipster_min_roi_percentage','20','text','Minimum ROI percentage required for marketplace access','tipster_qualification',1,1,'2025-10-27 15:19:13','2025-11-14 16:10:25'),(24,'tipster_qualification_period_days','3','text','Period in days to calculate ROI and free picks','tipster_qualification',1,1,'2025-10-27 15:19:13','2025-11-14 16:10:25'),(25,'referral_enabled','1','boolean','Enable referral system','referral',1,1,'2025-10-27 21:50:20','2025-11-14 16:10:25'),(26,'referee_discount_percentage','20','number','Discount percentage for referee','referral',1,1,'2025-10-27 21:50:20','2025-10-27 21:50:20'),(27,'referral_bonus_expiry_days','30','number','Referral bonus expiry in days','referral',1,1,'2025-10-27 21:50:20','2025-11-14 16:10:25'),(28,'referral_bonus_amount','20.00','number','Referral bonus amount in GHS','referral',1,1,'2025-10-27 21:50:20','2025-11-14 16:10:25'),(29,'max_uses_per_referral_code','10','number','Maximum uses per referral code','referral',1,1,'2025-10-27 21:50:20','2025-10-27 21:50:20'),(30,'gamification_enabled','1','boolean','Enable gamification rewards','gamification',1,1,'2025-10-27 21:50:20','2025-11-14 16:10:25'),(31,'first_purchase_bonus','10.00','number','First purchase bonus amount','gamification',1,1,'2025-10-27 21:50:20','2025-10-27 21:50:20'),(32,'social_butterfly_bonus','30.00','number','Social butterfly bonus amount','gamification',1,1,'2025-10-27 21:50:20','2025-10-27 21:50:20'),(33,'loyal_customer_bonus','25.00','number','Loyal customer bonus amount','gamification',1,1,'2025-10-27 21:50:20','2025-10-27 21:50:20'),(34,'referral_champion_bonus','40.00','number','Referral champion bonus amount','gamification',1,1,'2025-10-27 21:50:20','2025-10-27 21:50:20'),(35,'bronze_level_bonus','15.00','number','Bronze level bonus amount','gamification',1,1,'2025-10-27 21:50:20','2025-10-27 21:50:20'),(36,'silver_level_bonus','30.00','number','Silver level bonus amount','gamification',1,1,'2025-10-27 21:50:20','2025-10-27 21:50:20'),(37,'gold_level_bonus','50.00','number','Gold level bonus amount','gamification',1,1,'2025-10-27 21:50:20','2025-10-27 21:50:20'),(38,'platinum_level_bonus','100.00','number','Platinum level bonus amount','gamification',1,1,'2025-10-27 21:50:20','2025-10-27 21:50:20'),(39,'referral_enabled','1','boolean','Enable referral system','referral',1,1,'2025-10-27 21:50:30','2025-11-14 16:10:25'),(40,'referee_discount_percentage','20','number','Discount percentage for referee','referral',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(41,'referral_bonus_expiry_days','30','number','Referral bonus expiry in days','referral',1,1,'2025-10-27 21:50:30','2025-11-14 16:10:25'),(42,'referral_bonus_amount','20.00','number','Referral bonus amount in GHS','referral',1,1,'2025-10-27 21:50:30','2025-11-14 16:10:25'),(43,'max_uses_per_referral_code','10','number','Maximum uses per referral code','referral',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(44,'gamification_enabled','1','boolean','Enable gamification rewards','gamification',1,1,'2025-10-27 21:50:30','2025-11-14 16:10:25'),(45,'first_purchase_bonus','10.00','number','First purchase bonus amount','gamification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(46,'social_butterfly_bonus','30.00','number','Social butterfly bonus amount','gamification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(47,'loyal_customer_bonus','25.00','number','Loyal customer bonus amount','gamification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(48,'referral_champion_bonus','40.00','number','Referral champion bonus amount','gamification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(49,'bronze_level_bonus','15.00','number','Bronze level bonus amount','gamification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(50,'silver_level_bonus','30.00','number','Silver level bonus amount','gamification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(51,'gold_level_bonus','50.00','number','Gold level bonus amount','gamification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(52,'platinum_level_bonus','100.00','number','Platinum level bonus amount','gamification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(53,'tipster_qualification_enabled','0','boolean','Enable tipster qualification requirements','tipster_qualification',1,1,'2025-10-27 21:50:30','2025-11-14 16:10:25'),(54,'minimum_roi_percentage','20','number','Minimum ROI percentage required','tipster_qualification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(55,'minimum_free_picks_required','20','number','Minimum free picks required','tipster_qualification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(56,'qualification_period_days','90','number','Qualification period in days','tipster_qualification',1,1,'2025-10-27 21:50:30','2025-10-27 21:50:30'),(57,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(58,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(59,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-10-30 14:31:41'),(60,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(61,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(62,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(63,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(64,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(65,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(66,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(67,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(68,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(69,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(70,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(71,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(72,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(73,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(74,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(75,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(76,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(77,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(78,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:51:40','2025-11-14 16:10:25'),(79,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(80,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(81,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-10-30 14:31:41'),(82,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(83,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(84,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(85,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(86,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(87,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(88,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(89,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(90,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(91,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(92,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(93,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(94,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(95,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(96,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(97,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(98,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(99,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(100,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:52:19','2025-11-14 16:10:25'),(101,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(102,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(103,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-10-30 14:31:41'),(104,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(105,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(106,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(107,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(108,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(109,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(110,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(111,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(112,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(113,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(114,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(115,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(116,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(117,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(118,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(119,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(120,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(121,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(122,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:52:25','2025-11-14 16:10:25'),(123,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(124,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(125,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-10-30 14:31:41'),(126,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(127,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(128,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(129,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(130,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(131,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(132,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(133,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(134,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(135,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(136,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(137,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(138,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(139,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(140,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(141,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(142,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(143,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(144,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:52:32','2025-11-14 16:10:25'),(145,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(146,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(147,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-10-30 14:31:41'),(148,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(149,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(150,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(151,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(152,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(153,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(154,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(155,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(156,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(157,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(158,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(159,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(160,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(161,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(162,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(163,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(164,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(165,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(166,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:55:14','2025-11-14 16:10:25'),(167,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(168,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(169,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-10-30 14:31:41'),(170,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(171,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(172,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(173,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(174,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(175,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(176,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(177,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(178,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(179,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(180,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(181,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(182,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(183,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(184,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(185,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(186,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(187,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(188,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:55:23','2025-11-14 16:10:25'),(189,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(190,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(191,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-10-30 14:31:41'),(192,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(193,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(194,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(195,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(196,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(197,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(198,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(199,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(200,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(201,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(202,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(203,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(204,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(205,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(206,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(207,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(208,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(209,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(210,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:55:26','2025-11-14 16:10:25'),(211,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-11-14 16:10:25'),(212,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-11-14 16:10:25'),(213,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-10-30 14:31:41'),(214,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-11-14 16:10:25'),(215,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-11-14 16:10:25'),(216,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-11-14 16:10:25'),(217,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-11-14 16:10:25'),(218,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-11-14 16:10:25'),(219,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-11-14 16:10:25'),(220,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-11-14 16:10:25'),(221,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:55:37','2025-11-14 16:10:25'),(222,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(223,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(224,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(225,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(226,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(227,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(228,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(229,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(230,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(231,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(232,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:55:38','2025-11-14 16:10:25'),(233,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(234,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(235,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-10-30 14:31:41'),(236,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(237,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(238,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(239,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(240,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(241,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(242,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(243,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(244,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(245,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(246,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(247,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(248,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(249,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(250,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(251,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(252,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(253,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(254,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:55:43','2025-11-14 16:10:25'),(255,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(256,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(257,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-10-30 14:31:41'),(258,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(259,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(260,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(261,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(262,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(263,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(264,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(265,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(266,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(267,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(268,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(269,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(270,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(271,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(272,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(273,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(274,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(275,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(276,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:56:04','2025-11-14 16:10:25'),(277,'referral_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(278,'referral_bonus_amount','20.00','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(279,'referral_discount_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-10-30 14:31:41'),(280,'referral_max_uses_per_code','10','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(281,'referral_bonus_expiry_days','30','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(282,'gamification_enabled','1','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(283,'achievement_first_purchase_bonus','10.00','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(284,'achievement_loyal_customer_bonus','25.00','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(285,'achievement_social_butterfly_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(286,'achievement_referral_champion_bonus','40.00','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(287,'level_bronze_bonus','15.00','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(288,'level_silver_bonus','30.00','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(289,'level_gold_bonus','50.00','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(290,'level_platinum_bonus','100.00','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(291,'tipster_qualification_enabled','0','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(292,'tipster_min_free_picks','2','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(293,'tipster_min_roi_percentage','20','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(294,'tipster_qualification_period_days','3','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(295,'first_purchase_badge','First Buyer','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(296,'streak_master_badge','Streak Master','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(297,'high_roller_badge','High Roller','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(298,'social_butterfly_badge','Social Butterfly','text',NULL,'referral',1,1,'2025-10-27 21:56:10','2025-11-14 16:10:25'),(299,'referral_bonus_type','exact','','Referral bonus type: exact (same as deposit), percentage, or fixed','referral',1,1,'2025-10-31 06:26:02','2025-11-14 16:10:25'),(300,'referral_bonus_percentage','100','number','Referral bonus percentage (if type is percentage)','referral',1,1,'2025-10-31 06:26:02','2025-11-14 16:10:25'),(301,'referral_min_deposit','0','number','Minimum deposit amount required to trigger referral bonus','referral',1,1,'2025-10-31 06:26:02','2025-11-14 16:10:25');
/*!40000 ALTER TABLE `growth_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `learning_certificates`
--

DROP TABLE IF EXISTS `learning_certificates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `learning_certificates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `content_id` int(11) NOT NULL,
  `certificate_code` varchar(50) NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `completed_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `certificate_code` (`certificate_code`),
  UNIQUE KEY `unique_certificate` (`user_id`,`content_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_content_id` (`content_id`),
  KEY `idx_certificate_code` (`certificate_code`),
  CONSTRAINT `learning_certificates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `learning_certificates_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `learning_content` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `learning_certificates`
--

LOCK TABLES `learning_certificates` WRITE;
/*!40000 ALTER TABLE `learning_certificates` DISABLE KEYS */;
/*!40000 ALTER TABLE `learning_certificates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `learning_content`
--

DROP TABLE IF EXISTS `learning_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `learning_content` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `content` longtext NOT NULL,
  `type` enum('article','video','quiz','course') DEFAULT 'article',
  `category` varchar(100) DEFAULT NULL,
  `difficulty` enum('beginner','intermediate','advanced') DEFAULT 'beginner',
  `duration` int(11) DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT 0,
  `views` int(11) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_category` (`category`),
  KEY `idx_difficulty` (`difficulty`),
  KEY `idx_is_published` (`is_published`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `learning_content_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `learning_content`
--

LOCK TABLES `learning_content` WRITE;
/*!40000 ALTER TABLE `learning_content` DISABLE KEYS */;
INSERT INTO `learning_content` VALUES (1,'Introduction to Football Betting','Learn the basics of football betting','This is a comprehensive guide to football betting basics...','article','Basics','beginner',NULL,1,0,1,'2025-10-25 21:15:45','2025-10-25 21:15:45'),(2,'Understanding Odds','How to read and calculate odds','Odds represent the probability of an event occurring...','article','Basics','beginner',NULL,1,0,1,'2025-10-25 21:15:45','2025-10-25 21:15:45'),(3,'Bankroll Management','Essential money management strategies','Proper bankroll management is crucial for long-term success...','article','Strategy','intermediate',NULL,1,0,1,'2025-10-25 21:15:45','2025-10-25 21:15:45');
/*!40000 ALTER TABLE `learning_content` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `learning_quizzes`
--

DROP TABLE IF EXISTS `learning_quizzes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `learning_quizzes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content_id` int(11) NOT NULL,
  `question` text NOT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`options`)),
  `correct_answer` varchar(255) NOT NULL,
  `explanation` text DEFAULT NULL,
  `points` int(11) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_content_id` (`content_id`),
  CONSTRAINT `learning_quizzes_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `learning_content` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `learning_quizzes`
--

LOCK TABLES `learning_quizzes` WRITE;
/*!40000 ALTER TABLE `learning_quizzes` DISABLE KEYS */;
/*!40000 ALTER TABLE `learning_quizzes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_attempts`
--

DROP TABLE IF EXISTS `login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `success` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_attempts`
--

LOCK TABLES `login_attempts` WRITE;
/*!40000 ALTER TABLE `login_attempts` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mentors`
--

DROP TABLE IF EXISTS `mentors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mentors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `specialties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specialties`)),
  `experience_years` int(11) DEFAULT 0,
  `hourly_rate` decimal(8,2) DEFAULT 0.00,
  `availability` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`availability`)),
  `bio` text DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `rating` decimal(3,2) DEFAULT 0.00,
  `total_sessions` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_mentor` (`user_id`),
  KEY `idx_is_available` (`is_available`),
  KEY `idx_rating` (`rating`),
  CONSTRAINT `mentors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mentors`
--

LOCK TABLES `mentors` WRITE;
/*!40000 ALTER TABLE `mentors` DISABLE KEYS */;
/*!40000 ALTER TABLE `mentors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mentorship_applications`
--

DROP TABLE IF EXISTS `mentorship_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mentorship_applications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `mentor_id` int(11) DEFAULT NULL,
  `application_text` text NOT NULL,
  `status` enum('pending','approved','rejected','active','completed') DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_mentor_id` (`mentor_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mentorship_applications`
--

LOCK TABLES `mentorship_applications` WRITE;
/*!40000 ALTER TABLE `mentorship_applications` DISABLE KEYS */;
INSERT INTO `mentorship_applications` VALUES (1,1,2,'I would like to learn advanced prediction strategies.','pending','2025-10-26 11:34:47',NULL,NULL),(2,1,2,'I would like to learn advanced prediction strategies.','pending','2025-10-26 11:37:58',NULL,NULL);
/*!40000 ALTER TABLE `mentorship_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mentorship_notes`
--

DROP TABLE IF EXISTS `mentorship_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mentorship_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` int(11) NOT NULL,
  `author_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `is_private` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_author_id` (`author_id`),
  CONSTRAINT `mentorship_notes_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `mentorship_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mentorship_notes_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mentorship_notes`
--

LOCK TABLES `mentorship_notes` WRITE;
/*!40000 ALTER TABLE `mentorship_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `mentorship_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mentorship_ratings`
--

DROP TABLE IF EXISTS `mentorship_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mentorship_ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` int(11) NOT NULL,
  `rater_id` int(11) NOT NULL,
  `rated_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` >= 1 and `rating` <= 5),
  `review` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_rater` (`session_id`,`rater_id`),
  KEY `idx_rated_id` (`rated_id`),
  KEY `rater_id` (`rater_id`),
  CONSTRAINT `mentorship_ratings_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `mentorship_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mentorship_ratings_ibfk_2` FOREIGN KEY (`rater_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mentorship_ratings_ibfk_3` FOREIGN KEY (`rated_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mentorship_ratings`
--

LOCK TABLES `mentorship_ratings` WRITE;
/*!40000 ALTER TABLE `mentorship_ratings` DISABLE KEYS */;
/*!40000 ALTER TABLE `mentorship_ratings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mentorship_requests`
--

DROP TABLE IF EXISTS `mentorship_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mentorship_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mentor_id` int(11) NOT NULL,
  `mentee_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `preferred_time` datetime DEFAULT NULL,
  `status` enum('pending','accepted','rejected','completed','cancelled') DEFAULT 'pending',
  `message` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `requested_at` datetime DEFAULT current_timestamp(),
  `responded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mentor_id` (`mentor_id`),
  KEY `idx_mentee_id` (`mentee_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `mentorship_requests_ibfk_1` FOREIGN KEY (`mentor_id`) REFERENCES `mentors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mentorship_requests_ibfk_2` FOREIGN KEY (`mentee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mentorship_requests`
--

LOCK TABLES `mentorship_requests` WRITE;
/*!40000 ALTER TABLE `mentorship_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `mentorship_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mentorship_sessions`
--

DROP TABLE IF EXISTS `mentorship_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mentorship_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `mentor_id` int(11) NOT NULL,
  `mentee_id` int(11) NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `duration_minutes` int(11) DEFAULT 60,
  `status` enum('scheduled','completed','cancelled','no_show') DEFAULT 'scheduled',
  `meeting_link` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_mentor_id` (`mentor_id`),
  KEY `idx_mentee_id` (`mentee_id`),
  KEY `idx_scheduled_at` (`scheduled_at`),
  CONSTRAINT `mentorship_sessions_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `mentorship_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mentorship_sessions_ibfk_2` FOREIGN KEY (`mentor_id`) REFERENCES `mentors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mentorship_sessions_ibfk_3` FOREIGN KEY (`mentee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mentorship_sessions`
--

LOCK TABLES `mentorship_sessions` WRITE;
/*!40000 ALTER TABLE `mentorship_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `mentorship_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `national_teams`
--

DROP TABLE IF EXISTS `national_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `national_teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `country_code` varchar(3) NOT NULL,
  `team_name` varchar(100) NOT NULL,
  `fifa_code` varchar(3) NOT NULL,
  `fifa_ranking` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_country_code` (`country_code`),
  UNIQUE KEY `unique_team_name` (`team_name`),
  KEY `idx_fifa_ranking` (`fifa_ranking`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `national_teams`
--

LOCK TABLES `national_teams` WRITE;
/*!40000 ALTER TABLE `national_teams` DISABLE KEYS */;
INSERT INTO `national_teams` VALUES (1,'ARG','Argentina','ARG',1,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(2,'FRA','France','FRA',2,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(3,'BRA','Brazil','BRA',3,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(4,'ENG','England','ENG',4,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(5,'BEL','Belgium','BEL',5,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(6,'POR','Portugal','POR',6,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(7,'NED','Netherlands','NED',7,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(8,'ESP','Spain','ESP',8,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(9,'ITA','Italy','ITA',9,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(10,'CRO','Croatia','CRO',10,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(11,'URU','Uruguay','URU',11,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(12,'MAR','Morocco','MAR',12,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(13,'USA','United States','USA',13,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(14,'COL','Colombia','COL',14,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(15,'MEX','Mexico','MEX',15,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(16,'GER','Germany','GER',16,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(17,'JPN','Japan','JPN',17,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(18,'SEN','Senegal','SEN',18,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(19,'DEN','Denmark','DEN',19,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(20,'POL','Poland','POL',20,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(21,'SUI','Switzerland','SUI',21,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(22,'IRN','Iran','IRN',22,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(23,'KOR','South Korea','KOR',23,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(24,'WAL','Wales','WAL',24,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(25,'AUS','Australia','AUS',25,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(26,'SWE','Sweden','SWE',26,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(27,'UKR','Ukraine','UKR',27,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(28,'AUT','Austria','AUT',28,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(29,'TUN','Tunisia','TUN',29,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(30,'CHI','Chile','CHI',30,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(31,'ECU','Ecuador','ECU',31,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(32,'PER','Peru','PER',32,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(33,'NOR','Norway','NOR',33,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(34,'CZE','Czech Republic','CZE',34,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(35,'HUN','Hungary','HUN',35,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(36,'RUS','Russia','RUS',36,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(37,'EGY','Egypt','EGY',37,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(38,'NGA','Nigeria','NGA',38,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(39,'CMR','Cameroon','CMR',39,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(40,'GHA','Ghana','GHA',40,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(41,'ALG','Algeria','ALG',41,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(42,'CIV','Ivory Coast','CIV',42,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(43,'TUR','Turkey','TUR',43,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(44,'GRE','Greece','GRE',44,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(45,'ROU','Romania','ROU',45,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(46,'IRL','Republic of Ireland','IRL',46,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(47,'SCO','Scotland','SCO',47,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(48,'FIN','Finland','FIN',48,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(49,'ISL','Iceland','ISL',49,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(50,'SRB','Serbia','SRB',50,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(51,'SVK','Slovakia','SVK',51,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(52,'SVN','Slovenia','SVN',52,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(53,'BUL','Bulgaria','BUL',53,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(54,'ISR','Israel','ISR',54,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(55,'PAR','Paraguay','PAR',55,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(56,'VEN','Venezuela','VEN',56,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(57,'BOL','Bolivia','BOL',57,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(58,'CRC','Costa Rica','CRC',58,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(59,'PAN','Panama','PAN',59,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(60,'JAM','Jamaica','JAM',60,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(61,'HON','Honduras','HON',61,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(62,'CAN','Canada','CAN',62,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(63,'QAT','Qatar','QAT',63,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(64,'SAU','Saudi Arabia','SAU',64,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(65,'UAE','United Arab Emirates','UAE',65,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(66,'IRQ','Iraq','IRQ',66,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(67,'OMA','Oman','OMA',67,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(68,'UZB','Uzbekistan','UZB',68,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(69,'CHN','China','CHN',69,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(70,'THA','Thailand','THA',70,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(71,'VIE','Vietnam','VIE',71,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(72,'PHI','Philippines','PHI',72,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(73,'IDN','Indonesia','IDN',73,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(74,'MAS','Malaysia','MAS',74,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(75,'SGP','Singapore','SGP',75,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(76,'NZL','New Zealand','NZL',76,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(77,'FIJ','Fiji','FIJ',77,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(78,'PNG','Papua New Guinea','PNG',78,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(79,'SOL','Solomon Islands','SOL',79,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(80,'TAH','Tahiti','TAH',80,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(81,'RSA','South Africa','RSA',81,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(82,'KEN','Kenya','KEN',82,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(83,'UGA','Uganda','UGA',83,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(84,'TAN','Tanzania','TAN',84,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(85,'ZIM','Zimbabwe','ZIM',85,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(86,'ZAM','Zambia','ZAM',86,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(87,'MAD','Madagascar','MAD',87,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(88,'MOZ','Mozambique','MOZ',88,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(89,'ANG','Angola','ANG',89,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(90,'MLI','Mali','MLI',90,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(91,'BFA','Burkina Faso','BFA',91,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(92,'BEN','Benin','BEN',92,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(93,'GAB','Gabon','GAB',93,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(94,'GNB','Guinea-Bissau','GNB',94,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(95,'GUI','Guinea','GUI',95,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(96,'SLE','Sierra Leone','SLE',96,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(97,'LBR','Liberia','LBR',97,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(98,'TGO','Togo','TGO',98,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(99,'NIG','Niger','NIG',99,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(100,'CHA','Chad','CHA',100,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(101,'CAF','Central African Republic','CAF',101,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(102,'STP','Sao Tome and Principe','STP',102,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(103,'EQG','Equatorial Guinea','EQG',103,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(104,'CPV','Cape Verde','CPV',104,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(105,'MTN','Mauritania','MTN',105,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(106,'GAM','Gambia','GAM',106,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(107,'BOT','Botswana','BOT',107,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(108,'NAM','Namibia','NAM',108,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(109,'SWZ','Eswatini','SWZ',109,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(110,'LES','Lesotho','LES',110,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(111,'ETH','Ethiopia','ETH',111,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(112,'ERI','Eritrea','ERI',112,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(113,'DJI','Djibouti','DJI',113,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(114,'SOM','Somalia','SOM',114,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(115,'SUD','Sudan','SUD',115,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(116,'SSD','South Sudan','SSD',116,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(117,'BDI','Burundi','BDI',117,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(118,'RWA','Rwanda','RWA',118,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(119,'COD','DR Congo','COD',119,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(120,'COG','Congo','COG',120,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(121,'LBY','Libya','LBY',121,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(122,'YEM','Yemen','YEM',122,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(123,'SYR','Syria','SYR',123,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(124,'LBN','Lebanon','LBN',124,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(125,'JOR','Jordan','JOR',125,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(126,'PSE','Palestine','PSE',126,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(127,'BHR','Bahrain','BHR',127,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(128,'KWT','Kuwait','KWT',128,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(129,'AFG','Afghanistan','AFG',129,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(130,'PAK','Pakistan','PAK',130,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(131,'IND','India','IND',131,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(132,'BAN','Bangladesh','BAN',132,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(133,'SRI','Sri Lanka','SRI',133,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(134,'NPL','Nepal','NPL',134,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(135,'BHU','Bhutan','BHU',135,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(136,'MDV','Maldives','MDV',136,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(137,'MYA','Myanmar','MYA',137,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(138,'LAO','Laos','LAO',138,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(139,'CAM','Cambodia','CAM',139,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(140,'BRU','Brunei','BRU',140,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(141,'TLS','East Timor','TLS',141,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(142,'MNG','Mongolia','MNG',142,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(143,'PRK','North Korea','PRK',143,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(144,'HKG','Hong Kong','HKG',144,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(145,'MAC','Macau','MAC',145,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(146,'TWN','Taiwan','TWN',146,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(147,'GUM','Guam','GUM',147,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(148,'NMI','Northern Mariana Islands','NMI',148,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(149,'PLW','Palau','PLW',149,1,'2025-11-14 23:28:48','2025-11-14 23:28:48'),(150,'MHL','Marshall Islands','MHL',150,1,'2025-11-14 23:28:48','2025-11-14 23:28:48');
/*!40000 ALTER TABLE `national_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payout_requests`
--

DROP TABLE IF EXISTS `payout_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payout_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `platform_fee` decimal(10,2) NOT NULL,
  `net_amount` decimal(10,2) NOT NULL,
  `method` enum('bank_transfer','mobile_money','crypto') DEFAULT 'bank_transfer',
  `account_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`account_details`)),
  `status` enum('pending','processing','completed','failed','cancelled') DEFAULT 'pending',
  `processed_by` int(11) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `processed_by` (`processed_by`),
  CONSTRAINT `payout_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payout_requests_ibfk_2` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payout_requests`
--

LOCK TABLES `payout_requests` WRITE;
/*!40000 ALTER TABLE `payout_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `payout_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pick_comments`
--

DROP TABLE IF EXISTS `pick_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pick_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `pick_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_pick_id` (`pick_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `pick_comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pick_comments_ibfk_2` FOREIGN KEY (`pick_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pick_comments`
--

LOCK TABLES `pick_comments` WRITE;
/*!40000 ALTER TABLE `pick_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `pick_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pick_likes`
--

DROP TABLE IF EXISTS `pick_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pick_likes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `pick_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_like` (`user_id`,`pick_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_pick_id` (`pick_id`),
  CONSTRAINT `pick_likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pick_likes_ibfk_2` FOREIGN KEY (`pick_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pick_likes`
--

LOCK TABLES `pick_likes` WRITE;
/*!40000 ALTER TABLE `pick_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `pick_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pick_marketplace`
--

DROP TABLE IF EXISTS `pick_marketplace`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pick_marketplace` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `accumulator_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `price` decimal(8,2) NOT NULL,
  `status` enum('active','sold','removed','expired') DEFAULT 'active',
  `purchase_count` int(11) DEFAULT 0,
  `view_count` int(11) DEFAULT 0,
  `max_purchases` int(11) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_accumulator` (`accumulator_id`),
  KEY `idx_seller_id` (`seller_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `pick_marketplace_ibfk_1` FOREIGN KEY (`accumulator_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pick_marketplace_ibfk_2` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pick_marketplace`
--

LOCK TABLES `pick_marketplace` WRITE;
/*!40000 ALTER TABLE `pick_marketplace` DISABLE KEYS */;
INSERT INTO `pick_marketplace` VALUES (1,7,4,0.00,'active',0,0,1,'2025-10-27 23:45:31','2025-10-28 10:22:42'),(4,9,7,0.00,'active',0,1,1,'2025-10-28 20:53:52','2025-10-28 21:44:45'),(5,10,7,0.00,'active',0,0,1,'2025-10-28 20:53:52','2025-10-28 20:53:52'),(6,17,7,0.00,'active',0,1,1,'2025-10-28 20:53:52','2025-10-29 00:36:36'),(7,18,7,0.00,'active',0,2,999999,'2025-10-29 00:36:04','2025-10-30 12:44:05'),(8,19,8,0.00,'active',0,0,999999,'2025-10-30 14:27:23','2025-10-30 14:27:23'),(9,20,8,0.00,'active',0,0,999999,'2025-10-30 14:27:30','2025-11-14 17:40:02'),(10,21,7,10.00,'active',0,1,999999,'2025-10-30 14:48:19','2025-11-14 17:40:02'),(11,22,7,20.00,'active',0,1,999999,'2025-10-30 15:14:26','2025-10-30 21:13:39'),(12,23,7,50.00,'active',0,1,999999,'2025-11-14 17:34:58','2025-11-14 17:54:07'),(13,24,4,50.00,'active',1,1,999999,'2025-11-14 21:58:06','2025-11-14 21:58:51'),(14,25,4,50.00,'active',0,0,999999,'2025-11-14 23:53:07','2025-11-14 23:53:07');
/*!40000 ALTER TABLE `pick_marketplace` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER pm_sync_price_on_insert BEFORE INSERT ON pick_marketplace FOR EACH ROW BEGIN SET NEW.price = (SELECT price FROM accumulator_tickets WHERE id = NEW.accumulator_id); END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `pick_performance_analytics`
--

DROP TABLE IF EXISTS `pick_performance_analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pick_performance_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pick_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `views` int(11) DEFAULT 0,
  `purchases` int(11) DEFAULT 0,
  `revenue` decimal(10,2) DEFAULT 0.00,
  `win_rate` decimal(5,2) DEFAULT 0.00,
  `roi` decimal(5,2) DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pick_analytics` (`pick_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_win_rate` (`win_rate`),
  KEY `idx_roi` (`roi`),
  CONSTRAINT `pick_performance_analytics_ibfk_1` FOREIGN KEY (`pick_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pick_performance_analytics_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pick_performance_analytics`
--

LOCK TABLES `pick_performance_analytics` WRITE;
/*!40000 ALTER TABLE `pick_performance_analytics` DISABLE KEYS */;
/*!40000 ALTER TABLE `pick_performance_analytics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pick_selections`
--

DROP TABLE IF EXISTS `pick_selections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pick_selections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pick_id` int(11) NOT NULL,
  `home_team` varchar(100) NOT NULL,
  `away_team` varchar(100) NOT NULL,
  `league` varchar(100) NOT NULL,
  `country` varchar(50) DEFAULT NULL,
  `home_country_id` int(11) DEFAULT NULL,
  `home_team_id` int(11) DEFAULT NULL,
  `away_country_id` int(11) DEFAULT NULL,
  `away_team_id` int(11) DEFAULT NULL,
  `match_date` datetime NOT NULL,
  `market` varchar(100) NOT NULL,
  `selection` varchar(100) NOT NULL,
  `odds` decimal(10,3) NOT NULL,
  `result` enum('pending','won','lost','void') DEFAULT 'pending',
  `settled_by` int(11) DEFAULT NULL,
  `settled_at` timestamp NULL DEFAULT NULL,
  `settlement_notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pick_id` (`pick_id`),
  KEY `idx_match_date` (`match_date`),
  KEY `idx_result` (`result`),
  KEY `fk_pick_settled_by` (`settled_by`),
  KEY `idx_pick_match_datetime` (`match_date`),
  KEY `idx_pick_result` (`result`),
  KEY `fk_pick_home_country` (`home_country_id`),
  KEY `fk_pick_home_team` (`home_team_id`),
  KEY `fk_pick_away_country` (`away_country_id`),
  KEY `fk_pick_away_team` (`away_team_id`),
  CONSTRAINT `fk_pick_away_country` FOREIGN KEY (`away_country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pick_away_team` FOREIGN KEY (`away_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pick_home_country` FOREIGN KEY (`home_country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pick_home_team` FOREIGN KEY (`home_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pick_settled_by` FOREIGN KEY (`settled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pick_selections_ibfk_1` FOREIGN KEY (`pick_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pick_selections`
--

LOCK TABLES `pick_selections` WRITE;
/*!40000 ALTER TABLE `pick_selections` DISABLE KEYS */;
/*!40000 ALTER TABLE `pick_selections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pick_shares`
--

DROP TABLE IF EXISTS `pick_shares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pick_shares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `pick_id` int(11) NOT NULL,
  `platform` varchar(50) DEFAULT 'internal',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_pick_id` (`pick_id`),
  CONSTRAINT `pick_shares_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pick_shares_ibfk_2` FOREIGN KEY (`pick_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pick_shares`
--

LOCK TABLES `pick_shares` WRITE;
/*!40000 ALTER TABLE `pick_shares` DISABLE KEYS */;
/*!40000 ALTER TABLE `pick_shares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `picks`
--

DROP TABLE IF EXISTS `picks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `picks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `odds` decimal(10,3) NOT NULL,
  `status` enum('active','won','lost','void') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `result` enum('win','loss','pending','cancelled') DEFAULT 'pending',
  `settled_by` int(11) DEFAULT NULL,
  `settled_at` timestamp NULL DEFAULT NULL,
  `settlement_notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `fk_picks_settled_by` (`settled_by`),
  CONSTRAINT `fk_picks_settled_by` FOREIGN KEY (`settled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `picks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `picks`
--

LOCK TABLES `picks` WRITE;
/*!40000 ALTER TABLE `picks` DISABLE KEYS */;
/*!40000 ALTER TABLE `picks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform_commissions`
--

DROP TABLE IF EXISTS `platform_commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `platform_commissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pick_id` int(11) NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL,
  `gross_amount` decimal(10,2) NOT NULL,
  `commission_type` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pick_id` (`pick_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_commissions`
--

LOCK TABLES `platform_commissions` WRITE;
/*!40000 ALTER TABLE `platform_commissions` DISABLE KEYS */;
INSERT INTO `platform_commissions` VALUES (1,22,2.00,20.00,'tipster_earnings','2025-10-30 23:17:11'),(2,22,2.00,20.00,'tipster_earnings','2025-10-30 23:24:35'),(3,23,5.00,50.00,'tipster_earnings','2025-11-14 18:19:45');
/*!40000 ALTER TABLE `platform_commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform_settings`
--

DROP TABLE IF EXISTS `platform_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `platform_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `value` text NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_settings`
--

LOCK TABLES `platform_settings` WRITE;
/*!40000 ALTER TABLE `platform_settings` DISABLE KEYS */;
INSERT INTO `platform_settings` VALUES (1,'app_name','SmartPicks Pro','Application name','2025-10-26 12:16:54','2025-10-26 12:16:54'),(2,'app_version','1.0.0','Application version','2025-10-26 12:16:54','2025-10-26 12:16:54'),(3,'maintenance_mode','0','Maintenance mode status','2025-10-26 12:16:54','2025-10-26 12:16:54'),(4,'registration_enabled','1','Allow new user registration','2025-10-26 12:16:54','2025-10-26 12:16:54'),(5,'commission_rate','30.0','Platform commission rate (%)','2025-10-26 12:16:54','2025-10-26 12:16:54'),(6,'tipster_rate','70.0','Tipster commission rate (%)','2025-10-26 12:16:54','2025-10-26 12:16:54'),(7,'default_currency','GHS','Default currency','2025-10-26 12:16:54','2025-10-26 12:16:54'),(8,'default_timezone','Africa/Accra','Default timezone','2025-10-26 12:16:54','2025-10-26 12:16:54'),(9,'max_payout','10000.00','Maximum payout amount','2025-10-26 12:16:54','2025-10-26 12:16:54'),(10,'min_payout','50.00','Minimum payout amount','2025-10-26 12:16:54','2025-10-26 12:16:54'),(11,'payout_fee','2.5','Payout processing fee (%)','2025-10-26 12:16:54','2025-10-26 12:16:54'),(12,'chat_enabled','1','Enable chat system','2025-10-26 12:16:54','2025-10-26 12:16:54'),(13,'marketplace_enabled','1','Enable marketplace system','2025-10-26 12:16:54','2025-10-26 12:16:54'),(14,'learning_enabled','1','Enable learning system','2025-10-26 12:16:54','2025-10-26 12:16:54'),(23,'email_enabled','true','Enable email notifications','2025-10-30 23:49:20','2025-10-30 23:49:20'),(24,'email_method','mail','Email sending method','2025-10-30 23:49:20','2025-10-30 23:49:20'),(25,'email_admin_email','admin@betrollover.com','Admin email','2025-10-30 23:49:20','2025-10-30 23:49:20'),(26,'email_from_email','noreply@betrollover.com','From email','2025-10-30 23:49:20','2025-10-30 23:49:20'),(27,'email_from_name','SmartPicks Pro','From name','2025-10-30 23:49:20','2025-10-30 23:49:20');
/*!40000 ALTER TABLE `platform_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referral_codes`
--

DROP TABLE IF EXISTS `referral_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `referral_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `total_uses` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `user_id` (`user_id`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referral_codes`
--

LOCK TABLES `referral_codes` WRITE;
/*!40000 ALTER TABLE `referral_codes` DISABLE KEYS */;
INSERT INTO `referral_codes` VALUES (1,7,'FLYGONPRIEST',1,0,'2025-10-31 07:10:50','2025-10-31 07:10:50'),(2,9,'ANDYCOLE',1,0,'2025-11-14 17:03:59','2025-11-14 17:03:59');
/*!40000 ALTER TABLE `referral_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referral_tracking`
--

DROP TABLE IF EXISTS `referral_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `referral_tracking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `referrer_id` int(11) NOT NULL,
  `referee_id` int(11) NOT NULL,
  `referral_code` varchar(50) NOT NULL,
  `status` enum('pending','completed','cancelled') DEFAULT 'pending',
  `first_deposit_amount` decimal(10,2) DEFAULT NULL,
  `referrer_bonus_paid` decimal(10,2) DEFAULT NULL,
  `bonus_paid` tinyint(1) DEFAULT 0,
  `bonus_paid_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_referral` (`referrer_id`,`referee_id`),
  KEY `referrer_id` (`referrer_id`),
  KEY `referee_id` (`referee_id`),
  KEY `referral_code` (`referral_code`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referral_tracking`
--

LOCK TABLES `referral_tracking` WRITE;
/*!40000 ALTER TABLE `referral_tracking` DISABLE KEYS */;
/*!40000 ALTER TABLE `referral_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(100) NOT NULL,
  `value` text NOT NULL,
  `type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` text DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `idx_key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,'app_name','SmartPicks Pro','string','Application name','2025-10-26 09:59:04'),(2,'app_version','2.0.0','string','Application version','2025-10-26 10:00:52'),(3,'default_currency','GHS','string','Default currency','2025-10-26 09:59:04'),(4,'default_timezone','Africa/Accra','string','Default timezone','2025-10-26 09:59:04'),(5,'commission_rate','30.0','number','Platform commission rate (%)','2025-10-26 09:59:04'),(6,'tipster_rate','70.0','number','Tipster commission rate (%)','2025-10-26 09:59:04'),(7,'payout_fee','10.0','number','Payout processing fee (%)','2025-10-26 10:00:52'),(8,'min_payout','50.00','number','Minimum payout amount','2025-10-26 10:00:52'),(9,'max_payout','10000.00','number','Maximum payout amount','2025-10-26 09:59:04'),(10,'maintenance_mode','false','boolean','Maintenance mode status','2025-10-26 09:59:04'),(11,'registration_enabled','true','boolean','Allow new user registration','2025-10-26 09:59:04'),(12,'chat_enabled','true','boolean','Enable chat system','2025-10-26 09:59:04'),(13,'learning_enabled','true','boolean','Enable learning system','2025-10-26 09:59:04'),(14,'marketplace_enabled','true','boolean','Enable marketplace system','2025-10-26 09:59:04'),(15,'platform_logo','default-logo.png','string','Platform logo file path','2025-10-26 09:59:04'),(16,'min_pick_price','1.00','number','Minimum pick price','2025-10-26 09:59:04'),(17,'max_pick_price','1000.00','number','Maximum pick price','2025-10-26 09:59:04'),(18,'auto_approve_picks','false','boolean','Auto-approve picks without admin review','2025-10-26 09:59:04'),(19,'pick_expiry_hours','24','number','Pick expiry time in hours','2025-10-26 09:59:04'),(20,'max_picks_per_day','10','number','Maximum picks per user per day','2025-10-26 09:59:04'),(21,'min_account_balance','0.00','number','Minimum account balance','2025-10-26 09:59:04'),(22,'verification_required','false','boolean','Require verification for marketplace','2025-10-26 09:59:04'),(23,'max_login_attempts','5','number','Maximum login attempts','2025-10-26 09:59:04'),(24,'session_timeout','3600','number','Session timeout in seconds','2025-10-26 09:59:04'),(25,'password_min_length','6','number','Minimum password length','2025-10-26 09:59:04'),(26,'email_notifications','true','boolean','Enable email notifications','2025-10-26 09:59:04'),(27,'push_notifications','true','boolean','Enable push notifications','2025-10-26 09:59:04'),(28,'admin_notifications','true','boolean','Enable admin notifications','2025-10-26 09:59:04'),(29,'analytics_enabled','true','boolean','Enable analytics tracking','2025-10-26 09:59:04'),(30,'data_retention_days','365','number','Data retention period in days','2025-10-26 09:59:04'),(31,'api_enabled','false','boolean','Enable API access','2025-10-26 09:59:04'),(32,'api_rate_limit','100','number','API rate limit per hour','2025-10-26 09:59:04');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `support_tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `status` enum('open','in_progress','resolved','closed') DEFAULT 'open',
  `assigned_to` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_assigned_to` (`assigned_to`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_tickets_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
INSERT INTO `support_tickets` VALUES (3,2,'Feature Request','Can you add more sports leagues to the platform? Currently limited options.','medium','open',NULL,'2025-10-26 10:12:47','2025-10-26 10:12:47',NULL),(4,2,'Bug Report','The leaderboard is not updating correctly. My wins are not being counted.','high','resolved',NULL,'2025-10-26 10:12:47','2025-10-26 10:12:47',NULL),(6,2,'Account Settings','I want to change my display name and profile picture.','low','resolved',NULL,'2025-10-26 10:12:47','2025-10-26 10:12:47',NULL),(19,1,'Marketplace Issue','Some picks are not showing up in the marketplace search.','medium','open',NULL,'2025-10-26 10:15:13','2025-10-26 10:15:13',NULL),(20,1,'Performance Question','How is my tipster performance calculated? The metrics seem incorrect.','high','in_progress',NULL,'2025-10-26 10:15:13','2025-10-26 10:15:13',NULL),(21,7,'Hello','My Picks won but has not been settle for 5hours now.','high','open',NULL,'2025-10-31 00:22:22','2025-10-31 00:31:42',NULL),(22,7,'Hello','My Picks won but has not been settle for 5hours now.','high','in_progress',NULL,'2025-10-31 00:31:51','2025-10-31 00:48:48',NULL);
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `country_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `country_id` (`country_id`),
  KEY `name` (`name`),
  CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2244 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
INSERT INTO `teams` VALUES (1,1,'Accrington Stanley','2025-10-26 20:31:37'),(2,1,'AFC Wimbledon','2025-10-26 20:31:37'),(3,1,'Arsenal','2025-10-26 20:31:37'),(4,1,'Aston Villa','2025-10-26 20:31:37'),(5,1,'Barnsley','2025-10-26 20:31:37'),(6,1,'Barrow','2025-10-26 20:31:37'),(7,1,'Birmingham City','2025-10-26 20:31:37'),(8,1,'Blackburn Rovers','2025-10-26 20:31:37'),(9,1,'Blackpool','2025-10-26 20:31:37'),(10,1,'Bolton Wanderers','2025-10-26 20:31:37'),(11,1,'Bournemouth','2025-10-26 20:31:37'),(12,1,'Bradford City','2025-10-26 20:31:37'),(13,1,'Brentford','2025-10-26 20:31:37'),(14,1,'Brighton & Hove Albion','2025-10-26 20:31:37'),(15,1,'Bristol City','2025-10-26 20:31:37'),(16,1,'Bristol Rovers','2025-10-26 20:31:37'),(17,1,'Bromley','2025-10-26 20:31:37'),(18,1,'Burnley','2025-10-26 20:31:37'),(19,1,'Burton Albion','2025-10-26 20:31:37'),(20,1,'Cambridge United','2025-10-26 20:31:37'),(21,1,'Cardiff City','2025-10-26 20:31:37'),(22,1,'Carlisle United','2025-10-26 20:31:37'),(23,1,'Charlton Athletic','2025-10-26 20:31:37'),(24,1,'Chelsea','2025-10-26 20:31:37'),(25,1,'Cheltenham Town','2025-10-26 20:31:37'),(26,1,'Chesterfield','2025-10-26 20:31:37'),(27,1,'Colchester United','2025-10-26 20:31:37'),(28,1,'Coventry City','2025-10-26 20:31:37'),(29,1,'Crawley Town','2025-10-26 20:31:37'),(30,1,'Crewe Alexandra','2025-10-26 20:31:37'),(31,1,'Crystal Palace','2025-10-26 20:31:37'),(32,1,'Derby County','2025-10-26 20:31:37'),(33,1,'Doncaster Rovers','2025-10-26 20:31:37'),(34,1,'Everton','2025-10-26 20:31:37'),(35,1,'Exeter City','2025-10-26 20:31:37'),(36,1,'Fleetwood Town','2025-10-26 20:31:37'),(37,1,'Fulham','2025-10-26 20:31:37'),(38,1,'Gillingham','2025-10-26 20:31:37'),(39,1,'Grimsby Town','2025-10-26 20:31:37'),(40,1,'Harrogate Town','2025-10-26 20:31:37'),(41,1,'Huddersfield Town','2025-10-26 20:31:37'),(42,1,'Hull City','2025-10-26 20:31:37'),(43,1,'Ipswich Town','2025-10-26 20:31:37'),(44,1,'Leeds United','2025-10-26 20:31:37'),(45,1,'Leicester City','2025-10-26 20:31:37'),(46,1,'Leyton Orient','2025-10-26 20:31:37'),(47,1,'Lincoln City','2025-10-26 20:31:37'),(48,1,'Liverpool','2025-10-26 20:31:37'),(49,1,'Luton Town','2025-10-26 20:31:37'),(50,1,'Manchester City','2025-10-26 20:31:37'),(51,1,'Manchester United','2025-10-26 20:31:37'),(52,1,'Mansfield Town','2025-10-26 20:31:37'),(53,1,'Middlesbrough','2025-10-26 20:31:37'),(54,1,'Millwall','2025-10-26 20:31:37'),(55,1,'Milton Keynes Dons','2025-10-26 20:31:37'),(56,1,'Morecambe','2025-10-26 20:31:37'),(57,1,'Newcastle United','2025-10-26 20:31:37'),(58,1,'Newport County','2025-10-26 20:31:37'),(59,1,'Northampton Town','2025-10-26 20:31:37'),(60,1,'Norwich City','2025-10-26 20:31:37'),(61,1,'Nottingham Forest','2025-10-26 20:31:37'),(62,1,'Notts County','2025-10-26 20:31:37'),(63,1,'Oxford United','2025-10-26 20:31:37'),(64,1,'Peterborough United','2025-10-26 20:31:37'),(65,1,'Plymouth Argyle','2025-10-26 20:31:37'),(66,1,'Port Vale','2025-10-26 20:31:37'),(67,1,'Portsmouth','2025-10-26 20:31:37'),(68,1,'Preston North End','2025-10-26 20:31:37'),(69,1,'Queens Park Rangers','2025-10-26 20:31:37'),(70,1,'Reading','2025-10-26 20:31:37'),(71,1,'Rotherham United','2025-10-26 20:31:37'),(72,1,'Salford City','2025-10-26 20:31:37'),(73,1,'Sheffield United','2025-10-26 20:31:37'),(74,1,'Sheffield Wednesday','2025-10-26 20:31:37'),(75,1,'Shrewsbury Town','2025-10-26 20:31:37'),(76,1,'Southampton','2025-10-26 20:31:37'),(77,1,'Stevenage','2025-10-26 20:31:37'),(78,1,'Stockport County','2025-10-26 20:31:37'),(79,1,'Stoke City','2025-10-26 20:31:37'),(80,1,'Sunderland','2025-10-26 20:31:37'),(81,1,'Swansea City','2025-10-26 20:31:37'),(82,1,'Swindon Town','2025-10-26 20:31:37'),(83,1,'Tottenham Hotspur','2025-10-26 20:31:37'),(84,1,'Tranmere Rovers','2025-10-26 20:31:37'),(85,1,'Walsall','2025-10-26 20:31:37'),(86,1,'Watford','2025-10-26 20:31:37'),(87,1,'West Bromwich Albion','2025-10-26 20:31:37'),(88,1,'West Ham United','2025-10-26 20:31:37'),(89,1,'Wigan Athletic','2025-10-26 20:31:37'),(90,1,'Wolverhampton Wanderers','2025-10-26 20:31:37'),(91,1,'Wrexham','2025-10-26 20:31:37'),(92,1,'Wycombe Wanderers','2025-10-26 20:31:37'),(93,2,'AD Ceuta FC','2025-10-26 20:31:37'),(94,2,'AD Mérida','2025-10-26 20:31:37'),(95,2,'Albacete Balompié','2025-10-26 20:31:37'),(96,2,'Alcorcón','2025-10-26 20:31:37'),(97,2,'Algeciras CF','2025-10-26 20:31:37'),(98,2,'Almería','2025-10-26 20:31:37'),(99,2,'Antequera CF','2025-10-26 20:31:37'),(100,2,'Arenteiro','2025-10-26 20:31:37'),(101,2,'Athletic Bilbao','2025-10-26 20:31:37'),(102,2,'Atlético Baleares','2025-10-26 20:31:37'),(103,2,'Atlético Madrid','2025-10-26 20:31:37'),(104,2,'Atlético Madrid B','2025-10-26 20:31:37'),(105,2,'Atlético Sanluqueño','2025-10-26 20:31:37'),(106,2,'Barakaldo CF','2025-10-26 20:31:37'),(107,2,'Barcelona','2025-10-26 20:31:37'),(108,2,'Barcelona Atlètic','2025-10-26 20:31:37'),(109,2,'Betis Deportivo','2025-10-26 20:31:37'),(110,2,'Burgos CF','2025-10-26 20:31:37'),(111,2,'Cádiz CF','2025-10-26 20:31:37'),(112,2,'Cartagena','2025-10-26 20:31:37'),(113,2,'Castellón','2025-10-26 20:31:37'),(114,2,'CD Alcoyano','2025-10-26 20:31:37'),(115,2,'CD Eldense','2025-10-26 20:31:37'),(116,2,'CD Lugo','2025-10-26 20:31:37'),(117,2,'CD Mirandés','2025-10-26 20:31:37'),(118,2,'CE Andratx','2025-10-26 20:31:37'),(119,2,'Celta Fortuna','2025-10-26 20:31:37'),(120,2,'Celta Vigo','2025-10-26 20:31:37'),(121,2,'CF Fuenlabrada','2025-10-26 20:31:37'),(122,2,'CF Intercity','2025-10-26 20:31:37'),(123,2,'CF Peña Deportiva','2025-10-26 20:31:37'),(124,2,'Córdoba CF','2025-10-26 20:31:37'),(125,2,'CP Villarrobledo','2025-10-26 20:31:37'),(126,2,'Cultural Leonesa','2025-10-26 20:31:37'),(127,2,'Deportivo Alavés','2025-10-26 20:31:37'),(128,2,'Deportivo Fabril','2025-10-26 20:31:37'),(129,2,'Deportivo La Coruña','2025-10-26 20:31:37'),(130,2,'Elche CF','2025-10-26 20:31:37'),(131,2,'Espanyol','2025-10-26 20:31:37'),(132,2,'Getafe','2025-10-26 20:31:37'),(133,2,'Gimnàstic de Tarragona','2025-10-26 20:31:37'),(134,2,'Girona','2025-10-26 20:31:37'),(135,2,'Granada CF','2025-10-26 20:31:37'),(136,2,'Hércules CF','2025-10-26 20:31:37'),(137,2,'Las Palmas','2025-10-26 20:31:37'),(138,2,'Leganés','2025-10-26 20:31:37'),(139,2,'Levante UD','2025-10-26 20:31:37'),(140,2,'Málaga CF','2025-10-26 20:31:37'),(141,2,'Mallorca','2025-10-26 20:31:37'),(142,2,'Marbella FC','2025-10-26 20:31:37'),(143,2,'Osasuna','2025-10-26 20:31:37'),(144,2,'Pontevedra CF','2025-10-26 20:31:37'),(145,2,'Racing Ferrol','2025-10-26 20:31:37'),(146,2,'Racing Santander','2025-10-26 20:31:37'),(147,2,'Rayo Vallecano','2025-10-26 20:31:37'),(148,2,'Real Betis','2025-10-26 20:31:37'),(149,2,'Real Madrid','2025-10-26 20:31:37'),(150,2,'Real Madrid Castilla','2025-10-26 20:31:37'),(151,2,'Real Oviedo','2025-10-26 20:31:37'),(152,2,'Real Sociedad','2025-10-26 20:31:37'),(153,2,'Real Unión','2025-10-26 20:31:37'),(154,2,'Real Valladolid','2025-10-26 20:31:37'),(155,2,'Real Zaragoza','2025-10-26 20:31:37'),(156,2,'RM Castilla','2025-10-26 20:31:37'),(157,2,'SD Amorebieta','2025-10-26 20:31:37'),(158,2,'SD Eibar','2025-10-26 20:31:37'),(159,2,'SD Huesca','2025-10-26 20:31:37'),(160,2,'SD Logroñés','2025-10-26 20:31:37'),(161,2,'SD Ponferradina','2025-10-26 20:31:37'),(162,2,'Sestao River','2025-10-26 20:31:37'),(163,2,'Sevilla','2025-10-26 20:31:37'),(164,2,'Sevilla Atlético','2025-10-26 20:31:37'),(165,2,'Sporting Gijón','2025-10-26 20:31:37'),(166,2,'Tarazona','2025-10-26 20:31:37'),(167,2,'Tenerife','2025-10-26 20:31:37'),(168,2,'UD Barbastro','2025-10-26 20:31:37'),(169,2,'UD Ibiza','2025-10-26 20:31:37'),(170,2,'UD Logroñés','2025-10-26 20:31:37'),(171,2,'UD Socuéllamos','2025-10-26 20:31:37'),(172,2,'Unionistas de Salamanca','2025-10-26 20:31:37'),(173,2,'Valencia','2025-10-26 20:31:37'),(174,2,'Villarreal','2025-10-26 20:31:37'),(175,2,'Villarreal B','2025-10-26 20:31:37'),(176,2,'Yeclano Deportivo','2025-10-26 20:31:37'),(177,3,'FC Heidenheim','2025-10-26 20:31:37'),(178,3,'FC Kaiserslautern','2025-10-26 20:31:37'),(179,3,'FC Köln','2025-10-26 20:31:37'),(180,3,'FC Nürnberg','2025-10-26 20:31:37'),(181,3,'FSV Mainz 05','2025-10-26 20:31:37'),(182,3,'Alemannia Aachen','2025-10-26 20:31:37'),(183,3,'Arminia Bielefeld','2025-10-26 20:31:37'),(184,3,'Bayer Leverkusen','2025-10-26 20:31:37'),(185,3,'Borussia Dortmund','2025-10-26 20:31:37'),(186,3,'Borussia Dortmund II','2025-10-26 20:31:37'),(187,3,'Borussia Mönchengladbach','2025-10-26 20:31:37'),(188,3,'Dynamo Dresden','2025-10-26 20:31:37'),(189,3,'Eintracht Braunschweig','2025-10-26 20:31:37'),(190,3,'Eintracht Frankfurt','2025-10-26 20:31:37'),(191,3,'Erzgebirge Aue','2025-10-26 20:31:37'),(192,3,'FC Augsburg','2025-10-26 20:31:37'),(193,3,'FC Bayern München','2025-10-26 20:31:37'),(194,3,'FC Energie Cottbus','2025-10-26 20:31:37'),(195,3,'FC Ingolstadt 04','2025-10-26 20:31:37'),(196,3,'FC Magdeburg','2025-10-26 20:31:37'),(197,3,'FC Saarbrücken','2025-10-26 20:31:37'),(198,3,'FC Schalke 04','2025-10-26 20:31:37'),(199,3,'FC St. Pauli','2025-10-26 20:31:37'),(200,3,'FC Viktoria Köln','2025-10-26 20:31:37'),(201,3,'Fortuna Düsseldorf','2025-10-26 20:31:37'),(202,3,'Hamburger SV','2025-10-26 20:31:37'),(203,3,'Hannover 96','2025-10-26 20:31:37'),(204,3,'Hannover 96 II','2025-10-26 20:31:37'),(205,3,'Hansa Rostock','2025-10-26 20:31:37'),(206,3,'Hertha BSC','2025-10-26 20:31:37'),(207,3,'Holstein Kiel','2025-10-26 20:31:37'),(208,3,'Karlsruher SC','2025-10-26 20:31:37'),(209,3,'RB Leipzig','2025-10-26 20:31:37'),(210,3,'Rot-Weiss Essen','2025-10-26 20:31:37'),(211,3,'SC Freiburg','2025-10-26 20:31:37'),(212,3,'SC Paderborn 07','2025-10-26 20:31:37'),(213,3,'SC Verl','2025-10-26 20:31:37'),(214,3,'SpVgg Greuther Fürth','2025-10-26 20:31:37'),(215,3,'SpVgg Unterhaching','2025-10-26 20:31:37'),(216,3,'SSV Jahn Regensburg','2025-10-26 20:31:37'),(217,3,'SSV Ulm 1846','2025-10-26 20:31:37'),(218,3,'SV Darmstadt 98','2025-10-26 20:31:37'),(219,3,'SV Elversberg','2025-10-26 20:31:37'),(220,3,'SV Sandhausen','2025-10-26 20:31:37'),(221,3,'SV Wehen Wiesbaden','2025-10-26 20:31:37'),(222,3,'TSG Hoffenheim','2025-10-26 20:31:37'),(223,3,'TSV 1860 München','2025-10-26 20:31:37'),(224,3,'Union Berlin','2025-10-26 20:31:37'),(225,3,'VfB Stuttgart','2025-10-26 20:31:37'),(226,3,'VfB Stuttgart II','2025-10-26 20:31:37'),(227,3,'VfL Bochum','2025-10-26 20:31:37'),(228,3,'VfL Osnabrück','2025-10-26 20:31:37'),(229,3,'VfL Wolfsburg','2025-10-26 20:31:37'),(230,3,'Waldhof Mannheim','2025-10-26 20:31:37'),(231,3,'Werder Bremen','2025-10-26 20:31:37'),(232,4,'AC Milan','2025-10-26 20:31:37'),(233,4,'Albinoleffe','2025-10-26 20:31:37'),(234,4,'Alcione Milano','2025-10-26 20:31:37'),(235,4,'Arezzo','2025-10-26 20:31:37'),(236,4,'Arzignano Valchiampo','2025-10-26 20:31:37'),(237,4,'AS Roma','2025-10-26 20:31:37'),(238,4,'Ascoli','2025-10-26 20:31:37'),(239,4,'Atalanta','2025-10-26 20:31:37'),(240,4,'Atalanta U23','2025-10-26 20:31:37'),(241,4,'Bologna','2025-10-26 20:31:37'),(242,4,'Bari','2025-10-26 20:31:37'),(243,4,'Brescia','2025-10-26 20:31:37'),(244,4,'Cagliari','2025-10-26 20:31:37'),(245,4,'Caldiero Terme','2025-10-26 20:31:37'),(246,4,'Campobasso','2025-10-26 20:31:37'),(247,4,'Carpi','2025-10-26 20:31:37'),(248,4,'Carrarese','2025-10-26 20:31:37'),(249,4,'Catanzaro','2025-10-26 20:31:37'),(250,4,'Cesena','2025-10-26 20:31:37'),(251,4,'Cittadella','2025-10-26 20:31:37'),(252,4,'Como','2025-10-26 20:31:37'),(253,4,'Cosenza','2025-10-26 20:31:37'),(254,4,'Cremonese','2025-10-26 20:31:37'),(255,4,'Empoli','2025-10-26 20:31:37'),(256,4,'Feralpisalò','2025-10-26 20:31:37'),(257,4,'Fiorentina','2025-10-26 20:31:37'),(258,4,'Frosinone','2025-10-26 20:31:37'),(259,4,'Genoa','2025-10-26 20:31:37'),(260,4,'Giana Erminio','2025-10-26 20:31:37'),(261,4,'Gubbio','2025-10-26 20:31:37'),(262,4,'Hellas Verona','2025-10-26 20:31:37'),(263,4,'Inter Milan','2025-10-26 20:31:37'),(264,4,'Juve Stabia','2025-10-26 20:31:37'),(265,4,'Juventus','2025-10-26 20:31:37'),(266,4,'Lazio','2025-10-26 20:31:37'),(267,4,'Lecce','2025-10-26 20:31:37'),(268,4,'Lecco','2025-10-26 20:31:37'),(269,4,'Legnago Salus','2025-10-26 20:31:37'),(270,4,'Lucchese','2025-10-26 20:31:37'),(271,4,'Lumezzane','2025-10-26 20:31:37'),(272,4,'Mantova','2025-10-26 20:31:37'),(273,4,'Milan Futuro','2025-10-26 20:31:37'),(274,4,'Modena','2025-10-26 20:31:37'),(275,4,'Monza','2025-10-26 20:31:37'),(276,4,'Napoli','2025-10-26 20:31:37'),(277,4,'Novara','2025-10-26 20:31:37'),(278,4,'Padova','2025-10-26 20:31:37'),(279,4,'Palermo','2025-10-26 20:31:37'),(280,4,'Parma','2025-10-26 20:31:37'),(281,4,'Pergolettese','2025-10-26 20:31:37'),(282,4,'Perugia','2025-10-26 20:31:37'),(283,4,'Pescara','2025-10-26 20:31:37'),(284,4,'Pianese','2025-10-26 20:31:37'),(285,4,'Pineto','2025-10-26 20:31:37'),(286,4,'Pisa','2025-10-26 20:31:37'),(287,4,'Pontedera','2025-10-26 20:31:37'),(288,4,'Pro Patria','2025-10-26 20:31:37'),(289,4,'Pro Vercelli','2025-10-26 20:31:37'),(290,4,'Reggiana','2025-10-26 20:31:37'),(291,4,'Renate','2025-10-26 20:31:37'),(292,4,'Rimini','2025-10-26 20:31:37'),(293,4,'Salernitana','2025-10-26 20:31:37'),(294,4,'Sampdoria','2025-10-26 20:31:37'),(295,4,'Sassuolo','2025-10-26 20:31:37'),(296,4,'Sestri Levante','2025-10-26 20:31:37'),(297,4,'SPAL','2025-10-26 20:31:37'),(298,4,'Spezia','2025-10-26 20:31:37'),(299,4,'Südtirol','2025-10-26 20:31:37'),(300,4,'Ternana','2025-10-26 20:31:37'),(301,4,'Torino','2025-10-26 20:31:37'),(302,4,'Torres','2025-10-26 20:31:37'),(303,4,'Trento','2025-10-26 20:31:37'),(304,4,'Triestina','2025-10-26 20:31:37'),(305,4,'Udinese','2025-10-26 20:31:37'),(306,4,'Union Clodiense','2025-10-26 20:31:37'),(307,4,'Venezia','2025-10-26 20:31:37'),(308,4,'Vicenza','2025-10-26 20:31:37'),(309,4,'Virtus Entella','2025-10-26 20:31:37'),(310,4,'Virtus Verona','2025-10-26 20:31:37'),(311,4,'Vis Pesaro','2025-10-26 20:31:37'),(312,5,'AC Ajaccio','2025-10-26 20:31:37'),(313,5,'Amiens SC','2025-10-26 20:31:37'),(314,5,'Angers SCO','2025-10-26 20:31:37'),(315,5,'Annecy FC','2025-10-26 20:31:37'),(316,5,'AS Monaco','2025-10-26 20:31:37'),(317,5,'AS Saint-Étienne','2025-10-26 20:31:37'),(318,5,'Aubagne','2025-10-26 20:31:37'),(319,5,'AJ Auxerre','2025-10-26 20:31:37'),(320,5,'Avranches','2025-10-26 20:31:37'),(321,5,'Bourg-en-Bresse','2025-10-26 20:31:37'),(322,5,'Chamois Niortais','2025-10-26 20:31:37'),(323,5,'Châteauroux','2025-10-26 20:31:37'),(324,5,'Cholet','2025-10-26 20:31:37'),(325,5,'Clermont Foot','2025-10-26 20:31:37'),(326,5,'Dijon FCO','2025-10-26 20:31:37'),(327,5,'Dunkerque','2025-10-26 20:31:37'),(328,5,'Épinal','2025-10-26 20:31:37'),(329,5,'FC Lorient','2025-10-26 20:31:37'),(330,5,'FC Martigues','2025-10-26 20:31:37'),(331,5,'FC Metz','2025-10-26 20:31:37'),(332,5,'FC Sochaux-Montbéliard','2025-10-26 20:31:37'),(333,5,'FC Valenciennes','2025-10-26 20:31:37'),(334,5,'FC Versailles','2025-10-26 20:31:37'),(335,5,'FC Villefranche','2025-10-26 20:31:37'),(336,5,'Grenoble Foot 38','2025-10-26 20:31:37'),(337,5,'Guingamp','2025-10-26 20:31:37'),(338,5,'Istres FC','2025-10-26 20:31:37'),(339,5,'Le Havre AC','2025-10-26 20:31:37'),(340,5,'Le Mans FC','2025-10-26 20:31:37'),(341,5,'Lille OSC','2025-10-26 20:31:37'),(342,5,'Montpellier HSC','2025-10-26 20:31:37'),(343,5,'Nancy','2025-10-26 20:31:37'),(344,5,'Nantes','2025-10-26 20:31:37'),(345,5,'Nantes II','2025-10-26 20:31:37'),(346,5,'Nîmes Olympique','2025-10-26 20:31:37'),(347,5,'OGC Nice','2025-10-26 20:31:37'),(348,5,'Olympique de Marseille','2025-10-26 20:31:37'),(349,5,'Olympique Lyonnais','2025-10-26 20:31:37'),(350,5,'Paris 13 Atletico','2025-10-26 20:31:37'),(351,5,'Paris FC','2025-10-26 20:31:37'),(352,5,'Paris Saint-Germain','2025-10-26 20:31:37'),(353,5,'Pau FC','2025-10-26 20:31:37'),(354,5,'RC Lens','2025-10-26 20:31:37'),(355,5,'RC Strasbourg Alsace','2025-10-26 20:31:37'),(356,5,'Red Star FC','2025-10-26 20:31:37'),(357,5,'Rodez AF','2025-10-26 20:31:37'),(358,5,'SC Bastia','2025-10-26 20:31:37'),(359,5,'Sète','2025-10-26 20:31:37'),(360,5,'SM Caen','2025-10-26 20:31:37'),(361,5,'Stade Brestois 29','2025-10-26 20:31:37'),(362,5,'Stade de Reims','2025-10-26 20:31:37'),(363,5,'Stade Lavallois','2025-10-26 20:31:37'),(364,5,'Stade Rennais','2025-10-26 20:31:37'),(365,5,'Toulouse FC','2025-10-26 20:31:37'),(366,5,'Troyes AC','2025-10-26 20:31:37'),(367,5,'US Boulogne','2025-10-26 20:31:37'),(368,5,'US Concarneau','2025-10-26 20:31:37'),(369,5,'US Orléans','2025-10-26 20:31:37'),(370,5,'US Quevilly-Rouen','2025-10-26 20:31:37'),(371,5,'USL Dunkerque','2025-10-26 20:31:37'),(743,11,'AVS','2025-10-26 21:28:27'),(744,11,'Académica de Coimbra','2025-10-26 21:28:27'),(745,11,'Académico de Viseu','2025-10-26 21:28:27'),(746,11,'Alverca','2025-10-26 21:28:27'),(747,11,'Arouca','2025-10-26 21:28:27'),(748,11,'Benfica','2025-10-26 21:28:27'),(749,11,'Boavista','2025-10-26 21:28:27'),(750,11,'Braga','2025-10-26 21:28:27'),(751,11,'Casa Pia','2025-10-26 21:28:27'),(752,11,'Chaves','2025-10-26 21:28:27'),(753,11,'Estrela da Amadora','2025-10-26 21:28:27'),(754,11,'Estoril Praia','2025-10-26 21:28:27'),(755,11,'Famalicão','2025-10-26 21:28:27'),(756,11,'Farense','2025-10-26 21:28:27'),(757,11,'Felgueiras','2025-10-26 21:28:27'),(758,11,'FC Porto','2025-10-26 21:28:27'),(759,11,'Gil Vicente','2025-10-26 21:28:27'),(760,11,'Leixões','2025-10-26 21:28:27'),(761,11,'Marítimo','2025-10-26 21:28:27'),(762,11,'Mafra','2025-10-26 21:28:27'),(763,11,'Moreirense','2025-10-26 21:28:27'),(764,11,'Nacional','2025-10-26 21:28:27'),(765,11,'Oliveirense','2025-10-26 21:28:27'),(766,11,'Paços de Ferreira','2025-10-26 21:28:27'),(767,11,'Penafiel','2025-10-26 21:28:27'),(768,11,'Portimonense','2025-10-26 21:28:27'),(769,11,'Rio Ave','2025-10-26 21:28:27'),(770,11,'Santa Clara','2025-10-26 21:28:27'),(771,11,'Sporting CP','2025-10-26 21:28:27'),(772,11,'Tondela','2025-10-26 21:28:27'),(773,11,'Torreense','2025-10-26 21:28:27'),(774,11,'União de Leiria','2025-10-26 21:28:27'),(775,11,'Vitória Guimarães','2025-10-26 21:28:27'),(776,11,'Vizela','2025-10-26 21:28:27'),(777,11,'Benfica B','2025-10-26 21:28:27'),(778,11,'Porto B','2025-10-26 21:28:27'),(779,11,'Sporting B','2025-10-26 21:28:27'),(780,11,'Feirense','2025-10-26 21:28:27'),(781,11,'Varzim','2025-10-26 21:28:27'),(782,11,'Freamunde','2025-10-26 21:28:27'),(783,11,'Covilhã','2025-10-26 21:28:27'),(784,11,'Leiria','2025-10-26 21:28:27'),(785,11,'Oliveira do Hospital','2025-10-26 21:28:27'),(786,11,'Lusitânia','2025-10-26 21:28:27'),(787,11,'Anadia','2025-10-26 21:28:27'),(788,11,'Caldas','2025-10-26 21:28:27'),(789,11,'Amora','2025-10-26 21:28:27'),(790,11,'Cova da Piedade','2025-10-26 21:28:27'),(791,11,'Real','2025-10-26 21:28:27'),(792,11,'Académico Viseu','2025-10-26 21:28:27'),(793,11,'Oliveira Hospital','2025-10-26 21:28:27'),(794,12,'ADO Den Haag','2025-10-26 21:28:27'),(795,12,'Ajax','2025-10-26 21:28:27'),(796,12,'AZ Alkmaar','2025-10-26 21:28:27'),(797,12,'Almere City','2025-10-26 21:28:27'),(798,12,'Cambuur','2025-10-26 21:28:27'),(799,12,'De Graafschap','2025-10-26 21:28:27'),(800,12,'Dordrecht','2025-10-26 21:28:27'),(801,12,'Emmen','2025-10-26 21:28:27'),(802,12,'Excelsior','2025-10-26 21:28:27'),(803,12,'FC Eindhoven','2025-10-26 21:28:27'),(804,12,'FC Groningen','2025-10-26 21:28:27'),(805,12,'FC Twente','2025-10-26 21:28:27'),(806,12,'FC Utrecht','2025-10-26 21:28:27'),(807,12,'FC Volendam','2025-10-26 21:28:27'),(808,12,'Feyenoord','2025-10-26 21:28:27'),(809,12,'Fortuna Sittard','2025-10-26 21:28:27'),(810,12,'Go Ahead Eagles','2025-10-26 21:28:27'),(811,12,'Helmond Sport','2025-10-26 21:28:27'),(812,12,'Heracles Almelo','2025-10-26 21:28:27'),(813,12,'Jong Ajax','2025-10-26 21:28:27'),(814,12,'Jong AZ','2025-10-26 21:28:27'),(815,12,'Jong PSV','2025-10-26 21:28:27'),(816,12,'Jong Utrecht','2025-10-26 21:28:27'),(817,12,'MVV Maastricht','2025-10-26 21:28:27'),(818,12,'NAC Breda','2025-10-26 21:28:27'),(819,12,'NEC Nijmegen','2025-10-26 21:28:27'),(820,12,'PEC Zwolle','2025-10-26 21:28:27'),(821,12,'PSV Eindhoven','2025-10-26 21:28:27'),(822,12,'RKC Waalwijk','2025-10-26 21:28:27'),(823,12,'Roda JC','2025-10-26 21:28:27'),(824,12,'Sparta Rotterdam','2025-10-26 21:28:27'),(825,12,'Telstar','2025-10-26 21:28:27'),(826,12,'TOP Oss','2025-10-26 21:28:27'),(827,12,'VVV-Venlo','2025-10-26 21:28:27'),(828,12,'Vitesse','2025-10-26 21:28:27'),(829,12,'Willem II','2025-10-26 21:28:27'),(830,12,'sc Heerenveen','2025-10-26 21:28:27'),(831,12,'Almere City FC','2025-10-26 21:28:27'),(832,13,'Anderlecht','2025-10-26 21:29:06'),(833,13,'Antwerp','2025-10-26 21:29:06'),(834,13,'Beerschot','2025-10-26 21:29:06'),(835,13,'Cercle Brugge','2025-10-26 21:29:06'),(836,13,'Charleroi','2025-10-26 21:29:06'),(837,13,'Club Brugge','2025-10-26 21:29:06'),(838,13,'Deinze','2025-10-26 21:29:06'),(839,13,'Eupen','2025-10-26 21:29:06'),(840,13,'Genk','2025-10-26 21:29:06'),(841,13,'Gent','2025-10-26 21:29:06'),(842,13,'KV Kortrijk','2025-10-26 21:29:06'),(843,13,'KV Mechelen','2025-10-26 21:29:06'),(844,13,'Lommel SK','2025-10-26 21:29:06'),(845,13,'OH Leuven','2025-10-26 21:29:06'),(846,13,'RWDM','2025-10-26 21:29:06'),(847,13,'RFC Liège','2025-10-26 21:29:06'),(848,13,'Sint-Truiden','2025-10-26 21:29:06'),(849,13,'Standard Liège','2025-10-26 21:29:06'),(850,13,'Union Saint-Gilloise','2025-10-26 21:29:06'),(851,13,'Westerlo','2025-10-26 21:29:06'),(852,13,'Club NXT','2025-10-26 21:29:06'),(853,13,'Beveren','2025-10-26 21:29:06'),(854,13,'Lierse Kempenzonen','2025-10-26 21:29:06'),(855,13,'Patro Eisden','2025-10-26 21:29:06'),(856,13,'RFC Seraing','2025-10-26 21:29:06'),(857,13,'KMSK Deinze','2025-10-26 21:29:06'),(858,13,'Virton','2025-10-26 21:29:06'),(859,13,'Francs Borains','2025-10-26 21:29:06'),(860,13,'Jong Genk','2025-10-26 21:29:06'),(861,13,'Oostende','2025-10-26 21:29:06'),(862,13,'Tubize-Braine','2025-10-26 21:29:06'),(863,13,'Waasland-Beveren','2025-10-26 21:29:06'),(864,13,'Zulte Waregem','2025-10-26 21:29:06'),(865,13,'Lommel United','2025-10-26 21:29:06'),(866,14,'Adana Demirspor','2025-10-26 21:29:06'),(867,14,'Alanyaspor','2025-10-26 21:29:06'),(868,14,'Ankaragücü','2025-10-26 21:29:06'),(869,14,'Antalyaspor','2025-10-26 21:29:06'),(870,14,'Başakşehir','2025-10-26 21:29:06'),(871,14,'Beşiktaş','2025-10-26 21:29:06'),(872,14,'Bodrum FK','2025-10-26 21:29:06'),(873,14,'Çaykur Rizespor','2025-10-26 21:29:06'),(874,14,'Eyüpspor','2025-10-26 21:29:06'),(875,14,'Fenerbahçe','2025-10-26 21:29:06'),(876,14,'Galatasaray','2025-10-26 21:29:06'),(877,14,'Gaziantep FK','2025-10-26 21:29:06'),(878,14,'Göztepe','2025-10-26 21:29:06'),(879,14,'Hatayspor','2025-10-26 21:29:06'),(880,14,'Kasımpaşa','2025-10-26 21:29:06'),(881,14,'Kayserispor','2025-10-26 21:29:06'),(882,14,'Konyaspor','2025-10-26 21:29:06'),(883,14,'Samsunspor','2025-10-26 21:29:06'),(884,14,'Sivasspor','2025-10-26 21:29:06'),(885,14,'Trabzonspor','2025-10-26 21:29:06'),(886,14,'Adanaspor','2025-10-26 21:29:06'),(887,14,'Bandırmaspor','2025-10-26 21:29:06'),(888,14,'Boluspor','2025-10-26 21:29:06'),(889,14,'Erzurumspor','2025-10-26 21:29:06'),(890,14,'Giresunspor','2025-10-26 21:29:06'),(891,14,'Gençlerbirliği','2025-10-26 21:29:06'),(892,14,'İstanbulspor','2025-10-26 21:29:06'),(893,14,'Karagümrük','2025-10-26 21:29:06'),(894,14,'Keçiörengücü','2025-10-26 21:29:06'),(895,14,'Manisa FK','2025-10-26 21:29:06'),(896,14,'Pendikspor','2025-10-26 21:29:06'),(897,14,'Sakaryaspor','2025-10-26 21:29:06'),(898,14,'Şanlıurfaspor','2025-10-26 21:29:06'),(899,14,'Ümraniyespor','2025-10-26 21:29:06'),(900,14,'Yeni Malatyaspor','2025-10-26 21:29:06'),(901,14,'İgdir FK','2025-10-26 21:29:06'),(902,15,'Aberdeen','2025-10-26 21:29:06'),(903,15,'Celtic','2025-10-26 21:29:06'),(904,15,'Dundee','2025-10-26 21:29:06'),(905,15,'Dundee United','2025-10-26 21:29:06'),(906,15,'Hearts','2025-10-26 21:29:06'),(907,15,'Hibernian','2025-10-26 21:29:06'),(908,15,'Kilmarnock','2025-10-26 21:29:06'),(909,15,'Livingston','2025-10-26 21:29:06'),(910,15,'Motherwell','2025-10-26 21:29:06'),(911,15,'Rangers','2025-10-26 21:29:06'),(912,15,'Ross County','2025-10-26 21:29:06'),(913,15,'St Johnstone','2025-10-26 21:29:06'),(914,15,'St Mirren','2025-10-26 21:29:06'),(915,15,'Airdrieonians','2025-10-26 21:29:06'),(916,15,'Alloa Athletic','2025-10-26 21:29:06'),(917,15,'Arbroath','2025-10-26 21:29:06'),(918,15,'Ayr United','2025-10-26 21:29:06'),(919,15,'Dunfermline Athletic','2025-10-26 21:29:06'),(920,15,'Greenock Morton','2025-10-26 21:29:06'),(921,15,'Hamilton Academical','2025-10-26 21:29:06'),(922,15,'Inverness Caledonian Thistle','2025-10-26 21:29:06'),(923,15,'Partick Thistle','2025-10-26 21:29:06'),(924,15,'Queen\'s Park','2025-10-26 21:29:06'),(925,15,'Raith Rovers','2025-10-26 21:29:06'),(926,15,'Airdrie United','2025-10-26 21:29:06'),(927,15,'Albion Rovers','2025-10-26 21:29:06'),(928,15,'Annan Athletic','2025-10-26 21:29:06'),(929,15,'Bonnyrigg Rose','2025-10-26 21:29:06'),(930,15,'Clyde','2025-10-26 21:29:06'),(931,15,'Cove Rangers','2025-10-26 21:29:06'),(932,15,'Dumbarton','2025-10-26 21:29:06'),(933,15,'East Fife','2025-10-26 21:29:06'),(934,15,'Edinburgh City','2025-10-26 21:29:06'),(935,15,'Elgin City','2025-10-26 21:29:06'),(936,15,'Falkirk','2025-10-26 21:29:06'),(937,15,'Forfar Athletic','2025-10-26 21:29:06'),(938,15,'Kelty Hearts','2025-10-26 21:29:06'),(939,15,'Montrose','2025-10-26 21:29:06'),(940,15,'Peterhead','2025-10-26 21:29:06'),(941,15,'Queen of the South','2025-10-26 21:29:06'),(942,15,'Stenhousemuir','2025-10-26 21:29:06'),(943,15,'Stirling Albion','2025-10-26 21:29:06'),(944,16,'CSKA Moscow','2025-10-26 21:29:31'),(945,16,'Dynamo Moscow','2025-10-26 21:29:31'),(946,16,'FC Krasnodar','2025-10-26 21:29:31'),(947,16,'FC Rostov','2025-10-26 21:29:31'),(948,16,'FK Akhmat Grozny','2025-10-26 21:29:31'),(949,16,'Khimki','2025-10-26 21:29:31'),(950,16,'Krylia Sovetov Samara','2025-10-26 21:29:31'),(951,16,'Lokomotiv Moscow','2025-10-26 21:29:31'),(952,16,'Orenburg','2025-10-26 21:29:31'),(953,16,'Rubin Kazan','2025-10-26 21:29:31'),(954,16,'Spartak Moscow','2025-10-26 21:29:31'),(955,16,'Torpedo Moscow','2025-10-26 21:29:31'),(956,16,'Zenit St Petersburg','2025-10-26 21:29:31'),(957,16,'Baltika Kaliningrad','2025-10-26 21:29:31'),(958,16,'Arsenal Tula','2025-10-26 21:29:31'),(959,16,'Fakel Voronezh','2025-10-26 21:29:31'),(960,16,'Nizhny Novgorod','2025-10-26 21:29:31'),(961,16,'Ural Yekaterinburg','2025-10-26 21:29:31'),(962,16,'Akron Tolyatti','2025-10-26 21:29:31'),(963,16,'Alania Vladikavkaz','2025-10-26 21:29:31'),(964,16,'Chayka Peschanokopskoye','2025-10-26 21:29:31'),(965,16,'Chernomorets Novorossiysk','2025-10-26 21:29:31'),(966,16,'Dynamo Makhachkala','2025-10-26 21:29:31'),(967,16,'Kamaz Naberezhnye Chelny','2025-10-26 21:29:31'),(968,16,'Neftekhimik Nizhnekamsk','2025-10-26 21:29:31'),(969,16,'Rodina Moscow','2025-10-26 21:29:31'),(970,16,'Rotor Volgograd','2025-10-26 21:29:31'),(971,16,'Sakhalin Yuzhno-Sakhalinsk','2025-10-26 21:29:31'),(972,16,'Shinnik Yaroslavl','2025-10-26 21:29:31'),(973,16,'SKA-Khabarovsk','2025-10-26 21:29:31'),(974,16,'Sokol Saratov','2025-10-26 21:29:31'),(975,16,'Spartak Vladikavkaz','2025-10-26 21:29:31'),(976,16,'Tekstilshchik Ivanovo','2025-10-26 21:29:31'),(977,16,'Tom Tomsk','2025-10-26 21:29:31'),(978,16,'Tyumen','2025-10-26 21:29:31'),(979,16,'Veles Moscow','2025-10-26 21:29:31'),(980,17,'AEK Athens','2025-10-26 21:29:31'),(981,17,'Aris','2025-10-26 21:29:31'),(982,17,'Asteras Tripolis','2025-10-26 21:29:31'),(983,17,'Atromitos','2025-10-26 21:29:31'),(984,17,'Lamia','2025-10-26 21:29:31'),(985,17,'Levadiakos','2025-10-26 21:29:31'),(986,17,'OFI Crete','2025-10-26 21:29:31'),(987,17,'Olympiacos','2025-10-26 21:29:31'),(988,17,'Panaitolikos','2025-10-26 21:29:31'),(989,17,'Panathinaikos','2025-10-26 21:29:31'),(990,17,'Panetolikos','2025-10-26 21:29:31'),(991,17,'PAOK','2025-10-26 21:29:31'),(992,17,'Panserraikos','2025-10-26 21:29:31'),(993,17,'PAS Giannina','2025-10-26 21:29:31'),(994,17,'Volos','2025-10-26 21:29:31'),(995,17,'AEL Kalloni','2025-10-26 21:29:31'),(996,17,'AEK Athens B','2025-10-26 21:29:31'),(997,17,'Apollon Smyrnis','2025-10-26 21:29:31'),(998,17,'Egaleo','2025-10-26 21:29:31'),(999,17,'Ergotelis','2025-10-26 21:29:31'),(1000,17,'Ethnikos Piraeus','2025-10-26 21:29:31'),(1001,17,'Iraklis','2025-10-26 21:29:31'),(1002,17,'Kavala','2025-10-26 21:29:31'),(1003,17,'Kifisia','2025-10-26 21:29:31'),(1004,17,'Makedonikos','2025-10-26 21:29:31'),(1005,17,'Olympiacos Volos','2025-10-26 21:29:31'),(1006,17,'Panachaiki','2025-10-26 21:29:31'),(1007,17,'Pierikos','2025-10-26 21:29:31'),(1008,17,'Platanias','2025-10-26 21:29:31'),(1009,17,'Rodos','2025-10-26 21:29:31'),(1010,17,'Veria','2025-10-26 21:29:31'),(1011,17,'Xanthi','2025-10-26 21:29:31'),(1012,18,'Basel','2025-10-26 21:29:44'),(1013,18,'Grasshopper','2025-10-26 21:29:44'),(1014,18,'Lausanne-Sport','2025-10-26 21:29:44'),(1015,18,'Lucerne','2025-10-26 21:29:44'),(1016,18,'Lugano','2025-10-26 21:29:44'),(1017,18,'Servette','2025-10-26 21:29:44'),(1018,18,'Sion','2025-10-26 21:29:44'),(1019,18,'St. Gallen','2025-10-26 21:29:44'),(1020,18,'Winterthur','2025-10-26 21:29:44'),(1021,18,'Young Boys','2025-10-26 21:29:44'),(1022,18,'Yverdon Sport','2025-10-26 21:29:44'),(1023,18,'Zürich','2025-10-26 21:29:44'),(1024,18,'Aarau','2025-10-26 21:29:44'),(1025,18,'Bellinzona','2025-10-26 21:29:44'),(1026,18,'Étoile Carouge','2025-10-26 21:29:44'),(1027,18,'Neuchâtel Xamax','2025-10-26 21:29:44'),(1028,18,'Schaffhausen','2025-10-26 21:29:44'),(1029,18,'Stade Lausanne-Ouchy','2025-10-26 21:29:44'),(1030,18,'Thun','2025-10-26 21:29:44'),(1031,18,'Vaduz','2025-10-26 21:29:44'),(1032,18,'Wil','2025-10-26 21:29:44'),(1033,18,'Baden','2025-10-26 21:29:44'),(1034,18,'Chiasso','2025-10-26 21:29:44'),(1035,18,'Kriens','2025-10-26 21:29:44'),(1036,18,'Nyon','2025-10-26 21:29:44'),(1037,18,'Rapperswil-Jona','2025-10-26 21:29:44'),(1038,18,'Stade Nyonnais','2025-10-26 21:29:44'),(1039,18,'Wohlen','2025-10-26 21:29:44'),(1040,18,'Brühl','2025-10-26 21:29:44'),(1041,18,'Winterthur II','2025-10-26 21:29:44'),(1042,19,'Austria Wien','2025-10-26 21:29:44'),(1043,19,'LASK','2025-10-26 21:29:44'),(1044,19,'Red Bull Salzburg','2025-10-26 21:29:44'),(1045,19,'Rapid Wien','2025-10-26 21:29:44'),(1046,19,'SK Sturm Graz','2025-10-26 21:29:44'),(1047,19,'TSV Hartberg','2025-10-26 21:29:44'),(1048,19,'WSG Tirol','2025-10-26 21:29:44'),(1049,19,'Wolfsberger AC','2025-10-26 21:29:44'),(1050,19,'Admira Wacker','2025-10-26 21:29:44'),(1051,19,'Altach','2025-10-26 21:29:44'),(1052,19,'Austria Klagenfurt','2025-10-26 21:29:44'),(1053,19,'Blau-Weiss Linz','2025-10-26 21:29:44'),(1054,19,'BW Linz','2025-10-26 21:29:44'),(1055,19,'FC Liefering','2025-10-26 21:29:44'),(1056,19,'First Vienna','2025-10-26 21:29:44'),(1057,19,'Floridsdorfer AC','2025-10-26 21:29:44'),(1058,19,'Grazer AK','2025-10-26 21:29:44'),(1059,19,'Kapfenberger SV','2025-10-26 21:29:44'),(1060,19,'Lafnitz','2025-10-26 21:29:44'),(1061,19,'Ried','2025-10-26 21:29:44'),(1062,19,'SKU Amstetten','2025-10-26 21:29:44'),(1063,19,'Stripfing','2025-10-26 21:29:44'),(1064,19,'Vorwärts Steyr','2025-10-26 21:29:44'),(1065,19,'SV Horn','2025-10-26 21:29:44'),(1066,19,'ASK Voitsberg','2025-10-26 21:29:44'),(1067,19,'FAC Wien','2025-10-26 21:29:44'),(1068,19,'Austria Lustenau','2025-10-26 21:29:44'),(1069,19,'SC Austria Lustenau','2025-10-26 21:29:44'),(1070,20,'Aalborg','2025-10-26 21:29:44'),(1071,20,'AGF Aarhus','2025-10-26 21:29:44'),(1072,20,'Brøndby','2025-10-26 21:29:44'),(1073,20,'Copenhagen','2025-10-26 21:29:44'),(1074,20,'Hvidovre','2025-10-26 21:29:44'),(1075,20,'Lyngby','2025-10-26 21:29:44'),(1076,20,'Midtjylland','2025-10-26 21:29:44'),(1077,20,'Nordsjælland','2025-10-26 21:29:44'),(1078,20,'Randers','2025-10-26 21:29:44'),(1079,20,'Silkeborg','2025-10-26 21:29:44'),(1080,20,'Sønderjyske','2025-10-26 21:29:44'),(1081,20,'Vejle','2025-10-26 21:29:44'),(1082,20,'Viborg','2025-10-26 21:29:44'),(1083,20,'AC Horsens','2025-10-26 21:29:44'),(1084,20,'Esbjerg','2025-10-26 21:29:44'),(1085,20,'Fredericia','2025-10-26 21:29:44'),(1086,20,'HB Køge','2025-10-26 21:29:44'),(1087,20,'Helsingør','2025-10-26 21:29:44'),(1088,20,'Hvidovre IF','2025-10-26 21:29:44'),(1089,20,'Kolding IF','2025-10-26 21:29:44'),(1090,20,'Nykøbing FC','2025-10-26 21:29:44'),(1091,20,'Odense','2025-10-26 21:29:44'),(1092,20,'Vendsyssel','2025-10-26 21:29:44'),(1093,20,'Vejle BK','2025-10-26 21:29:44'),(1094,20,'Hillerød','2025-10-26 21:29:44'),(1095,20,'Fremad Amager','2025-10-26 21:29:44'),(1180,24,'Aalesund','2025-10-26 21:31:14'),(1181,24,'Bodø/Glimt','2025-10-26 21:31:14'),(1182,24,'Brann','2025-10-26 21:31:14'),(1183,24,'Fredrikstad','2025-10-26 21:31:14'),(1184,24,'Ham-Kam','2025-10-26 21:31:14'),(1185,24,'Haugesund','2025-10-26 21:31:14'),(1186,24,'KFUM Oslo','2025-10-26 21:31:14'),(1187,24,'Kristiansund','2025-10-26 21:31:14'),(1188,24,'Lillestrøm','2025-10-26 21:31:14'),(1189,24,'Molde','2025-10-26 21:31:14'),(1190,24,'Odd','2025-10-26 21:31:14'),(1191,24,'Rosenborg','2025-10-26 21:31:14'),(1192,24,'Sandefjord','2025-10-26 21:31:14'),(1193,24,'Sarpsborg 08','2025-10-26 21:31:14'),(1194,24,'Strømsgodset','2025-10-26 21:31:14'),(1195,24,'Tromsø','2025-10-26 21:31:14'),(1196,24,'Viking','2025-10-26 21:31:14'),(1197,24,'Åsane','2025-10-26 21:31:14'),(1198,24,'Bryne','2025-10-26 21:31:14'),(1199,24,'Egersund','2025-10-26 21:31:14'),(1200,24,'Jerv','2025-10-26 21:31:14'),(1201,24,'Kongsvinger','2025-10-26 21:31:14'),(1202,24,'Levanger','2025-10-26 21:31:14'),(1203,24,'Lyn','2025-10-26 21:31:14'),(1204,24,'Mjøndalen','2025-10-26 21:31:14'),(1205,24,'Moss','2025-10-26 21:31:14'),(1206,24,'Ranheim','2025-10-26 21:31:14'),(1207,24,'Raufoss','2025-10-26 21:31:14'),(1208,24,'Sogndal','2025-10-26 21:31:14'),(1209,24,'Stabæk','2025-10-26 21:31:14'),(1210,24,'Start','2025-10-26 21:31:14'),(1211,24,'Vålerenga','2025-10-26 21:31:14'),(1212,25,'AIK','2025-10-26 21:31:14'),(1213,25,'BK Häcken','2025-10-26 21:31:14'),(1214,25,'Degerfors','2025-10-26 21:31:14'),(1215,25,'Djurgården','2025-10-26 21:31:14'),(1216,25,'Elfsborg','2025-10-26 21:31:14'),(1217,25,'Halmstad','2025-10-26 21:31:14'),(1218,25,'Hammarby','2025-10-26 21:31:14'),(1219,25,'IFK Göteborg','2025-10-26 21:31:14'),(1220,25,'IFK Norrköping','2025-10-26 21:31:14'),(1221,25,'IFK Värnamo','2025-10-26 21:31:14'),(1222,25,'Kalmar FF','2025-10-26 21:31:14'),(1223,25,'Malmö FF','2025-10-26 21:31:14'),(1224,25,'Mjällby','2025-10-26 21:31:14'),(1225,25,'Sirius','2025-10-26 21:31:14'),(1226,25,'Västerås SK','2025-10-26 21:31:14'),(1227,25,'GAIS','2025-10-26 21:31:14'),(1228,25,'GIF Sundsvall','2025-10-26 21:31:14'),(1229,25,'IK Brage','2025-10-26 21:31:14'),(1230,25,'Jönköpings Södra','2025-10-26 21:31:14'),(1231,25,'Landskrona BoIS','2025-10-26 21:31:14'),(1232,25,'Örebro','2025-10-26 21:31:14'),(1233,25,'Örgryte','2025-10-26 21:31:14'),(1234,25,'Östersund','2025-10-26 21:31:14'),(1235,25,'Sandvikens IF','2025-10-26 21:31:14'),(1236,25,'Trelleborgs FF','2025-10-26 21:31:14'),(1237,25,'Utsiktens BK','2025-10-26 21:31:14'),(1238,25,'Varbergs BoIS','2025-10-26 21:31:14'),(1239,25,'AFC Eskilstuna','2025-10-26 21:31:14'),(1240,25,'Akropolis IF','2025-10-26 21:31:14'),(1241,25,'Brommapojkarna','2025-10-26 21:31:14'),(1242,25,'Helsingborg','2025-10-26 21:31:14'),(1243,25,'Öster','2025-10-26 21:31:14'),(1244,26,'Baník Ostrava','2025-10-26 21:31:15'),(1245,26,'Bohemians 1905','2025-10-26 21:31:15'),(1246,26,'Dukla Prague','2025-10-26 21:31:15'),(1247,26,'Hradec Králové','2025-10-26 21:31:15'),(1248,26,'Jablonec','2025-10-26 21:31:15'),(1249,26,'Karviná','2025-10-26 21:31:15'),(1250,26,'Mladá Boleslav','2025-10-26 21:31:15'),(1251,26,'Pardubice','2025-10-26 21:31:15'),(1252,26,'Sigma Olomouc','2025-10-26 21:31:15'),(1253,26,'Slavia Prague','2025-10-26 21:31:15'),(1254,26,'Slovan Liberec','2025-10-26 21:31:15'),(1255,26,'Sparta Prague','2025-10-26 21:31:15'),(1256,26,'Slovácko','2025-10-26 21:31:15'),(1257,26,'Teplice','2025-10-26 21:31:15'),(1258,26,'Viktoria Plzeň','2025-10-26 21:31:15'),(1259,26,'Zbrojovka Brno','2025-10-26 21:31:15'),(1260,26,'Zlín','2025-10-26 21:31:15'),(1261,26,'Chrudim','2025-10-26 21:31:15'),(1262,26,'Líšeň','2025-10-26 21:31:15'),(1263,26,'Prostějov','2025-10-26 21:31:15'),(1264,26,'Táborsko','2025-10-26 21:31:15'),(1265,26,'Varnsdorf','2025-10-26 21:31:15'),(1266,26,'Vlašim','2025-10-26 21:31:15'),(1267,26,'Vysočina Jihlava','2025-10-26 21:31:15'),(1268,26,'České Budějovice','2025-10-26 21:31:15'),(1269,26,'Opava','2025-10-26 21:31:15'),(1270,26,'Příbram','2025-10-26 21:31:15'),(1271,26,'Ústí nad Labem','2025-10-26 21:31:15'),(1272,26,'Brno','2025-10-26 21:31:15'),(1273,26,'Jihlava','2025-10-26 21:31:15'),(1274,26,'Sokolov','2025-10-26 21:31:15'),(1275,26,'Vyšehrad','2025-10-26 21:31:15'),(1276,26,'FK Kolín','2025-10-26 21:31:15'),(1277,26,'MFK Chrudim','2025-10-26 21:31:15'),(1278,27,'Cracovia','2025-10-26 21:31:45'),(1279,27,'Górnik Zabrze','2025-10-26 21:31:45'),(1280,27,'Jagiellonia Białystok','2025-10-26 21:31:45'),(1281,27,'Korona Kielce','2025-10-26 21:31:45'),(1282,27,'Lech Poznań','2025-10-26 21:31:45'),(1283,27,'Lechia Gdańsk','2025-10-26 21:31:45'),(1284,27,'Legia Warsaw','2025-10-26 21:31:45'),(1285,27,'ŁKS Łódź','2025-10-26 21:31:45'),(1286,27,'Motor Lublin','2025-10-26 21:31:45'),(1287,27,'Piast Gliwice','2025-10-26 21:31:45'),(1288,27,'Pogoń Szczecin','2025-10-26 21:31:45'),(1289,27,'Radomiak Radom','2025-10-26 21:31:45'),(1290,27,'Raków Częstochowa','2025-10-26 21:31:45'),(1291,27,'Śląsk Wrocław','2025-10-26 21:31:45'),(1292,27,'Stal Mielec','2025-10-26 21:31:45'),(1293,27,'Widzew Łódź','2025-10-26 21:31:45'),(1294,27,'Warta Poznań','2025-10-26 21:31:45'),(1295,27,'Zagłębie Lubin','2025-10-26 21:31:45'),(1296,27,'Arka Gdynia','2025-10-26 21:31:45'),(1297,27,'Bruk-Bet Termalica','2025-10-26 21:31:45'),(1298,27,'Chrobry Głogów','2025-10-26 21:31:45'),(1299,27,'GKS Katowice','2025-10-26 21:31:45'),(1300,27,'Górnik Łęczna','2025-10-26 21:31:45'),(1301,27,'Miedź Legnica','2025-10-26 21:31:45'),(1302,27,'Odra Opole','2025-10-26 21:31:45'),(1303,27,'Polonia Warsaw','2025-10-26 21:31:45'),(1304,27,'Puszcza Niepołomice','2025-10-26 21:31:45'),(1305,27,'Ruch Chorzów','2025-10-26 21:31:45'),(1306,27,'Sandecja Nowy Sącz','2025-10-26 21:31:45'),(1307,27,'Skra Częstochowa','2025-10-26 21:31:45'),(1308,27,'Stal Rzeszów','2025-10-26 21:31:45'),(1309,27,'Stomil Olsztyn','2025-10-26 21:31:45'),(1310,27,'Tychy','2025-10-26 21:31:45'),(1311,27,'Wisła Kraków','2025-10-26 21:31:45'),(1312,27,'Wisła Płock','2025-10-26 21:31:45'),(1313,27,'Znicz Pruszków','2025-10-26 21:31:45'),(1314,28,'Chornomorets Odesa','2025-10-26 21:31:45'),(1315,28,'Dinamo Kiev','2025-10-26 21:31:45'),(1316,28,'Dnipro-1','2025-10-26 21:31:45'),(1317,28,'Inhulets Petrove','2025-10-26 21:31:45'),(1318,28,'Kolos Kovalivka','2025-10-26 21:31:45'),(1319,28,'Kryvbas Kryvyi Rih','2025-10-26 21:31:45'),(1320,28,'LNZ Cherkasy','2025-10-26 21:31:45'),(1321,28,'Livyi Bereh','2025-10-26 21:31:45'),(1322,28,'Metalist 1925 Kharkiv','2025-10-26 21:31:45'),(1323,28,'Minaj','2025-10-26 21:31:45'),(1324,28,'Oleksandriya','2025-10-26 21:31:45'),(1325,28,'Obolon Kyiv','2025-10-26 21:31:45'),(1326,28,'Polissya Zhytomyr','2025-10-26 21:31:45'),(1327,28,'Rukh Lviv','2025-10-26 21:31:45'),(1328,28,'Shakhtar Donetsk','2025-10-26 21:31:45'),(1329,28,'Veres Rivne','2025-10-26 21:31:45'),(1330,28,'Vorskla Poltava','2025-10-26 21:31:45'),(1331,28,'Zorya Luhansk','2025-10-26 21:31:45'),(1332,28,'Agribusiness Volochysk','2025-10-26 21:31:45'),(1333,28,'Ahrobiznes Volochysk','2025-10-26 21:31:45'),(1334,28,'Avanhard Kramatorsk','2025-10-26 21:31:45'),(1335,28,'Cherkashchyna','2025-10-26 21:31:45'),(1336,28,'Epitsentr Dunaivtsi','2025-10-26 21:31:45'),(1337,28,'Hirnyk-Sport','2025-10-26 21:31:45'),(1338,28,'Karpaty Lviv','2025-10-26 21:31:45'),(1339,28,'Metalurh Zaporizhzhya','2025-10-26 21:31:45'),(1340,28,'Metalist Kharkiv','2025-10-26 21:31:45'),(1341,28,'Mynai','2025-10-26 21:31:45'),(1342,28,'Niva Ternopil','2025-10-26 21:31:45'),(1343,28,'Prykarpattya','2025-10-26 21:31:45'),(1344,28,'Real Pharma Odesa','2025-10-26 21:31:45'),(1345,28,'Sumy','2025-10-26 21:31:45'),(1346,29,'Dinamo Zagreb','2025-10-26 21:31:45'),(1347,29,'Hajduk Split','2025-10-26 21:31:45'),(1348,29,'HNK Gorica','2025-10-26 21:31:45'),(1349,29,'HNK Rijeka','2025-10-26 21:31:45'),(1350,29,'Istra 1961','2025-10-26 21:31:45'),(1351,29,'Lokomotiva Zagreb','2025-10-26 21:31:45'),(1352,29,'NK Osijek','2025-10-26 21:31:45'),(1353,29,'NK Slaven Belupo','2025-10-26 21:31:45'),(1354,29,'NK Varaždin','2025-10-26 21:31:45'),(1355,29,'Rudeš','2025-10-26 21:31:45'),(1356,29,'Šibenik','2025-10-26 21:31:45'),(1357,29,'Bijelo Brdo','2025-10-26 21:31:45'),(1358,29,'Croatia Zmijavci','2025-10-26 21:31:45'),(1359,29,'Dubrava Zagreb','2025-10-26 21:31:45'),(1360,29,'Dugopolje','2025-10-26 21:31:45'),(1361,29,'Hrvatski Dragovoljac','2025-10-26 21:31:45'),(1362,29,'Jadran Poreč','2025-10-26 21:31:45'),(1363,29,'Jarun Zagreb','2025-10-26 21:31:45'),(1364,29,'Kustošija','2025-10-26 21:31:45'),(1365,29,'Marsonia','2025-10-26 21:31:45'),(1366,29,'Opatija','2025-10-26 21:31:45'),(1367,29,'Sesvete','2025-10-26 21:31:45'),(1368,29,'Solin','2025-10-26 21:31:45'),(1369,29,'Vukovar','2025-10-26 21:31:45'),(1370,29,'Zrinjski Jurjevac','2025-10-26 21:31:45'),(1371,29,'Cibalia','2025-10-26 21:31:45'),(1372,29,'Inter Zaprešić','2025-10-26 21:31:45'),(1373,29,'Zadar','2025-10-26 21:31:45'),(1374,29,'Zagreb','2025-10-26 21:31:45'),(1375,30,'Čukarički','2025-10-26 21:31:45'),(1376,30,'FK Jedinstvo Ub','2025-10-26 21:31:45'),(1377,30,'FK TSC','2025-10-26 21:31:45'),(1378,30,'IMT Novi Beograd','2025-10-26 21:31:45'),(1379,30,'Mladost Lučani','2025-10-26 21:31:45'),(1380,30,'Napredak Kruševac','2025-10-26 21:31:45'),(1381,30,'Novi Pazar','2025-10-26 21:31:45'),(1382,30,'OFK Beograd','2025-10-26 21:31:45'),(1383,30,'Partizan','2025-10-26 21:31:45'),(1384,30,'Radnički 1923','2025-10-26 21:31:45'),(1385,30,'Radnički Niš','2025-10-26 21:31:45'),(1386,30,'Red Star Belgrade','2025-10-26 21:31:45'),(1387,30,'Spartak Subotica','2025-10-26 21:31:45'),(1388,30,'Vojvodina','2025-10-26 21:31:45'),(1389,30,'Železničar Pančevo','2025-10-26 21:31:45'),(1390,30,'Kolubara','2025-10-26 21:31:45'),(1391,30,'Smederevo','2025-10-26 21:31:45'),(1392,30,'Grafičar','2025-10-26 21:31:45'),(1393,30,'Inđija','2025-10-26 21:31:45'),(1394,30,'Javor Ivanjica','2025-10-26 21:31:45'),(1395,30,'Metalac Gornji Milanovac','2025-10-26 21:31:45'),(1396,30,'Mačva Šabac','2025-10-26 21:31:45'),(1397,30,'Proleter Novi Sad','2025-10-26 21:31:45'),(1398,30,'Radnik Surdulica','2025-10-26 21:31:45'),(1399,30,'Rad Belgrade','2025-10-26 21:31:45'),(1400,30,'Sinđelić Niš','2025-10-26 21:31:45'),(1401,30,'Teleoptik','2025-10-26 21:31:45'),(1402,30,'Trayal Kruševac','2025-10-26 21:31:45'),(1403,30,'Voždovac','2025-10-26 21:31:45'),(1404,30,'Zemun','2025-10-26 21:31:45'),(1405,30,'Zlatibor Čajetina','2025-10-26 21:31:45'),(1406,30,'Jagodina','2025-10-26 21:31:45'),(1407,31,'CFR Cluj','2025-10-26 21:32:17'),(1408,31,'CS Universitatea Craiova','2025-10-26 21:32:17'),(1409,31,'Dinamo București','2025-10-26 21:32:17'),(1410,31,'FCSB','2025-10-26 21:32:17'),(1411,31,'FC Botoșani','2025-10-26 21:32:17'),(1412,31,'FC Hermannstadt','2025-10-26 21:32:17'),(1413,31,'FC Rapid București','2025-10-26 21:32:17'),(1414,31,'FCV Farul Constanța','2025-10-26 21:32:17'),(1415,31,'Oțelul Galați','2025-10-26 21:32:17'),(1416,31,'Petrolul Ploiești','2025-10-26 21:32:17'),(1417,31,'Sepsi OSK','2025-10-26 21:32:17'),(1418,31,'UTA Arad','2025-10-26 21:32:17'),(1419,31,'Universitatea Cluj','2025-10-26 21:32:17'),(1420,31,'AFC Hermannstadt','2025-10-26 21:32:17'),(1421,31,'Chindia Târgoviște','2025-10-26 21:32:17'),(1422,31,'Concordia Chiajna','2025-10-26 21:32:17'),(1423,31,'Csikszereda','2025-10-26 21:32:17'),(1424,31,'FC Argeș','2025-10-26 21:32:17'),(1425,31,'FC Buzău','2025-10-26 21:32:17'),(1426,31,'FC Politehnica Iași','2025-10-26 21:32:17'),(1427,31,'FC Voluntari','2025-10-26 21:32:17'),(1428,31,'Gloria Buzău','2025-10-26 21:32:17'),(1429,31,'Metaloglobus București','2025-10-26 21:32:17'),(1430,31,'Mioveni','2025-10-26 21:32:17'),(1431,31,'Olimpia Satu Mare','2025-10-26 21:32:17'),(1432,31,'Poli Timișoara','2025-10-26 21:32:17'),(1433,31,'Ripensia Timișoara','2025-10-26 21:32:17'),(1434,31,'SCM Gloria Buzău','2025-10-26 21:32:17'),(1435,31,'Șelimbăr','2025-10-26 21:32:17'),(1436,31,'Sportul Snagov','2025-10-26 21:32:17'),(1437,31,'Steaua București','2025-10-26 21:32:17'),(1438,31,'Turris-Oltul Turnu Măgurele','2025-10-26 21:32:17'),(1439,31,'Unirea Slobozia','2025-10-26 21:32:17'),(1440,31,'Universitatea Cluj','2025-10-26 21:32:17'),(1441,31,'Viitorul Constanța','2025-10-26 21:32:17'),(1442,31,'Progresul București','2025-10-26 21:32:17'),(1443,32,'Debrecen','2025-10-26 21:32:17'),(1444,32,'Diósgyőr','2025-10-26 21:32:17'),(1445,32,'ETO Győr','2025-10-26 21:32:17'),(1446,32,'Fehérvár','2025-10-26 21:32:17'),(1447,32,'Ferencváros','2025-10-26 21:32:17'),(1448,32,'Kecskemét','2025-10-26 21:32:17'),(1449,32,'MTK Budapest','2025-10-26 21:32:17'),(1450,32,'Nyíregyháza','2025-10-26 21:32:17'),(1451,32,'Paksi FC','2025-10-26 21:32:17'),(1452,32,'Puskás Akadémia','2025-10-26 21:32:17'),(1453,32,'Újpest','2025-10-26 21:32:17'),(1454,32,'Zalaegerszeg','2025-10-26 21:32:17'),(1455,32,'Budafok','2025-10-26 21:32:17'),(1456,32,'Budapest Honvéd','2025-10-26 21:32:17'),(1457,32,'Csákvár','2025-10-26 21:32:17'),(1458,32,'Gyirmót','2025-10-26 21:32:17'),(1459,32,'Haladás','2025-10-26 21:32:17'),(1460,32,'Kazincbarcika','2025-10-26 21:32:17'),(1461,32,'Komárno','2025-10-26 21:32:17'),(1462,32,'Kozármisleny','2025-10-26 21:32:17'),(1463,32,'Mezőkövesd','2025-10-26 21:32:17'),(1464,32,'Szeged','2025-10-26 21:32:17'),(1465,32,'Szombathelyi Haladás','2025-10-26 21:32:17'),(1466,32,'Tiszakécske','2025-10-26 21:32:17'),(1467,32,'Vasas','2025-10-26 21:32:17'),(1468,32,'Ajka','2025-10-26 21:32:17'),(1469,32,'Cigánd','2025-10-26 21:32:17'),(1470,32,'Soroksár','2025-10-26 21:32:17'),(1471,32,'Szentlőrinc','2025-10-26 21:32:17'),(1472,32,'Szolnok','2025-10-26 21:32:17'),(1473,32,'DVTK','2025-10-26 21:32:17'),(1474,32,'Mosonmagyaróvár','2025-10-26 21:32:17'),(1475,33,'AS Trenčín','2025-10-26 21:32:17'),(1476,33,'DAC 1904 Dunajská Streda','2025-10-26 21:32:17'),(1477,33,'FK Železiarne Podbrezová','2025-10-26 21:32:17'),(1478,33,'KFC Komárno','2025-10-26 21:32:17'),(1479,33,'MFK Dukla Banská Bystrica','2025-10-26 21:32:17'),(1480,33,'MFK Ružomberok','2025-10-26 21:32:17'),(1481,33,'MFK Skalica','2025-10-26 21:32:17'),(1482,33,'MŠK Žilina','2025-10-26 21:32:17'),(1483,33,'Slovan Bratislava','2025-10-26 21:32:17'),(1484,33,'Spartak Trnava','2025-10-26 21:32:17'),(1485,33,'Zemplín Michalovce','2025-10-26 21:32:17'),(1486,33,'ŠKF Sereď','2025-10-26 21:32:17'),(1487,33,'FK Košice','2025-10-26 21:32:17'),(1488,33,'Liptovský Mikuláš','2025-10-26 21:32:17'),(1489,33,'MFK Tatran Liptovský Mikuláš','2025-10-26 21:32:17'),(1490,33,'Partizán Bardejov','2025-10-26 21:32:17'),(1491,33,'Petržalka','2025-10-26 21:32:17'),(1492,33,'Pohronie','2025-10-26 21:32:17'),(1493,33,'Púchov','2025-10-26 21:32:17'),(1494,33,'Slovan Duslo Šaľa','2025-10-26 21:32:17'),(1495,33,'Štúrovo','2025-10-26 21:32:17'),(1496,33,'Šamorín','2025-10-26 21:32:17'),(1497,33,'Tatran Prešov','2025-10-26 21:32:17'),(1498,33,'Trebišov','2025-10-26 21:32:17'),(1499,33,'Dubnica','2025-10-26 21:32:17'),(1500,33,'Dolný Kubín','2025-10-26 21:32:17'),(1501,33,'Humenné','2025-10-26 21:32:17'),(1502,33,'Poprad','2025-10-26 21:32:17'),(1503,34,'Arda Kardzhali','2025-10-26 21:32:17'),(1504,34,'Beroe','2025-10-26 21:32:17'),(1505,34,'Botev Plovdiv','2025-10-26 21:32:17'),(1506,34,'Botev Vratsa','2025-10-26 21:32:17'),(1507,34,'CSKA 1948 Sofia','2025-10-26 21:32:17'),(1508,34,'CSKA Sofia','2025-10-26 21:32:17'),(1509,34,'Hebar Pazardzhik','2025-10-26 21:32:17'),(1510,34,'Krumovgrad','2025-10-26 21:32:17'),(1511,34,'Levski Sofia','2025-10-26 21:32:17'),(1512,34,'Lokomotiv Plovdiv','2025-10-26 21:32:17'),(1513,34,'Lokomotiv Sofia','2025-10-26 21:32:17'),(1514,34,'Ludogorets Razgrad','2025-10-26 21:32:17'),(1515,34,'Pirin Blagoevgrad','2025-10-26 21:32:17'),(1516,34,'Septemvri Sofia','2025-10-26 21:32:17'),(1517,34,'Slavia Sofia','2025-10-26 21:32:17'),(1518,34,'Spartak Varna','2025-10-26 21:32:17'),(1519,34,'Cherno More Varna','2025-10-26 21:32:17'),(1520,34,'Dunav Ruse','2025-10-26 21:32:17'),(1521,34,'Etar Veliko Tarnovo','2025-10-26 21:32:17'),(1522,34,'CSKA 1948','2025-10-26 21:32:17'),(1523,34,'Lokomotiv 1929 Sofia','2025-10-26 21:32:17'),(1524,34,'Marek Dupnitsa','2025-10-26 21:32:17'),(1525,34,'Montana','2025-10-26 21:32:17'),(1526,34,'Nesebar','2025-10-26 21:32:17'),(1527,34,'OFK Pirin','2025-10-26 21:32:17'),(1528,34,'Sozopol','2025-10-26 21:32:17'),(1529,34,'Tsarsko Selo','2025-10-26 21:32:17'),(1530,34,'Vitosha Bistritsa','2025-10-26 21:32:17'),(1531,34,'Yantra Gabrovo','2025-10-26 21:32:17'),(1532,34,'Pomorie','2025-10-26 21:32:17'),(1533,35,'Bravo','2025-10-26 21:32:48'),(1534,35,'Celje','2025-10-26 21:32:48'),(1535,35,'Domžale','2025-10-26 21:32:48'),(1536,35,'Koper','2025-10-26 21:32:48'),(1537,35,'Maribor','2025-10-26 21:32:48'),(1538,35,'Mura','2025-10-26 21:32:48'),(1539,35,'NK Olimpija Ljubljana','2025-10-26 21:32:48'),(1540,35,'Primorje','2025-10-26 21:32:48'),(1541,35,'Radomlje','2025-10-26 21:32:48'),(1542,35,'Aluminij','2025-10-26 21:32:48'),(1543,35,'Bistrica','2025-10-26 21:32:48'),(1544,35,'Drava Ptuj','2025-10-26 21:32:48'),(1545,35,'Gorica','2025-10-26 21:32:48'),(1546,35,'Kalcer Radomlje','2025-10-26 21:32:48'),(1547,35,'Krka','2025-10-26 21:32:48'),(1548,35,'Nafta 1903','2025-10-26 21:32:48'),(1549,35,'Rogaška','2025-10-26 21:32:48'),(1550,35,'Roltek Dob','2025-10-26 21:32:48'),(1551,35,'Rudar Velenje','2025-10-26 21:32:48'),(1552,35,'Tabor Sežana','2025-10-26 21:32:48'),(1553,36,'AEK Larnaca','2025-10-26 21:32:48'),(1554,36,'AEL Limassol','2025-10-26 21:32:48'),(1555,36,'Anorthosis Famagusta','2025-10-26 21:32:48'),(1556,36,'APOEL','2025-10-26 21:32:48'),(1557,36,'Apollon Limassol','2025-10-26 21:32:48'),(1558,36,'Aris Limassol','2025-10-26 21:32:48'),(1559,36,'Ethnikos Achna','2025-10-26 21:32:48'),(1560,36,'Karmiotissa','2025-10-26 21:32:48'),(1561,36,'Nea Salamis','2025-10-26 21:32:48'),(1562,36,'Omonia','2025-10-26 21:32:48'),(1563,36,'Omonia Aradippou','2025-10-26 21:32:48'),(1564,36,'Pafos FC','2025-10-26 21:32:48'),(1565,36,'Akritas Chlorakas','2025-10-26 21:32:48'),(1566,36,'ASIL Lysi','2025-10-26 21:32:48'),(1567,36,'Doxa Katokopias','2025-10-26 21:32:48'),(1568,36,'Enosis Neon Paralimni','2025-10-26 21:32:48'),(1569,36,'Olympiakos Nicosia','2025-10-26 21:32:48'),(1570,36,'Othellos Athienou','2025-10-26 21:32:48'),(1571,37,'Bohemians','2025-10-26 21:32:48'),(1572,37,'Cork City','2025-10-26 21:32:48'),(1573,37,'Derry City','2025-10-26 21:32:48'),(1574,37,'Drogheda United','2025-10-26 21:32:48'),(1575,37,'Dundalk','2025-10-26 21:32:48'),(1576,37,'Galway United','2025-10-26 21:32:48'),(1577,37,'Shamrock Rovers','2025-10-26 21:32:48'),(1578,37,'Shelbourne','2025-10-26 21:32:48'),(1579,37,'Sligo Rovers','2025-10-26 21:32:48'),(1580,37,'St Patrick\'s Athletic','2025-10-26 21:32:48'),(1581,37,'Waterford','2025-10-26 21:32:48'),(1582,37,'Athlone Town','2025-10-26 21:32:48'),(1583,37,'Bray Wanderers','2025-10-26 21:32:48'),(1584,37,'Cobh Ramblers','2025-10-26 21:32:48'),(1585,37,'Finn Harps','2025-10-26 21:32:48'),(1586,37,'Kerry FC','2025-10-26 21:32:48'),(1587,37,'Longford Town','2025-10-26 21:32:48'),(1588,37,'Treaty United','2025-10-26 21:32:48'),(1589,37,'UCD','2025-10-26 21:32:48'),(1590,37,'Wexford','2025-10-26 21:32:48'),(1591,37,'Limerick','2025-10-26 21:32:48'),(1592,38,'Ashdod','2025-10-26 21:32:48'),(1593,38,'Beitar Jerusalem','2025-10-26 21:32:48'),(1594,38,'Bnei Sakhnin','2025-10-26 21:32:48'),(1595,38,'Hapoel Be\'er Sheva','2025-10-26 21:32:48'),(1596,38,'Hapoel Hadera','2025-10-26 21:32:48'),(1597,38,'Hapoel Haifa','2025-10-26 21:32:48'),(1598,38,'Hapoel Jerusalem','2025-10-26 21:32:48'),(1599,38,'Hapoel Katamon Jerusalem','2025-10-26 21:32:48'),(1600,38,'Hapoel Tel Aviv','2025-10-26 21:32:48'),(1601,38,'Ironi Kiryat Shmona','2025-10-26 21:32:48'),(1602,38,'Maccabi Bnei Raina','2025-10-26 21:32:48'),(1603,38,'Maccabi Haifa','2025-10-26 21:32:48'),(1604,38,'Maccabi Netanya','2025-10-26 21:32:48'),(1605,38,'Maccabi Petah Tikva','2025-10-26 21:32:48'),(1606,38,'Maccabi Tel Aviv','2025-10-26 21:32:48'),(1607,38,'Sektzia Nes Tziona','2025-10-26 21:32:48'),(1608,38,'Bnei Yehuda','2025-10-26 21:32:48'),(1609,38,'Hapoel Acre','2025-10-26 21:32:48'),(1610,38,'Hapoel Nof HaGalil','2025-10-26 21:32:48'),(1611,38,'Hapoel Petah Tikva','2025-10-26 21:32:48'),(1612,38,'Hapoel Raanana','2025-10-26 21:32:48'),(1613,38,'Hapoel Rishon LeZion','2025-10-26 21:32:48'),(1614,38,'Ironi Tiberias','2025-10-26 21:32:48'),(1615,38,'Maccabi Ahi Nazareth','2025-10-26 21:32:48'),(1616,38,'Maccabi Kabilio Jaffa','2025-10-26 21:32:48'),(1617,38,'MS Kafr Qasim','2025-10-26 21:32:48'),(1618,38,'SC Ashdod','2025-10-26 21:32:48'),(1619,38,'Bnei Sakhnin','2025-10-26 21:32:48'),(1620,39,'Al Ahly','2025-10-26 21:33:21'),(1621,39,'Al Ittihad Alexandria','2025-10-26 21:33:21'),(1622,39,'Al Masry','2025-10-26 21:33:21'),(1623,39,'Al Mokawloon','2025-10-26 21:33:21'),(1624,39,'Arab Contractors','2025-10-26 21:33:21'),(1625,39,'Ceramica Cleopatra','2025-10-26 21:33:21'),(1626,39,'El Gaish','2025-10-26 21:33:21'),(1627,39,'El Gouna','2025-10-26 21:33:21'),(1628,39,'Enppi','2025-10-26 21:33:21'),(1629,39,'Future FC','2025-10-26 21:33:21'),(1630,39,'Ghazl El Mahalla','2025-10-26 21:33:21'),(1631,39,'Haras El Hodood','2025-10-26 21:33:21'),(1632,39,'Ismaily','2025-10-26 21:33:21'),(1633,39,'Modern Sport','2025-10-26 21:33:21'),(1634,39,'National Bank of Egypt','2025-10-26 21:33:21'),(1635,39,'Pharco','2025-10-26 21:33:21'),(1636,39,'Pyramids FC','2025-10-26 21:33:21'),(1637,39,'Smouha','2025-10-26 21:33:21'),(1638,39,'Tala\'ea El Gaish','2025-10-26 21:33:21'),(1639,39,'Zamalek','2025-10-26 21:33:21'),(1640,39,'ZED FC','2025-10-26 21:33:21'),(1641,39,'Al Ahly Tripoli','2025-10-26 21:33:21'),(1642,39,'Al Daklyeh','2025-10-26 21:33:21'),(1643,39,'Al Nasr','2025-10-26 21:33:21'),(1644,39,'Aswan','2025-10-26 21:33:21'),(1645,39,'Baladiyat El Mahalla','2025-10-26 21:33:21'),(1646,39,'El Entag El Harby','2025-10-26 21:33:21'),(1647,39,'El Sekka El Hadid','2025-10-26 21:33:21'),(1648,39,'La Viena','2025-10-26 21:33:21'),(1649,39,'Misr Lel Makkasa','2025-10-26 21:33:21'),(1650,39,'Nogoom FC','2025-10-26 21:33:21'),(1651,39,'Petrojet','2025-10-26 21:33:21'),(1652,39,'Pharaohs FC','2025-10-26 21:33:21'),(1653,39,'Suez Cement','2025-10-26 21:33:21'),(1654,39,'Tala\'ea El-Gaish','2025-10-26 21:33:21'),(1655,39,'Tanta','2025-10-26 21:33:21'),(1656,39,'Wadi Degla','2025-10-26 21:33:21'),(1657,39,'Eastern Company','2025-10-26 21:33:21'),(1658,40,'AmaZulu','2025-10-26 21:33:21'),(1659,40,'Cape Town City','2025-10-26 21:33:21'),(1660,40,'Cape Town Spurs','2025-10-26 21:33:21'),(1661,40,'Chippa United','2025-10-26 21:33:21'),(1662,40,'Golden Arrows','2025-10-26 21:33:21'),(1663,40,'Kaizer Chiefs','2025-10-26 21:33:21'),(1664,40,'Mamelodi Sundowns','2025-10-26 21:33:21'),(1665,40,'Moroka Swallows','2025-10-26 21:33:21'),(1666,40,'Orlando Pirates','2025-10-26 21:33:21'),(1667,40,'PolokwaneCity','2025-10-26 21:33:21'),(1668,40,'Richards Bay','2025-10-26 21:33:21'),(1669,40,'Royal AM','2025-10-26 21:33:21'),(1670,40,'Sekhukhune United','2025-10-26 21:33:21'),(1671,40,'Stellenbosch','2025-10-26 21:33:21'),(1672,40,'SuperSport United','2025-10-26 21:33:21'),(1673,40,'TS Galaxy','2025-10-26 21:33:21'),(1674,40,'Cape Town All Stars','2025-10-26 21:33:21'),(1675,40,'JDR Stars','2025-10-26 21:33:21'),(1676,40,'Magesi FC','2025-10-26 21:33:21'),(1677,40,'Maritzburg United','2025-10-26 21:33:21'),(1678,40,'Pretoria Callies','2025-10-26 21:33:21'),(1679,40,'University of Pretoria','2025-10-26 21:33:21'),(1680,40,'TS Sporting','2025-10-26 21:33:21'),(1681,40,'Baroka','2025-10-26 21:33:21'),(1682,40,'Black Leopards','2025-10-26 21:33:21'),(1683,40,'Cape Umoya United','2025-10-26 21:33:21'),(1684,40,'Free State Stars','2025-10-26 21:33:21'),(1685,40,'Highlands Park','2025-10-26 21:33:21'),(1686,40,'Jomo Cosmos','2025-10-26 21:33:21'),(1687,40,'Platinum Stars','2025-10-26 21:33:21'),(1688,40,'Tshakhuma','2025-10-26 21:33:21'),(1689,40,'Witbank Spurs','2025-10-26 21:33:21'),(1690,41,'AS FAR','2025-10-26 21:33:21'),(1691,41,'Berkane','2025-10-26 21:33:21'),(1692,41,'Chabab Mohammedia','2025-10-26 21:33:21'),(1693,41,'Difaâ El Jadida','2025-10-26 21:33:21'),(1694,41,'FUS Rabat','2025-10-26 21:33:21'),(1695,41,'Hassania Agadir','2025-10-26 21:33:21'),(1696,41,'Ittihad Tanger','2025-10-26 21:33:21'),(1697,41,'JS Soualem','2025-10-26 21:33:21'),(1698,41,'Maghreb Fès','2025-10-26 21:33:21'),(1699,41,'Moghreb Tétouan','2025-10-26 21:33:21'),(1700,41,'Olympic Safi','2025-10-26 21:33:21'),(1701,41,'Raja Casablanca','2025-10-26 21:33:21'),(1702,41,'Renaissance Zemamra','2025-10-26 21:33:21'),(1703,41,'RSB Berkane','2025-10-26 21:33:21'),(1704,41,'Wydad Casablanca','2025-10-26 21:33:21'),(1705,41,'Youssoufia Berrechid','2025-10-26 21:33:21'),(1706,41,'COD Meknès','2025-10-26 21:33:21'),(1707,41,'Chabab Atlas Khénifra','2025-10-26 21:33:21'),(1708,41,'Chabab Rif Al Hoceima','2025-10-26 21:33:21'),(1709,41,'JSM Laâyoune','2025-10-26 21:33:21'),(1710,41,'Kénitra','2025-10-26 21:33:21'),(1711,41,'KAC Kénitra','2025-10-26 21:33:21'),(1712,41,'Maghreb Fès','2025-10-26 21:33:21'),(1713,41,'Olympique Khouribga','2025-10-26 21:33:21'),(1714,41,'Racing Casablanca','2025-10-26 21:33:21'),(1715,41,'Raja Beni Mellal','2025-10-26 21:33:21'),(1716,41,'RBM','2025-10-26 21:33:21'),(1717,41,'Stade Marocain','2025-10-26 21:33:21'),(1718,41,'TAS Casablanca','2025-10-26 21:33:21'),(1719,41,'UTS Rabat','2025-10-26 21:33:21'),(1720,41,'Union Touarga','2025-10-26 21:33:21'),(1721,41,'Wydad Fès','2025-10-26 21:33:21'),(1722,42,'CR Belouizdad','2025-10-26 21:33:51'),(1723,42,'CS Constantine','2025-10-26 21:33:51'),(1724,42,'ES Sétif','2025-10-26 21:33:51'),(1725,42,'JS Kabylie','2025-10-26 21:33:51'),(1726,42,'JS Saoura','2025-10-26 21:33:51'),(1727,42,'MC Alger','2025-10-26 21:33:51'),(1728,42,'MC Oran','2025-10-26 21:33:51'),(1729,42,'Paradou AC','2025-10-26 21:33:51'),(1730,42,'USM Alger','2025-10-26 21:33:51'),(1731,42,'USM Khenchela','2025-10-26 21:33:51'),(1732,42,'ASO Chlef','2025-10-26 21:33:51'),(1733,42,'Béjaïa','2025-10-26 21:33:51'),(1734,42,'ES Mostaganem','2025-10-26 21:33:51'),(1735,42,'HB Chelghoum Laïd','2025-10-26 21:33:51'),(1736,42,'JSM Béjaïa','2025-10-26 21:33:51'),(1737,42,'JSM Skikda','2025-10-26 21:33:51'),(1738,42,'MC El Bayadh','2025-10-26 21:33:51'),(1739,42,'Magra','2025-10-26 21:33:51'),(1740,42,'NC Magra','2025-10-26 21:33:51'),(1741,42,'Olympique Médéa','2025-10-26 21:33:51'),(1742,42,'SC Mecheria','2025-10-26 21:33:51'),(1743,42,'US Biskra','2025-10-26 21:33:51'),(1744,42,'USM Annaba','2025-10-26 21:33:51'),(1745,42,'ASM Oran','2025-10-26 21:33:51'),(1746,42,'CA Batna','2025-10-26 21:33:51'),(1747,42,'CA Bordj Bou Arreridj','2025-10-26 21:33:51'),(1748,42,'ES Ben Aknoun','2025-10-26 21:33:51'),(1749,42,'JS Bordj Ménaïel','2025-10-26 21:33:51'),(1750,42,'NA Hussein Dey','2025-10-26 21:33:51'),(1751,42,'RC Arbaâ','2025-10-26 21:33:51'),(1752,42,'RC Relizane','2025-10-26 21:33:51'),(1753,42,'WA Tlemcen','2025-10-26 21:33:51'),(1754,43,'AS Soliman','2025-10-26 21:33:51'),(1755,43,'CA Bizertin','2025-10-26 21:33:51'),(1756,43,'Club Africain','2025-10-26 21:33:51'),(1757,43,'CS Sfaxien','2025-10-26 21:33:51'),(1758,43,'Espérance de Tunis','2025-10-26 21:33:51'),(1759,43,'Étoile Sportive du Sahel','2025-10-26 21:33:51'),(1760,43,'JS Omrane','2025-10-26 21:33:51'),(1761,43,'Monastir','2025-10-26 21:33:51'),(1762,43,'Stade Tunisien','2025-10-26 21:33:51'),(1763,43,'US Ben Guerdane','2025-10-26 21:33:51'),(1764,43,'US Monastir','2025-10-26 21:33:51'),(1765,43,'US Tataouine','2025-10-26 21:33:51'),(1766,43,'AS Gabès','2025-10-26 21:33:51'),(1767,43,'Ben Guerdane','2025-10-26 21:33:51'),(1768,43,'CA Bizerte','2025-10-26 21:33:51'),(1769,43,'CS Chebba','2025-10-26 21:33:51'),(1770,43,'CS Hammam-Lif','2025-10-26 21:33:51'),(1771,43,'EGS Gafsa','2025-10-26 21:33:51'),(1772,43,'ES Hammam-Sousse','2025-10-26 21:33:51'),(1773,43,'ES Métlaoui','2025-10-26 21:33:51'),(1774,43,'ES Zarzis','2025-10-26 21:33:51'),(1775,43,'JS Kairouan','2025-10-26 21:33:51'),(1776,43,'Olympique Béja','2025-10-26 21:33:51'),(1777,43,'SA Menzel Bourguiba','2025-10-26 21:33:51'),(1778,43,'Sfax Railways Sport','2025-10-26 21:33:51'),(1779,43,'Slimane','2025-10-26 21:33:51'),(1780,43,'Stade Gabèsien','2025-10-26 21:33:51'),(1781,43,'Union Sportive Monastirienne','2025-10-26 21:33:51'),(1782,44,'Abia Warriors','2025-10-26 21:33:51'),(1783,44,'Akwa United','2025-10-26 21:33:51'),(1784,44,'Bayelsa United','2025-10-26 21:33:51'),(1785,44,'Bendel Insurance','2025-10-26 21:33:51'),(1786,44,'El Kanemi Warriors','2025-10-26 21:33:51'),(1787,44,'Enyimba','2025-10-26 21:33:51'),(1788,44,'Gombe United','2025-10-26 21:33:51'),(1789,44,'Heartland','2025-10-26 21:33:51'),(1790,44,'Ikorodu City','2025-10-26 21:33:51'),(1791,44,'Kano Pillars','2025-10-26 21:33:51'),(1792,44,'Katsina United','2025-10-26 21:33:51'),(1793,44,'Kwara United','2025-10-26 21:33:51'),(1794,44,'Lobi Stars','2025-10-26 21:33:51'),(1795,44,'Nasarawa United','2025-10-26 21:33:51'),(1796,44,'Niger Tornadoes','2025-10-26 21:33:51'),(1797,44,'Plateau United','2025-10-26 21:33:51'),(1798,44,'Rangers International','2025-10-26 21:33:51'),(1799,44,'Remo Stars','2025-10-26 21:33:51'),(1800,44,'Rivers United','2025-10-26 21:33:51'),(1801,44,'Sunshine Stars','2025-10-26 21:33:51'),(1802,45,'Accra Hearts of Oak','2025-10-26 21:33:51'),(1803,45,'Aduana Stars','2025-10-26 21:33:51'),(1804,45,'Asante Kotoko','2025-10-26 21:33:51'),(1805,45,'Bechem United','2025-10-26 21:33:51'),(1806,45,'Berekum Chelsea','2025-10-26 21:33:51'),(1807,45,'Dreams FC','2025-10-26 21:33:51'),(1808,45,'Great Olympics','2025-10-26 21:33:51'),(1809,45,'Karela United','2025-10-26 21:33:51'),(1810,45,'King Faisal','2025-10-26 21:33:51'),(1811,45,'Legon Cities','2025-10-26 21:33:51'),(1812,45,'Medeama','2025-10-26 21:33:51'),(1813,45,'Nsoatreman','2025-10-26 21:33:51'),(1814,45,'RTU','2025-10-26 21:33:51'),(1815,45,'Samartex','2025-10-26 21:33:51'),(1816,45,'Techiman Wonders','2025-10-26 21:33:51'),(1817,45,'Vision FC','2025-10-26 21:33:51'),(1818,45,'Accra Lions','2025-10-26 21:33:51'),(1819,45,'Nations FC','2025-10-26 21:33:51'),(1820,46,'ASEC Mimosas','2025-10-26 21:34:44'),(1821,46,'AS Denguélé','2025-10-26 21:34:44'),(1822,46,'AS Indenié','2025-10-26 21:34:44'),(1823,46,'Bouaké FC','2025-10-26 21:34:44'),(1824,46,'FC San Pedro','2025-10-26 21:34:44'),(1825,46,'Lys Sassandra','2025-10-26 21:34:44'),(1826,46,'Racing d\'Abidjan','2025-10-26 21:34:44'),(1827,46,'SC Gagnoa','2025-10-26 21:34:44'),(1828,46,'SOA','2025-10-26 21:34:44'),(1829,46,'Stade d\'Abidjan','2025-10-26 21:34:44'),(1830,46,'Stella Club d\'Adjamé','2025-10-26 21:34:44'),(1831,46,'Africa Sports','2025-10-26 21:34:44'),(1832,46,'AS Tanda','2025-10-26 21:34:44'),(1833,46,'EFYM','2025-10-26 21:34:44'),(1834,46,'Moossou FC','2025-10-26 21:34:44'),(1835,46,'Williamsville AC','2025-10-26 21:34:44'),(1836,47,'Athletico Paranaense','2025-10-26 21:34:44'),(1837,47,'Atlético Goianiense','2025-10-26 21:34:44'),(1838,47,'Atlético Mineiro','2025-10-26 21:34:44'),(1839,47,'Bahia','2025-10-26 21:34:44'),(1840,47,'Botafogo','2025-10-26 21:34:44'),(1841,47,'Bragantino','2025-10-26 21:34:44'),(1842,47,'Corinthians','2025-10-26 21:34:44'),(1843,47,'Criciúma','2025-10-26 21:34:44'),(1844,47,'Cruzeiro','2025-10-26 21:34:44'),(1845,47,'Cuiabá','2025-10-26 21:34:44'),(1846,47,'Flamengo','2025-10-26 21:34:44'),(1847,47,'Fluminense','2025-10-26 21:34:44'),(1848,47,'Fortaleza','2025-10-26 21:34:44'),(1849,47,'Grêmio','2025-10-26 21:34:44'),(1850,47,'Internacional','2025-10-26 21:34:44'),(1851,47,'Juventude','2025-10-26 21:34:44'),(1852,47,'Palmeiras','2025-10-26 21:34:44'),(1853,47,'São Paulo','2025-10-26 21:34:44'),(1854,47,'Vasco da Gama','2025-10-26 21:34:44'),(1855,47,'Vitória','2025-10-26 21:34:44'),(1856,47,'ABC','2025-10-26 21:34:44'),(1857,47,'América Mineiro','2025-10-26 21:34:44'),(1858,47,'Avaí','2025-10-26 21:34:44'),(1859,47,'Botafogo-SP','2025-10-26 21:34:44'),(1860,47,'Ceará','2025-10-26 21:34:44'),(1861,47,'Chapecoense','2025-10-26 21:34:44'),(1862,47,'Coritiba','2025-10-26 21:34:44'),(1863,47,'CRB','2025-10-26 21:34:44'),(1864,47,'Goiás','2025-10-26 21:34:44'),(1865,47,'Guarani','2025-10-26 21:34:44'),(1866,47,'Ituano','2025-10-26 21:34:44'),(1867,47,'Londrina','2025-10-26 21:34:44'),(1868,47,'Mirassol','2025-10-26 21:34:44'),(1869,47,'Novorizontino','2025-10-26 21:34:44'),(1870,47,'Operário','2025-10-26 21:34:44'),(1871,47,'Paysandu','2025-10-26 21:34:44'),(1872,47,'Ponte Preta','2025-10-26 21:34:44'),(1873,47,'Sampaio Corrêa','2025-10-26 21:34:44'),(1874,47,'Santos','2025-10-26 21:34:44'),(1875,47,'Sport Recife','2025-10-26 21:34:44'),(1876,47,'Tombense','2025-10-26 21:34:44'),(1877,47,'Vila Nova','2025-10-26 21:34:44'),(1878,47,'Amazonas','2025-10-26 21:34:44'),(1879,47,'Ferroviária','2025-10-26 21:34:44'),(1880,47,'Figueirense','2025-10-26 21:34:44'),(1881,47,'Joinville','2025-10-26 21:34:44'),(1882,47,'Náutico','2025-10-26 21:34:44'),(1883,47,'Paraná','2025-10-26 21:34:44'),(1884,47,'Remo','2025-10-26 21:34:44'),(1885,47,'Santa Cruz','2025-10-26 21:34:44'),(1886,47,'Atlético Cearense','2025-10-26 21:34:44'),(1887,47,'Brasiliense','2025-10-26 21:34:44'),(1888,47,'CSA','2025-10-26 21:34:44'),(1889,47,'Ferroviário','2025-10-26 21:34:44'),(1890,47,'Manaus','2025-10-26 21:34:44'),(1891,47,'Moto Club','2025-10-26 21:34:44'),(1892,47,'Portuguesa','2025-10-26 21:34:44'),(1893,47,'Remo Club','2025-10-26 21:34:44'),(1894,47,'Tuna Luso','2025-10-26 21:34:44'),(1895,47,'Vitória-ES','2025-10-26 21:34:44'),(1896,48,'Argentinos Juniors','2025-10-26 21:35:07'),(1897,48,'Arsenal de Sarandí','2025-10-26 21:35:07'),(1898,48,'Atlético Tucumán','2025-10-26 21:35:07'),(1899,48,'Banfield','2025-10-26 21:35:07'),(1900,48,'Barracas Central','2025-10-26 21:35:07'),(1901,48,'Belgrano','2025-10-26 21:35:07'),(1902,48,'Boca Juniors','2025-10-26 21:35:07'),(1903,48,'Central Córdoba','2025-10-26 21:35:07'),(1904,48,'Defensa y Justicia','2025-10-26 21:35:07'),(1905,48,'Deportivo Riestra','2025-10-26 21:35:07'),(1906,48,'Estudiantes','2025-10-26 21:35:07'),(1907,48,'Gimnasia La Plata','2025-10-26 21:35:07'),(1908,48,'Godoy Cruz','2025-10-26 21:35:07'),(1909,48,'Huracán','2025-10-26 21:35:07'),(1910,48,'Independiente','2025-10-26 21:35:07'),(1911,48,'Independiente Rivadavia','2025-10-26 21:35:07'),(1912,48,'Instituto','2025-10-26 21:35:07'),(1913,48,'Lanús','2025-10-26 21:35:07'),(1914,48,'Newell\'s Old Boys','2025-10-26 21:35:07'),(1915,48,'Platense','2025-10-26 21:35:07'),(1916,48,'Racing Club','2025-10-26 21:35:07'),(1917,48,'River Plate','2025-10-26 21:35:07'),(1918,48,'Rosario Central','2025-10-26 21:35:07'),(1919,48,'San Lorenzo','2025-10-26 21:35:07'),(1920,48,'Sarmiento','2025-10-26 21:35:07'),(1921,48,'Talleres','2025-10-26 21:35:07'),(1922,48,'Tigre','2025-10-26 21:35:07'),(1923,48,'Unión','2025-10-26 21:35:07'),(1924,48,'Vélez Sarsfield','2025-10-26 21:35:07'),(1925,48,'Agropecuario','2025-10-26 21:35:07'),(1926,48,'Aldosivi','2025-10-26 21:35:07'),(1927,48,'All Boys','2025-10-26 21:35:07'),(1928,48,'Almagro','2025-10-26 21:35:07'),(1929,48,'Almirante Brown','2025-10-26 21:35:07'),(1930,48,'Alvarado','2025-10-26 21:35:07'),(1931,48,'Atlanta','2025-10-26 21:35:07'),(1932,48,'Atlético de Rafaela','2025-10-26 21:35:07'),(1933,48,'Brown de Adrogué','2025-10-26 21:35:07'),(1934,48,'Chacarita Juniors','2025-10-26 21:35:07'),(1935,48,'Chaco For Ever','2025-10-26 21:35:07'),(1936,48,'Colón','2025-10-26 21:35:07'),(1937,48,'Defensores de Belgrano','2025-10-26 21:35:07'),(1938,48,'Deportivo Madryn','2025-10-26 21:35:07'),(1939,48,'Deportivo Morón','2025-10-26 21:35:07'),(1940,48,'Estudiantes de Caseros','2025-10-26 21:35:07'),(1941,48,'Ferro Carril Oeste','2025-10-26 21:35:07'),(1942,48,'Guillermo Brown','2025-10-26 21:35:07'),(1943,48,'Gimnasia de Jujuy','2025-10-26 21:35:07'),(1944,48,'Gimnasia de Mendoza','2025-10-26 21:35:07'),(1945,48,'Mitre','2025-10-26 21:35:07'),(1946,48,'Nueva Chicago','2025-10-26 21:35:07'),(1947,48,'Patronato','2025-10-26 21:35:07'),(1948,48,'Quilmes','2025-10-26 21:35:07'),(1949,48,'Racing de Córdoba','2025-10-26 21:35:07'),(1950,48,'San Martín de San Juan','2025-10-26 21:35:07'),(1951,48,'San Telmo','2025-10-26 21:35:07'),(1952,48,'Tristán Suárez','2025-10-26 21:35:07'),(1953,49,'Alianza Petrolera','2025-10-26 21:35:07'),(1954,49,'América de Cali','2025-10-26 21:35:07'),(1955,49,'Atlético Bucaramanga','2025-10-26 21:35:07'),(1956,49,'Atlético Junior','2025-10-26 21:35:07'),(1957,49,'Atlético Nacional','2025-10-26 21:35:07'),(1958,49,'Boyacá Chicó','2025-10-26 21:35:07'),(1959,49,'Deportes Tolima','2025-10-26 21:35:07'),(1960,49,'Deportivo Cali','2025-10-26 21:35:07'),(1961,49,'Deportivo Pasto','2025-10-26 21:35:07'),(1962,49,'Envigado','2025-10-26 21:35:07'),(1963,49,'Fortaleza CEIF','2025-10-26 21:35:07'),(1964,49,'Independiente Medellín','2025-10-26 21:35:07'),(1965,49,'Independiente Santa Fe','2025-10-26 21:35:07'),(1966,49,'Jaguares de Córdoba','2025-10-26 21:35:07'),(1967,49,'La Equidad','2025-10-26 21:35:07'),(1968,49,'Millonarios','2025-10-26 21:35:07'),(1969,49,'Once Caldas','2025-10-26 21:35:07'),(1970,49,'Patriotas Boyacá','2025-10-26 21:35:07'),(1971,49,'Águilas Doradas','2025-10-26 21:35:07'),(1972,49,'Atlético Huila','2025-10-26 21:35:07'),(1973,49,'Barranquilla FC','2025-10-26 21:35:07'),(1974,49,'Bogotá FC','2025-10-26 21:35:07'),(1975,49,'Cortuluá','2025-10-26 21:35:07'),(1976,49,'Cúcuta Deportivo','2025-10-26 21:35:07'),(1977,49,'Deportes Quindío','2025-10-26 21:35:07'),(1978,49,'Deportivo Pereira','2025-10-26 21:35:07'),(1979,49,'Leones','2025-10-26 21:35:07'),(1980,49,'Llaneros FC','2025-10-26 21:35:07'),(1981,49,'Orsomarso','2025-10-26 21:35:07'),(1982,49,'Real Cartagena','2025-10-26 21:35:07'),(1983,49,'Real Santander','2025-10-26 21:35:07'),(1984,49,'Tigres FC','2025-10-26 21:35:07'),(1985,49,'Unión Magdalena','2025-10-26 21:35:07'),(1986,49,'Universidad Central','2025-10-26 21:35:07'),(1987,49,'Valledupar FC','2025-10-26 21:35:07'),(1988,49,'Atlético FC','2025-10-26 21:35:07'),(1989,50,'Audax Italiano','2025-10-26 21:35:07'),(1990,50,'Cobresal','2025-10-26 21:35:07'),(1991,50,'Cobreloa','2025-10-26 21:35:07'),(1992,50,'Colo-Colo','2025-10-26 21:35:07'),(1993,50,'Coquimbo Unido','2025-10-26 21:35:07'),(1994,50,'Deportes Copiapó','2025-10-26 21:35:07'),(1995,50,'Deportes Iquique','2025-10-26 21:35:07'),(1996,50,'Everton','2025-10-26 21:35:07'),(1997,50,'Huachipato','2025-10-26 21:35:07'),(1998,50,'O\'Higgins','2025-10-26 21:35:07'),(1999,50,'Palestino','2025-10-26 21:35:07'),(2000,50,'Ñublense','2025-10-26 21:35:07'),(2001,50,'Universidad Católica','2025-10-26 21:35:07'),(2002,50,'Universidad de Chile','2025-10-26 21:35:07'),(2003,50,'Unión Española','2025-10-26 21:35:07'),(2004,50,'Unión La Calera','2025-10-26 21:35:07'),(2005,50,'Antofagasta','2025-10-26 21:35:07'),(2006,50,'Deportes Concepción','2025-10-26 21:35:07'),(2007,50,'Deportes La Serena','2025-10-26 21:35:07'),(2008,50,'Deportes Recoleta','2025-10-26 21:35:07'),(2009,50,'Deportes Santa Cruz','2025-10-26 21:35:07'),(2010,50,'Deportes Temuco','2025-10-26 21:35:07'),(2011,50,'Fernández Vial','2025-10-26 21:35:07'),(2012,50,'Magallanes','2025-10-26 21:35:07'),(2013,50,'Puerto Montt','2025-10-26 21:35:07'),(2014,50,'Rangers de Talca','2025-10-26 21:35:07'),(2015,50,'San Antonio Unido','2025-10-26 21:35:07'),(2016,50,'San Felipe','2025-10-26 21:35:07'),(2017,50,'San Luis Quillota','2025-10-26 21:35:07'),(2018,50,'San Marcos de Arica','2025-10-26 21:35:07'),(2019,50,'Santiago Morning','2025-10-26 21:35:07'),(2020,50,'Universidad de Concepción','2025-10-26 21:35:07'),(2021,51,'Boston River','2025-10-26 21:36:17'),(2022,51,'CA Cerro','2025-10-26 21:36:17'),(2023,51,'Defensor Sporting','2025-10-26 21:36:17'),(2024,51,'Deportivo Maldonado','2025-10-26 21:36:17'),(2025,51,'Fénix','2025-10-26 21:36:17'),(2026,51,'Liverpool','2025-10-26 21:36:17'),(2027,51,'Miramar Misiones','2025-10-26 21:36:17'),(2028,51,'Nacional','2025-10-26 21:36:17'),(2029,51,'Peñarol','2025-10-26 21:36:17'),(2030,51,'Plaza Colonia','2025-10-26 21:36:17'),(2031,51,'Racing Club de Montevideo','2025-10-26 21:36:17'),(2032,51,'River Plate','2025-10-26 21:36:17'),(2033,51,'Cerro Largo','2025-10-26 21:36:17'),(2034,51,'Danubio','2025-10-26 21:36:17'),(2035,51,'Montevideo City Torque','2025-10-26 21:36:17'),(2036,51,'Progreso','2025-10-26 21:36:17'),(2037,52,'Aucas','2025-10-26 21:36:17'),(2038,52,'Barcelona SC','2025-10-26 21:36:17'),(2039,52,'Católica','2025-10-26 21:36:17'),(2040,52,'Cumbayá','2025-10-26 21:36:17'),(2041,52,'Delfín','2025-10-26 21:36:17'),(2042,52,'El Nacional','2025-10-26 21:36:17'),(2043,52,'Emelec','2025-10-26 21:36:17'),(2044,52,'Guayaquil City','2025-10-26 21:36:17'),(2045,52,'Independiente del Valle','2025-10-26 21:36:17'),(2046,52,'Imbabura','2025-10-26 21:36:17'),(2047,52,'LDU Quito','2025-10-26 21:36:17'),(2048,52,'Libertad','2025-10-26 21:36:17'),(2049,52,'Macará','2025-10-26 21:36:17'),(2050,52,'Mushuc Runa','2025-10-26 21:36:17'),(2051,52,'Orense','2025-10-26 21:36:17'),(2052,52,'Técnico Universitario','2025-10-26 21:36:17'),(2053,53,'Albirex Niigata','2025-10-26 21:36:17'),(2054,53,'Avispa Fukuoka','2025-10-26 21:36:17'),(2055,53,'Cerezo Osaka','2025-10-26 21:36:17'),(2056,53,'Consadole Sapporo','2025-10-26 21:36:17'),(2057,53,'FC Tokyo','2025-10-26 21:36:17'),(2058,53,'Gamba Osaka','2025-10-26 21:36:17'),(2059,53,'Hiroshima','2025-10-26 21:36:17'),(2060,53,'Júbilo Iwata','2025-10-26 21:36:17'),(2061,53,'Kashima Antlers','2025-10-26 21:36:17'),(2062,53,'Kashiwa Reysol','2025-10-26 21:36:17'),(2063,53,'Kawasaki Frontale','2025-10-26 21:36:17'),(2064,53,'Kyoto Sanga','2025-10-26 21:36:17'),(2065,53,'Machida Zelvia','2025-10-26 21:36:17'),(2066,53,'Nagoya Grampus','2025-10-26 21:36:17'),(2067,53,'Sagan Tosu','2025-10-26 21:36:17'),(2068,53,'Sanfrecce Hiroshima','2025-10-26 21:36:17'),(2069,53,'Shimizu S-Pulse','2025-10-26 21:36:17'),(2070,53,'Shonan Bellmare','2025-10-26 21:36:17'),(2071,53,'Tokyo Verdy','2025-10-26 21:36:17'),(2072,53,'Urawa Red Diamonds','2025-10-26 21:36:17'),(2073,53,'Vissel Kobe','2025-10-26 21:36:17'),(2074,53,'Yokohama F. Marinos','2025-10-26 21:36:17'),(2075,53,'Blaublitz Akita','2025-10-26 21:36:17'),(2076,53,'Fagiano Okayama','2025-10-26 21:36:17'),(2077,53,'JEF United Chiba','2025-10-26 21:36:17'),(2078,53,'Mito HollyHock','2025-10-26 21:36:17'),(2079,53,'Montedio Yamagata','2025-10-26 21:36:17'),(2080,53,'Oita Trinita','2025-10-26 21:36:17'),(2081,53,'Renofa Yamaguchi','2025-10-26 21:36:17'),(2082,53,'Roasso Kumamoto','2025-10-26 21:36:17'),(2083,53,'Thespakusatsu Gunma','2025-10-26 21:36:17'),(2084,53,'Tokushima Vortis','2025-10-26 21:36:17'),(2085,53,'V-Varen Nagasaki','2025-10-26 21:36:17'),(2086,53,'Vegalta Sendai','2025-10-26 21:36:17'),(2087,53,'Ventforet Kofu','2025-10-26 21:36:17'),(2088,53,'Yokohama FC','2025-10-26 21:36:17'),(2089,53,'FC Gifu','2025-10-26 21:36:17'),(2090,53,'FC Imabari','2025-10-26 21:36:17'),(2091,53,'FC Machida','2025-10-26 21:36:17'),(2092,53,'FC Ryukyu','2025-10-26 21:36:17'),(2093,53,'Omiya Ardija','2025-10-26 21:36:17'),(2094,53,'Tochigi SC','2025-10-26 21:36:17'),(2095,54,'Busan IPark','2025-10-26 21:36:17'),(2096,54,'Chungnam Asan','2025-10-26 21:36:17'),(2097,54,'Daegu FC','2025-10-26 21:36:17'),(2098,54,'Daejeon Hana Citizen','2025-10-26 21:36:17'),(2099,54,'FC Seoul','2025-10-26 21:36:17'),(2100,54,'Gangwon FC','2025-10-26 21:36:17'),(2101,54,'Gimcheon Sangmu','2025-10-26 21:36:17'),(2102,54,'Gwangju FC','2025-10-26 21:36:17'),(2103,54,'Incheon United','2025-10-26 21:36:17'),(2104,54,'Jeonbuk Hyundai Motors','2025-10-26 21:36:17'),(2105,54,'Jeju United','2025-10-26 21:36:17'),(2106,54,'Pohang Steelers','2025-10-26 21:36:17'),(2107,54,'Suwon Bluewings','2025-10-26 21:36:17'),(2108,54,'Suwon FC','2025-10-26 21:36:17'),(2109,54,'Ulsan Hyundai','2025-10-26 21:36:17'),(2110,54,'Ansan Greeners','2025-10-26 21:36:17'),(2111,54,'Bucheon FC 1995','2025-10-26 21:36:17'),(2112,54,'Busan Transportation Corporation','2025-10-26 21:36:17'),(2113,54,'Cheonan City','2025-10-26 21:36:17'),(2114,54,'FC Anyang','2025-10-26 21:36:17'),(2115,54,'Gyeongnam FC','2025-10-26 21:36:17'),(2116,54,'Jeonnam Dragons','2025-10-26 21:36:17'),(2117,54,'Seoul E-Land','2025-10-26 21:36:17'),(2118,54,'Seongnam FC','2025-10-26 21:36:17'),(2119,55,'Al Ahli','2025-10-26 21:36:39'),(2120,55,'Al Akhdoud','2025-10-26 21:36:39'),(2121,55,'Al Ettifaq','2025-10-26 21:36:39'),(2122,55,'Al Fateh','2025-10-26 21:36:39'),(2123,55,'Al Fayha','2025-10-26 21:36:39'),(2124,55,'Al Hazem','2025-10-26 21:36:39'),(2125,55,'Al Hilal','2025-10-26 21:36:39'),(2126,55,'Al Ittihad','2025-10-26 21:36:39'),(2127,55,'Al Kholood','2025-10-26 21:36:39'),(2128,55,'Al Nassr','2025-10-26 21:36:39'),(2129,55,'Al Okhdood','2025-10-26 21:36:39'),(2130,55,'Al Qadsiah','2025-10-26 21:36:39'),(2131,55,'Al Raed','2025-10-26 21:36:39'),(2132,55,'Al Riyadh','2025-10-26 21:36:39'),(2133,55,'Al Shabab','2025-10-26 21:36:39'),(2134,55,'Al Taawoun','2025-10-26 21:36:39'),(2135,55,'Al Wehda','2025-10-26 21:36:39'),(2136,55,'Damac','2025-10-26 21:36:39'),(2137,56,'Beijing Guoan','2025-10-26 21:36:39'),(2138,56,'Cangzhou Mighty Lions','2025-10-26 21:36:39'),(2139,56,'Changchun Yatai','2025-10-26 21:36:39'),(2140,56,'Chengdu Rongcheng','2025-10-26 21:36:39'),(2141,56,'Henan Songshan Longmen','2025-10-26 21:36:39'),(2142,56,'Meizhou Hakka','2025-10-26 21:36:39'),(2143,56,'Nantong Zhiyun','2025-10-26 21:36:39'),(2144,56,'Qingdao Hainiu','2025-10-26 21:36:39'),(2145,56,'Qingdao West Coast','2025-10-26 21:36:39'),(2146,56,'Shandong Taishan','2025-10-26 21:36:39'),(2147,56,'Shanghai Port','2025-10-26 21:36:39'),(2148,56,'Shanghai Shenhua','2025-10-26 21:36:39'),(2149,56,'Shenzhen Peng City','2025-10-26 21:36:39'),(2150,56,'Tianjin Jinmen Tiger','2025-10-26 21:36:39'),(2151,56,'Wuhan Three Towns','2025-10-26 21:36:39'),(2152,56,'Zhejiang Professional','2025-10-26 21:36:39'),(2153,56,'Beijing Institute of Technology','2025-10-26 21:36:39'),(2154,56,'Chongqing Liangjiang Athletic','2025-10-26 21:36:39'),(2155,56,'Dalian Pro','2025-10-26 21:36:39'),(2156,56,'Guangzhou City','2025-10-26 21:36:39'),(2157,56,'Guangzhou FC','2025-10-26 21:36:39'),(2158,56,'Jiangxi Beidamen','2025-10-26 21:36:39'),(2159,56,'Kunshan FC','2025-10-26 21:36:39'),(2160,56,'Liaoning Shenyang Urban','2025-10-26 21:36:39'),(2161,56,'Nanjing City','2025-10-26 21:36:39'),(2162,56,'Qingdao Youth Island','2025-10-26 21:36:39'),(2163,56,'Shaanxi Chang\'an Athletic','2025-10-26 21:36:39'),(2164,56,'Shijiazhuang Kungfu','2025-10-26 21:36:39'),(2165,56,'Suzhou Dongwu','2025-10-26 21:36:39'),(2166,56,'Wuhan Yangtze River','2025-10-26 21:36:39'),(2167,56,'Xinjiang Tianshan Leopard','2025-10-26 21:36:39'),(2168,56,'Yanbian Longding','2025-10-26 21:36:39'),(2169,57,'Atlanta United','2025-10-26 21:36:39'),(2170,57,'Austin FC','2025-10-26 21:36:39'),(2171,57,'Charlotte FC','2025-10-26 21:36:39'),(2172,57,'Chicago Fire','2025-10-26 21:36:39'),(2173,57,'Colorado Rapids','2025-10-26 21:36:39'),(2174,57,'Columbus Crew','2025-10-26 21:36:39'),(2175,57,'DC United','2025-10-26 21:36:39'),(2176,57,'FC Cincinnati','2025-10-26 21:36:39'),(2177,57,'FC Dallas','2025-10-26 21:36:39'),(2178,57,'Houston Dynamo','2025-10-26 21:36:39'),(2179,57,'Inter Miami','2025-10-26 21:36:39'),(2180,57,'LA Galaxy','2025-10-26 21:36:39'),(2181,57,'Los Angeles FC','2025-10-26 21:36:39'),(2182,57,'Minnesota United','2025-10-26 21:36:39'),(2183,57,'Nashville SC','2025-10-26 21:36:39'),(2184,57,'New England Revolution','2025-10-26 21:36:39'),(2185,57,'New York City FC','2025-10-26 21:36:39'),(2186,57,'New York Red Bulls','2025-10-26 21:36:39'),(2187,57,'Orlando City','2025-10-26 21:36:39'),(2188,57,'Philadelphia Union','2025-10-26 21:36:39'),(2189,57,'Portland Timbers','2025-10-26 21:36:39'),(2190,57,'Real Salt Lake','2025-10-26 21:36:39'),(2191,57,'San Jose Earthquakes','2025-10-26 21:36:39'),(2192,57,'Seattle Sounders','2025-10-26 21:36:39'),(2193,57,'Sporting Kansas City','2025-10-26 21:36:39'),(2194,57,'St. Louis City SC','2025-10-26 21:36:39'),(2195,57,'Toronto FC','2025-10-26 21:36:39'),(2196,57,'Vancouver Whitecaps','2025-10-26 21:36:39'),(2197,57,'CF Montréal','2025-10-26 21:36:39'),(2198,58,'América','2025-10-26 21:36:39'),(2199,58,'Atlas','2025-10-26 21:36:39'),(2200,58,'Atlético San Luis','2025-10-26 21:36:39'),(2201,58,'Chivas Guadalajara','2025-10-26 21:36:39'),(2202,58,'Cruz Azul','2025-10-26 21:36:39'),(2203,58,'FC Juárez','2025-10-26 21:36:39'),(2204,58,'León','2025-10-26 21:36:39'),(2205,58,'Mazatlán','2025-10-26 21:36:39'),(2206,58,'Monterrey','2025-10-26 21:36:39'),(2207,58,'Necaxa','2025-10-26 21:36:39'),(2208,58,'Pachuca','2025-10-26 21:36:39'),(2209,58,'Puebla','2025-10-26 21:36:39'),(2210,58,'Pumas UNAM','2025-10-26 21:36:39'),(2211,58,'Querétaro','2025-10-26 21:36:39'),(2212,58,'Santos Laguna','2025-10-26 21:36:39'),(2213,58,'Tijuana','2025-10-26 21:36:39'),(2214,58,'Tigres UANL','2025-10-26 21:36:39'),(2215,58,'Toluca','2025-10-26 21:36:39'),(2216,58,'Atlante','2025-10-26 21:36:39'),(2217,58,'Cancún FC','2025-10-26 21:36:39'),(2218,58,'Celaya','2025-10-26 21:36:39'),(2219,58,'Cimarrones de Sonora','2025-10-26 21:36:39'),(2220,58,'Correcaminos UAT','2025-10-26 21:36:39'),(2221,58,'Dorados de Sinaloa','2025-10-26 21:36:39'),(2222,58,'La Piedad','2025-10-26 21:36:39'),(2223,58,'Leones Negros','2025-10-26 21:36:39'),(2224,58,'Mineros de Zacatecas','2025-10-26 21:36:39'),(2225,58,'Morelia','2025-10-26 21:36:39'),(2226,58,'Oaxaca','2025-10-26 21:36:39'),(2227,58,'Pumas Tabasco','2025-10-26 21:36:39'),(2228,58,'Raya2 Expansion','2025-10-26 21:36:39'),(2229,58,'Tampico Madero','2025-10-26 21:36:39'),(2230,58,'Tepatitlán','2025-10-26 21:36:39'),(2231,58,'Tlaxcala FC','2025-10-26 21:36:39'),(2232,58,'Venados FC','2025-10-26 21:36:39'),(2233,58,'Zacatepec','2025-10-26 21:36:39'),(2234,59,'Alashkert','2025-10-27 14:35:52'),(2236,59,'Ararat-Armenia','2025-10-27 14:35:52'),(2237,59,'FC Noah','2025-10-27 14:35:52'),(2238,59,'Pyunik','2025-10-27 14:35:52'),(2239,59,'Shirak','2025-10-27 14:35:52'),(2240,59,'BKMA','2025-10-27 14:35:52'),(2241,59,'Urartu','2025-10-27 14:35:52'),(2242,59,'Van','2025-10-27 14:35:52'),(2243,59,'West Armenia','2025-10-27 14:35:52');
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_responses`
--

DROP TABLE IF EXISTS `ticket_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ticket_responses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_internal` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `ticket_responses_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_responses_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_responses`
--

LOCK TABLES `ticket_responses` WRITE;
/*!40000 ALTER TABLE `ticket_responses` DISABLE KEYS */;
INSERT INTO `ticket_responses` VALUES (5,4,2,'Thank you for reporting this bug. We have fixed the leaderboard calculation.',0,'2025-10-26 10:12:47'),(13,22,1,'kindly check again',0,'2025-10-31 00:48:48');
/*!40000 ALTER TABLE `ticket_responses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipster_earnings`
--

DROP TABLE IF EXISTS `tipster_earnings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tipster_earnings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipster_id` int(11) NOT NULL,
  `pick_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('commission','bonus','payout') DEFAULT 'commission',
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tipster_id` (`tipster_id`),
  KEY `idx_pick_id` (`pick_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `tipster_earnings_ibfk_1` FOREIGN KEY (`tipster_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tipster_earnings_ibfk_2` FOREIGN KEY (`pick_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipster_earnings`
--

LOCK TABLES `tipster_earnings` WRITE;
/*!40000 ALTER TABLE `tipster_earnings` DISABLE KEYS */;
/*!40000 ALTER TABLE `tipster_earnings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipster_payouts`
--

DROP TABLE IF EXISTS `tipster_payouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tipster_payouts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipster_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','processing','completed','failed','cancelled') DEFAULT 'pending',
  `method` enum('bank_transfer','mobile_money','crypto') DEFAULT 'bank_transfer',
  `account_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`account_details`)),
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tipster_id` (`tipster_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `tipster_payouts_ibfk_1` FOREIGN KEY (`tipster_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipster_payouts`
--

LOCK TABLES `tipster_payouts` WRITE;
/*!40000 ALTER TABLE `tipster_payouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `tipster_payouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipster_profiles`
--

DROP TABLE IF EXISTS `tipster_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tipster_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `bio` text DEFAULT NULL,
  `specialties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specialties`)),
  `win_rate` decimal(5,2) DEFAULT 0.00,
  `total_picks` int(11) DEFAULT 0,
  `total_wins` int(11) DEFAULT 0,
  `total_losses` int(11) DEFAULT 0,
  `total_voids` int(11) DEFAULT 0,
  `monthly_earnings` decimal(10,2) DEFAULT 0.00,
  `is_verified` tinyint(1) DEFAULT 0,
  `is_featured` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_profile` (`user_id`),
  KEY `idx_win_rate` (`win_rate`),
  KEY `idx_is_verified` (`is_verified`),
  KEY `idx_is_featured` (`is_featured`),
  CONSTRAINT `tipster_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipster_profiles`
--

LOCK TABLES `tipster_profiles` WRITE;
/*!40000 ALTER TABLE `tipster_profiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `tipster_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipster_rankings`
--

DROP TABLE IF EXISTS `tipster_rankings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tipster_rankings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `rank` int(11) NOT NULL,
  `tier` enum('Bronze','Silver','Gold','Platinum','Diamond') DEFAULT 'Bronze',
  `points` decimal(10,2) DEFAULT 0.00,
  `period` enum('daily','weekly','monthly','yearly','all_time') DEFAULT 'all_time',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_rank` (`rank`),
  KEY `idx_tier` (`tier`),
  KEY `idx_period` (`period`),
  CONSTRAINT `tipster_rankings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipster_rankings`
--

LOCK TABLES `tipster_rankings` WRITE;
/*!40000 ALTER TABLE `tipster_rankings` DISABLE KEYS */;
/*!40000 ALTER TABLE `tipster_rankings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipster_verification_applications`
--

DROP TABLE IF EXISTS `tipster_verification_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tipster_verification_applications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `application_type` enum('basic','premium','expert') DEFAULT 'basic',
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  `application_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`application_data`)),
  `documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`documents`)),
  `experience` text DEFAULT NULL,
  `specialties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specialties`)),
  `portfolio_url` varchar(255) DEFAULT NULL,
  `social_media` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`social_media`)),
  `submitted_at` datetime DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_application_type` (`application_type`),
  KEY `reviewed_by` (`reviewed_by`),
  CONSTRAINT `tipster_verification_applications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tipster_verification_applications_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipster_verification_applications`
--

LOCK TABLES `tipster_verification_applications` WRITE;
/*!40000 ALTER TABLE `tipster_verification_applications` DISABLE KEYS */;
INSERT INTO `tipster_verification_applications` VALUES (1,8,'basic','rejected','2025-10-28 23:12:02',NULL,NULL,'testing','{\"specialties\":\"testing\"}','testing',NULL,'2025-10-28 23:12:02','2025-10-28 23:17:56',1,'apply again'),(2,8,'basic','approved','2025-10-29 11:24:34',NULL,NULL,'I’ve been betting and modeling sports markets for 5+ years with a data-first approach. My edge comes from player-level projections, injury/news adjustment, and line-shopping across 6 books. Over the last three seasons, I’ve tracked 1,240 wagers at +6.8% CLV and a +4.2% ROI (stakes scaled 0.5–2 units). I focus on pregame markets and prop derivatives, publish picks with reasoning, and audit results monthly. Bankroll management: Kelly-adjusted unit sizing, strict closing-line comparison, and no-chase rules.','{\"specialties\":\"Soccer: Premier League, Champions League, MLS (sides\\/totals, cards, shots)\"}','http://betrollover.com/',NULL,'2025-10-29 11:24:34','2025-10-29 11:26:06',1,NULL),(3,8,'basic','approved','2025-10-29 11:26:13',NULL,NULL,'I’ve been betting and modeling sports markets for 5+ years with a data-first approach. My edge comes from player-level projections, injury/news adjustment, and line-shopping across 6 books. Over the last three seasons, I’ve tracked 1,240 wagers at +6.8% CLV and a +4.2% ROI (stakes scaled 0.5–2 units). I focus on pregame markets and prop derivatives, publish picks with reasoning, and audit results monthly. Bankroll management: Kelly-adjusted unit sizing, strict closing-line comparison, and no-chase rules.','{\"specialties\":\"Soccer: Premier League, Champions League, MLS (sides\\/totals, cards, shots)\"}','http://betrollover.com/',NULL,'2025-10-29 11:26:13','2025-10-29 11:51:28',1,NULL),(4,10,'basic','approved','2025-11-14 22:18:52',NULL,NULL,'Sports Betting','{\"specialties\":\"Laliga\"}','',NULL,'2025-11-14 22:18:52','2025-11-14 22:19:29',1,NULL),(5,10,'basic','pending','2025-11-14 22:22:46',NULL,NULL,'Sports Betting','{\"specialties\":\"Laliga\"}','',NULL,'2025-11-14 22:22:46',NULL,NULL,NULL);
/*!40000 ALTER TABLE `tipster_verification_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_badges`
--

DROP TABLE IF EXISTS `user_badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_badges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `badge_id` int(11) NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `awarded_at` datetime DEFAULT current_timestamp(),
  `earned_at` datetime DEFAULT current_timestamp(),
  `is_displayed` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_badge` (`user_id`,`badge_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_badge_id` (`badge_id`),
  CONSTRAINT `user_badges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_badges_ibfk_2` FOREIGN KEY (`badge_id`) REFERENCES `badges` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_badges`
--

LOCK TABLES `user_badges` WRITE;
/*!40000 ALTER TABLE `user_badges` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_badges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_follows`
--

DROP TABLE IF EXISTS `user_follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_follows` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `follower_id` int(11) NOT NULL,
  `following_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_follow` (`follower_id`,`following_id`),
  KEY `idx_follower_id` (`follower_id`),
  KEY `idx_following_id` (`following_id`),
  CONSTRAINT `user_follows_ibfk_1` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_follows_ibfk_2` FOREIGN KEY (`following_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_follows`
--

LOCK TABLES `user_follows` WRITE;
/*!40000 ALTER TABLE `user_follows` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_follows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_impersonations`
--

DROP TABLE IF EXISTS `user_impersonations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_impersonations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `target_user_id` int(11) NOT NULL,
  `impersonated_at` datetime DEFAULT current_timestamp(),
  `ended_at` datetime DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `started_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_target_user_id` (`target_user_id`),
  CONSTRAINT `user_impersonations_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_impersonations_ibfk_2` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_impersonations`
--

LOCK TABLES `user_impersonations` WRITE;
/*!40000 ALTER TABLE `user_impersonations` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_impersonations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_performance`
--

DROP TABLE IF EXISTS `user_performance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_performance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `total_picks` int(11) DEFAULT 0,
  `won_picks` int(11) DEFAULT 0,
  `lost_picks` int(11) DEFAULT 0,
  `win_rate` decimal(5,2) DEFAULT 0.00,
  `total_earnings` decimal(10,2) DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_performance` (`user_id`),
  CONSTRAINT `user_performance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_performance`
--

LOCK TABLES `user_performance` WRITE;
/*!40000 ALTER TABLE `user_performance` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_performance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_purchased_picks`
--

DROP TABLE IF EXISTS `user_purchased_picks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_purchased_picks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `accumulator_id` int(11) NOT NULL,
  `purchase_price` decimal(8,2) NOT NULL,
  `purchase_date` datetime DEFAULT current_timestamp(),
  `settlement_status` enum('pending','won','lost','void') DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_accumulator_id` (`accumulator_id`),
  KEY `idx_purchase_date` (`purchase_date`),
  CONSTRAINT `user_purchased_picks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_purchased_picks_ibfk_2` FOREIGN KEY (`accumulator_id`) REFERENCES `accumulator_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_purchased_picks`
--

LOCK TABLES `user_purchased_picks` WRITE;
/*!40000 ALTER TABLE `user_purchased_picks` DISABLE KEYS */;
INSERT INTO `user_purchased_picks` VALUES (2,4,7,10.00,'2025-10-27 14:51:17','pending','2025-10-27 14:51:17'),(3,8,7,10.00,'2025-10-27 14:52:46','pending','2025-10-27 14:52:46'),(4,8,21,10.00,'2025-10-30 21:07:58','pending','2025-10-30 21:07:58'),(5,8,22,20.00,'2025-10-30 21:08:24','won','2025-10-30 21:08:24'),(6,9,23,50.00,'2025-11-14 17:42:43','won','2025-11-14 17:42:43'),(7,9,24,50.00,'2025-11-14 21:58:48','lost','2025-11-14 21:58:48');
/*!40000 ALTER TABLE `user_purchased_picks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_quiz_attempts`
--

DROP TABLE IF EXISTS `user_quiz_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_quiz_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `selected_answer` varchar(255) NOT NULL,
  `is_correct` tinyint(1) DEFAULT 0,
  `points_earned` int(11) DEFAULT 0,
  `attempted_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_quiz_id` (`quiz_id`),
  KEY `idx_attempted_at` (`attempted_at`),
  CONSTRAINT `user_quiz_attempts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_quiz_attempts_ibfk_2` FOREIGN KEY (`quiz_id`) REFERENCES `learning_quizzes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_quiz_attempts`
--

LOCK TABLES `user_quiz_attempts` WRITE;
/*!40000 ALTER TABLE `user_quiz_attempts` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_quiz_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `last_activity` datetime DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token` (`session_token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_session_token` (`session_token`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
INSERT INTO `user_sessions` VALUES (1,1,'','154.160.19.209',NULL,'0000-00-00 00:00:00','2025-10-26 03:52:04','2025-10-26 03:51:59');
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_wallets`
--

DROP TABLE IF EXISTS `user_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `balance` decimal(10,2) DEFAULT 0.00,
  `currency` varchar(3) DEFAULT 'GHS',
  `status` enum('active','frozen','suspended') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_wallet` (`user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `user_wallets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_wallets`
--

LOCK TABLES `user_wallets` WRITE;
/*!40000 ALTER TABLE `user_wallets` DISABLE KEYS */;
INSERT INTO `user_wallets` VALUES (1,1,1000.00,'GHS','active','2025-10-25 21:15:45','2025-10-25 21:15:45'),(2,2,30.00,'GHS','active','2025-10-25 17:27:06','2025-10-26 23:05:40'),(7,3,100.00,'GHS','active','2025-10-26 12:56:58','2025-10-26 23:07:41'),(8,4,80.00,'GHS','active','2025-10-26 12:56:58','2025-10-27 14:51:17'),(13,7,163.00,'GHS','active','2025-10-26 23:10:13','2025-11-14 18:19:45'),(14,8,60.00,'GHS','active','2025-10-27 12:13:06','2025-10-30 21:08:24'),(16,9,150.00,'GHS','active','2025-11-14 16:21:15','2025-11-14 22:07:06'),(17,10,0.00,'GHS','active','2025-11-14 22:17:56','2025-11-14 22:17:56');
/*!40000 ALTER TABLE `user_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `role` enum('user','tipster','admin') DEFAULT 'user',
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `phone` varchar(20) DEFAULT NULL,
  `country` varchar(50) DEFAULT 'Ghana',
  `timezone` varchar(50) DEFAULT 'Africa/Accra',
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `country_code` varchar(3) DEFAULT 'GHA',
  `flag_emoji` varchar(10) DEFAULT '??',
  `is_online` tinyint(1) DEFAULT 0,
  `last_activity` datetime DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `email_notifications` tinyint(1) DEFAULT 1,
  `sms_notifications` tinyint(1) DEFAULT 0,
  `push_notifications` tinyint(1) DEFAULT 1,
  `bio` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`),
  KEY `idx_country_code` (`country_code`),
  KEY `idx_is_online` (`is_online`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin@smartpickspro.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Administrator',NULL,'admin','active',NULL,'Ghana','Africa/Accra','2025-11-14 15:08:03','2025-10-25 21:15:45','2025-11-14 15:08:03','GHA','🇬🇭',1,'2025-11-14 15:08:03',1,1,0,1,NULL),(2,'wastwagon','iwisebrain@yahoo.com','$2y$10$dsTQDkHZWyl0BAMTcNM9w.sIuJoB.5LHwh/lLxBpuOfh2FnhFz15K','wastwagon',NULL,'user','active',NULL,'Ghana','Africa/Accra',NULL,'2025-10-25 17:27:06','2025-10-26 03:42:58','GHA','🇬🇭',0,'2025-10-26 03:42:58',0,1,0,1,NULL),(3,'user','user@smartpickspro.com','$2y$10$47e8COXeD9w6/YY7GE/j4ObhHMwTFGRBKTEYzpL2wSpl2Sgr8qAOe','Test User',NULL,'user','active',NULL,'Ghana','Africa/Accra','2025-10-27 11:12:59','2025-10-26 12:41:25','2025-10-27 11:12:59','GHA','🇬🇭',1,'2025-10-27 11:12:59',0,1,0,1,NULL),(4,'tipster','tipster@smartpickspro.com','$2y$10$/B5SLTs8.vCLrXAFp35eVO.Jyd4AlFIsf480mIh23A7/Mo04pB5TO','Test Tipster',NULL,'tipster','active',NULL,'Ghana','Africa/Accra','2025-10-27 20:40:59','2025-10-26 12:41:25','2025-10-31 01:07:04','GHA','🇬🇭',1,'2025-10-27 20:40:59',1,1,0,1,NULL),(5,'testuser','test@example.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Test User',NULL,'user','active',NULL,'Ghana','Africa/Accra',NULL,'2025-10-26 20:46:28','2025-10-26 20:46:28','GHA','??',0,NULL,0,1,0,1,NULL),(6,'newuser2','newuser2@example.com','$2y$10$hRALXJlQm3xsriTr5UvfcelC0UgqMQxUI62XfHmFXyYPIoDpg1FJG','newuser2',NULL,'user','active',NULL,'Ghana','Africa/Accra',NULL,'2025-10-26 21:43:02','2025-10-26 21:43:02','GHA','??',0,NULL,0,1,0,1,NULL),(7,'flygonpriest','flygonpirest@smartpicks-pro.com','$2y$10$95tWYO6NzsCjSvSFmPhNP.Q9xEZe2UihoeAGh4Dlx9ge4SUC9aYxu','flygonpriest','storage/uploads/avatars/avatar_7_1761694584.jpeg','tipster','active',NULL,'Ghana','Africa/Accra','2025-11-14 16:16:14','2025-10-26 21:47:37','2025-11-14 16:16:14','GHA','??',1,'2025-11-14 16:16:14',0,1,1,1,''),(8,'Dosty','dosty@yah.com','$2y$10$EyMqrAOv7vGNlMVQrOComOraqC0btQz6AzPqz9uImrkQniol6lTk.','Dosty Bryant','storage/uploads/avatars/avatar_8_1761694213.jpeg','tipster','active',NULL,'Ghana','Africa/Accra','2025-10-31 10:54:54','2025-10-27 02:24:51','2025-10-31 10:54:54','GHA','??',1,'2025-10-29 12:10:46',0,1,1,1,'N/A'),(9,'Andycole','andycole@oceancyber.net','$2y$10$hHB5sviWBmC8wErXLH4qM.jXZnedI2.xZQA8iV83BMr8ZI4zEHZJq','Andycole',NULL,'user','active',NULL,'Ghana','Africa/Accra','2025-11-22 15:52:31','2025-11-14 16:21:15','2025-11-22 15:52:31','GHA','??',0,NULL,0,1,0,1,NULL),(10,'Cash','cash@oceancyber.net','$2y$10$aMMqJHh6dJgcEuG3EDhKAevfxHjeUw3FQgb6gTYfK9u9nBI.s9bum','Cash',NULL,'tipster','active',NULL,'Ghana','Africa/Accra',NULL,'2025-11-14 22:17:56','2025-11-14 22:19:29','GHA','??',0,NULL,0,1,0,1,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_transactions`
--

DROP TABLE IF EXISTS `wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('deposit','withdrawal','purchase','refund','commission','payout') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'GHS',
  `status` enum('pending','completed','failed','cancelled') DEFAULT 'pending',
  `reference` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_reference` (`reference`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `wallet_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
INSERT INTO `wallet_transactions` VALUES (1,3,'deposit',100.00,'GHS','completed',NULL,'Admin top-up test',NULL,'2025-10-26 23:07:41','2025-10-26 23:07:41'),(2,4,'deposit',100.00,'GHS','completed',NULL,'',NULL,'2025-10-26 23:09:57','2025-10-26 23:09:57'),(3,7,'deposit',100.00,'GHS','completed',NULL,'',NULL,'2025-10-26 23:10:13','2025-10-26 23:10:13'),(4,4,'purchase',-10.00,'GHS','completed','purchase','Purchase of pick: 7',NULL,'2025-10-27 14:46:43','2025-10-27 14:46:43'),(5,4,'purchase',-10.00,'GHS','completed','purchase','Purchase of pick: 7',NULL,'2025-10-27 14:51:17','2025-10-27 14:51:17'),(6,8,'deposit',100.00,'GHS','completed',NULL,'',NULL,'2025-10-27 14:52:30','2025-10-27 14:52:30'),(7,8,'purchase',-10.00,'GHS','completed','purchase','Purchase of pick: 7',NULL,'2025-10-27 14:52:46','2025-10-27 14:52:46'),(8,8,'deposit',50.00,'GHS','pending','WAL_1761729288_7807','Wallet top-up via Paystack',NULL,'2025-10-29 09:14:49','2025-10-29 09:14:49'),(9,7,'deposit',100.00,'GHS','pending','WAL_1761842564_8301','Wallet top-up via Paystack',NULL,'2025-10-30 16:42:45','2025-10-30 16:42:45'),(10,8,'purchase',-10.00,'GHS','completed','PURCHASE_10_1761858478','Pick purchase - funds held in escrow',NULL,'2025-10-30 21:07:58','2025-10-30 21:07:58'),(11,8,'purchase',-20.00,'GHS','completed','PURCHASE_11_1761858504','Pick purchase - funds held in escrow',NULL,'2025-10-30 21:08:24','2025-10-30 21:08:24'),(12,7,'deposit',18.00,'GHS','completed','pick_earnings','Pick settlement - Won (Commission: GHS 2)',NULL,'2025-10-30 23:24:35','2025-10-30 23:24:35'),(13,7,'deposit',100.00,'GHS','pending','WAL_1762270526_6420','Wallet top-up via Paystack',NULL,'2025-11-04 15:35:27','2025-11-04 15:35:27'),(14,9,'purchase',-50.00,'GHS','completed','PURCHASE_12_1763142163','Pick purchase - funds held in escrow',NULL,'2025-11-14 17:42:43','2025-11-14 17:42:43'),(15,7,'deposit',45.00,'GHS','completed','pick_earnings','Pick settlement - Won (Commission: GHS 5)',NULL,'2025-11-14 18:19:45','2025-11-14 18:19:45'),(16,9,'purchase',-50.00,'GHS','completed','PURCHASE_13_1763157528','Pick purchase - funds held in escrow',NULL,'2025-11-14 21:58:48','2025-11-14 21:58:48'),(17,9,'deposit',50.00,'GHS','completed','pick_refund','Pick settlement - Lost (Refund)',NULL,'2025-11-14 22:07:06','2025-11-14 22:07:06');
mysqldump: Couldn't execute 'SHOW FUNCTION STATUS WHERE Db = 'smartpickspro_local'': Column count of mysql.proc is wrong. Expected 21, found 20. Created with MariaDB 100108, now running 100428. Please use mysql_upgrade to fix this error (1558)
/*!40000 ALTER TABLE `wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'smartpickspro_local'
--
